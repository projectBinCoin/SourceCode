/*
 * ════════════════════════════════════════════════════════════════════
 *  Bincoin Smart Bin — ESP32 + JSN-SR04T (firmware v2, self-provisioning)
 * ════════════════════════════════════════════════════════════════════
 *
 *  NO PER-BIN CODE EDITS. One firmware for the whole fleet:
 *
 *  • Identity   — the device ID is derived from the burned-in chip MAC
 *                 (e.g. ESP32-A1B2C3). It can never collide or be mistyped.
 *                 Print it on the bin sticker + QR: BINCOIN|<id>|<pairing>
 *  • WiFi       — first boot starts a "BINCOIN-SETUP-XXXX" hotspot. The
 *                 captive portal asks for home WiFi + the pairing code
 *                 from the sticker. Saved to flash — survives power loss.
 *  • Calibrate  — the portal's "Calibrate" button measures the EMPTY bin
 *                 depth (median of 15 ultrasonic reads) and stores it as
 *                 the 0% baseline. The bin proves its own geometry —
 *                 tall thin bins and short wide bins all self-describe.
 *                 The measured height lands on the admin approval card.
 *  • Telemetry  — fill% = (1 − airGap/height) × 100, plus battery, air
 *                 gap, and the measured height are POSTed to Supabase.
 *                 The server answers { ok, recalibrate } — if the admin
 *                 requested recalibration the bin re-measures and reports.
 *  • Reset      — hold the BOOT button (GPIO0) for 3 s at power-on to
 *                 wipe WiFi/config and return to setup mode.
 *
 *  ── ONE-TIME FLEET SETUP (flash time, same for every bin) ───────────
 *  1. Copy SUPABASE_URL / SUPABASE_ANON_KEY from the app's env file.
 *  2. Board: "ESP32 Dev Module" · 115200 baud. That's it — no per-bin
 *     changes. Print each unit's QR (see firmware/tools/make-qr.mjs).
 *
 *  Wiring and details: firmware/README.md
 * ════════════════════════════════════════════════════════════════════
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>
#include <esp_mac.h>

// ── Fleet-wide backend (baked at flash time — same for every bin) ────
const char* SUPABASE_URL      = "https://YOUR-PROJECT-REF.supabase.co";
const char* SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

// ── Pins ────────────────────────────────────────────────────────────
const int TRIG_PIN    = 5;    // JSN-SR04T TRIG (labeled RX on some boards)
const int ECHO_PIN    = 18;   // JSN-SR04T ECHO (labeled TX on some boards)
const int BATTERY_PIN = 34;   // ADC input from the battery voltage divider
const int FACTORY_RESET_PIN    = 0;    // ESP32 BOOT button — hold 3s to factory reset

// Set to true once the 18650 + TP4056 + voltage divider is wired.
#define BATTERY_ENABLED false

// ── Sensor ──────────────────────────────────────────────────────────
const int   SENSOR_SAMPLES     = 7;      // median pool per reading
const int   CALIB_SAMPLES      = 15;     // median pool for calibration
const int   SAMPLE_GAP_MS      = 120;
const unsigned long ECHO_TIMEOUT_US = 30000;  // ~5 m round trip
const float MAX_RANGE_CM       = 450.0;  // JSN-SR04T max ~4.5 m

// ── Battery (100k/100k divider → Vbat/2, 3.3 V ADC ref) ─────────────
const float ADC_REF_VOLTAGE = 3.3;
const float ADC_MAX         = 4095.0;
const float DIVIDER_RATIO   = 2.0;
const float BATTERY_FULL_V  = 4.2;
const float BATTERY_EMPTY_V = 3.0;

// ── Power management ────────────────────────────────────────────────
const uint64_t SLEEP_SECONDS = 900;      // telemetry cadence: 15 min
const unsigned long PORTAL_TIMEOUT_MS = 10 * 60 * 1000;  // portal gives up after 10 min → sleep, retry next wake

// ════════════════════════════════════════════════════════════════════

Preferences prefs;
String deviceId;

// ── Identity: MAC-derived, unique, zero-config ──────────────────────
String deriveDeviceId() {
  uint8_t mac[6];
  esp_read_mac(mac, ESP_MAC_WIFI_STA);
  char id[16];
  snprintf(id, sizeof(id), "ESP32-%02X%02X%02X", mac[3], mac[4], mac[5]);
  return String(id);
}

// ── Ultrasonic: single pulse → distance in cm (−1 = no echo) ────────
float readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(4);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  unsigned long duration = pulseIn(ECHO_PIN, HIGH, ECHO_TIMEOUT_US);
  if (duration == 0) return -1.0;
  return (duration * 0.0343) / 2.0;
}

// Median of N samples — resistant to echo glitches on foam/odd shapes.
float medianDistance(int samples) {
  float vals[CALIB_SAMPLES];
  int n = 0;
  for (int i = 0; i < samples && n < samples; i++) {
    float d = readDistanceCm();
    if (d > 0) vals[n++] = d;
    delay(SAMPLE_GAP_MS);
  }
  if (n == 0) return -1.0;
  // insertion sort (n is tiny)
  for (int i = 1; i < n; i++) {
    float k = vals[i]; int j = i - 1;
    while (j >= 0 && vals[j] > k) { vals[j + 1] = vals[j]; j--; }
    vals[j + 1] = k;
  }
  return n % 2 ? vals[n / 2] : (vals[n / 2 - 1] + vals[n / 2]) / 2.0;
}

float binHeightCm() {
  return prefs.isKey("binHeight") ? prefs.getFloat("binHeight", 0) : 0;
}

// Fill% from the measured air gap against the CALIBRATED height.
float fillPctFrom(float airGapCm) {
  float h = binHeightCm();
  if (h <= 0) return 0;                       // not calibrated yet
  float fill = ((h - airGapCm) / h) * 100.0;
  return fill < 0 ? 0 : (fill > 100 ? 100 : fill);
}

float readBatteryVoltage() {
  uint32_t raw = 0;
  for (int i = 0; i < 8; i++) { raw += analogRead(BATTERY_PIN); delay(5); }
  return (raw / 8 / ADC_MAX) * ADC_REF_VOLTAGE * DIVIDER_RATIO;
}

int batteryPercent(float v) {
  float p = ((v - BATTERY_EMPTY_V) / (BATTERY_FULL_V - BATTERY_EMPTY_V)) * 100.0;
  return p < 0 ? 0 : (p > 100 ? 100 : (int)p);
}

// ── Calibration: empty-bin baseline ─────────────────────────────────
// Run from the setup portal (or on admin recalibrate). Stores the
// measured inside height — this is what lets the admin verify the bin.
float calibrate() {
  Serial.println("Calibrating — bin must be EMPTY...");
  delay(1500);                                // give the user a moment
  float h = medianDistance(CALIB_SAMPLES);
  if (h < 5.0) {                              // <5 cm = sensor face covered
    Serial.println("Calibration failed — sensor blocked or bin not empty.");
    return 0;
  }
  prefs.putFloat("binHeight", h);
  Serial.printf("Calibrated: inside height %.1f cm\n", h);
  return h;
}

// ── Telemetry ───────────────────────────────────────────────────────
// Returns the server's recalibrate flag (true → re-measure + resend).
bool reportTelemetry(float fillPct, int batteryPct, float airGapCm, bool includeHeight) {
  WiFiClientSecure tls;
  tls.setInsecure();                          // anon-key REST; cert pinning is a fleet-hardening step for later
  HTTPClient http;
  String url = String(SUPABASE_URL) + "/rest/v1/rpc/update_bin_telemetry";
  if (!http.begin(tls, url)) return false;

  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);

  String pairing = prefs.getString("pair", "");
  String body = "{\"p_device_id\":\"" + deviceId +
                "\",\"p_fill_pct\":" + String((int)fillPct) +
                ",\"p_battery_pct\":" + String(batteryPct) +
                ",\"p_air_gap_cm\":" + String((int)airGapCm);
  if (pairing.length()) body += ",\"p_pairing_code\":\"" + pairing + "\"";
  if (includeHeight)   body += ",\"p_bin_height_cm\":" + String(binHeightCm(), 1);
  body += "}";

  Serial.print("Report: "); Serial.println(body);
  int code = http.POST(body);
  String resp = http.getString();
  http.end();
  Serial.printf("Supabase %d — %s\n", code, resp.c_str());   // 200 + {"ok":true,...}
  if (code != 200 && code != 204) return false;
  return resp.indexOf("\"recalibrate\":true") >= 0;         // crude but dependency-free JSON check
}

bool connectSavedWiFi(unsigned long timeoutMs = 20000) {
  String ssid = prefs.getString("ssid", "");
  String pass = prefs.getString("pass", "");
  if (!ssid.length()) return false;
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid.c_str(), pass.c_str());
  Serial.print("WiFi connecting");
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < timeoutMs) {
    delay(400); Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() != WL_CONNECTED) return false;
  Serial.printf("Connected %s — %s\n", ssid.c_str(), WiFi.localIP().toString().c_str());
  return true;
}

// ── Setup portal (captive) ──────────────────────────────────────────
WebServer portal(80);
DNSServer dns;
bool portalDone = false;

const char* PORTAL_HTML_HEAD = R"HTML(
<!doctype html><meta name=viewport content="width=device-width,initial-scale=1">
<title>Bincoin Bin Setup</title>
<style>body{font-family:sans-serif;max-width:26rem;margin:2rem auto;padding:0 1rem;color:#0b1d3a}
input,button{width:100%;padding:.7rem;margin:.3rem 0;border:1px solid #cbd5e1;border-radius:.5rem;box-sizing:border-box}
button{background:#0099ff;color:#fff;border:0;font-weight:600}h1{font-size:1.2rem}
small{color:#64748b}</style>)HTML";

void portalRoot() {
  String h = PORTAL_HTML_HEAD;
  h += "<h1>Bincoin Smart Bin Setup</h1><small>Device: <b>" + deviceId + "</b>";
  h += String(" · Calibrated height: ") + (binHeightCm() > 0 ? String(binHeightCm(), 1) + " cm" : "not yet") + "</small>";
  h += "<form method=POST action=/save>";
  h += "<label>Home WiFi name<input name=ssid required>";
  h += "<label>WiFi password<input name=pass type=password>";
  h += "<label>Pairing code <small>(from the QR sticker on the bin)</small><input name=pair>";
  h += "<button>Save & Connect</button></form>";
  h += "<form method=POST action=/calibrate><button style='background:#16a34a'>Calibrate Now — empty the bin first</button></form>";
  h += "</body>";
  portal.send(200, "text/html", h);
}

void portalSave() {
  prefs.putString("ssid", portal.arg("ssid"));
  prefs.putString("pass", portal.arg("pass"));
  String pair = portal.arg("pair");
  if (pair.length()) prefs.putString("pair", pair);   // keep existing pairing when not sent (WiFi-only reconfigure)
  portal.send(200, "text/html", String(PORTAL_HTML_HEAD) +
    "<h1>Saved</h1><p>Rebooting — the bin joins your WiFi and starts reporting.<br>Now register it in the app: scan the QR sticker.</p>");
  delay(1500);
  ESP.restart();
}

void portalCalibrate() {
  float h = calibrate();
  portal.send(200, "text/html", String(PORTAL_HTML_HEAD) +
    (h > 0
      ? "<h1>Calibrated</h1><p>Inside height: <b>" + String(h, 1) + " cm</b>. Add waste and you're live."
      : "<h1>Failed</h1><p>Sensor couldn't get a clean empty-bin reading — check nothing blocks it, then try again."));
}

void portalCaptive() { portalRoot(); }      // any URL → the form

void runSetupPortal() {
  String ap = "BINCOIN-SETUP-" + deviceId.substring(6);
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ap.c_str());                  // open network — first-time ease
  Serial.printf("Setup mode: connect to %s, browse http://192.168.4.1\n", ap.c_str());

  dns.start(53, "*", WiFi.softAPIP());      // captive portal: every domain → us
  portal.on("/", portalRoot);
  portal.on("/save", HTTP_POST, portalSave);
  portal.on("/calibrate", HTTP_POST, portalCalibrate);
  portal.onNotFound(portalCaptive);
  portal.begin();

  unsigned long t0 = millis();
  while (!portalDone && millis() - t0 < PORTAL_TIMEOUT_MS) {
    dns.processNextRequest();
    portal.handleClient();
    delay(2);
  }
  Serial.println("Portal timeout — sleeping.");
}

// ── Factory reset ───────────────────────────────────────────────────
bool resetRequested() {
  if (digitalRead(FACTORY_RESET_PIN) != LOW) return false;
  unsigned long t0 = millis();
  while (digitalRead(FACTORY_RESET_PIN) == LOW && millis() - t0 < 3000) delay(50);
  bool held = digitalRead(FACTORY_RESET_PIN) == LOW;
  if (held) { prefs.clear(); Serial.println("Factory reset — all config wiped."); }
  return held;
}

// ════════════════════════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  delay(200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(FACTORY_RESET_PIN, INPUT_PULLUP);
  analogReadResolution(12);
  prefs.begin("bincoin", false);
  deviceId = deriveDeviceId();
  Serial.printf("\nBincoin bin — %s\n", deviceId.c_str());

  bool needsSetup = resetRequested() ||
                    !prefs.isKey("ssid") ||
                    binHeightCm() <= 0;     // never calibrated → must set up
  if (needsSetup) {
    runSetupPortal();                        // exits via restart or timeout
    goToSleep(60);                           // try again in a minute
  }

  if (connectSavedWiFi()) {
    prefs.putUChar("wifiFails", 0);            // healthy link — reset the failure counter
    float airGap = medianDistance(SENSOR_SAMPLES);
    if (airGap < 0) airGap = MAX_RANGE_CM;  // no echo → treat as empty
    int battery = BATTERY_ENABLED ? batteryPercent(readBatteryVoltage()) : 0;
    float fill = fillPctFrom(airGap);
    Serial.printf("Height %.1f | gap %.1f | fill %.0f%% | batt %d%%\n",
                  binHeightCm(), airGap, fill, battery);

    bool recal = reportTelemetry(fill, battery, airGap, false);
    if (recal) {
      Serial.println("Admin requested recalibration.");
      float h = calibrate();
      if (h > 0) {
        // Re-measure the (now known-height) bin and report again with height.
        airGap = medianDistance(SENSOR_SAMPLES);
        if (airGap < 0) airGap = MAX_RANGE_CM;
        fill = fillPctFrom(airGap);
        reportTelemetry(fill, battery, airGap, true);  // sends bin_height_cm → clears the flag
      }
    }
  } else {
    // Persistent failure (password/router changed) → drop credentials so the
    // next wake reopens the setup portal. Calibration + pairing are kept.
    int fails = prefs.getUChar("wifiFails", 0) + 1;
    prefs.putUChar("wifiFails", fails);
    Serial.printf("WiFi unreachable — failure %d\n", fails);
    if (fails >= 4) {
      Serial.println("Forgetting WiFi — will reopen setup portal next wake.");
      prefs.remove("ssid");
      prefs.remove("pass");
      prefs.putUChar("wifiFails", 0);
      goToSleep(60);
    }
  }

  goToSleep(SLEEP_SECONDS);
}

void goToSleep(uint64_t seconds) {
  Serial.printf("Sleeping %llu s\n", (unsigned long long)seconds);
  Serial.flush();
  esp_sleep_enable_timer_wakeup(seconds * 1000000ULL);
  esp_deep_sleep_start();
}

void loop() {
  // Unreached — deep sleep restarts setup().
}
