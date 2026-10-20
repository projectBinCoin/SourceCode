/*
 * ════════════════════════════════════════════════════════════════════
 *  Bincoin Smart Bin — ESP32 + HC-SR04 (firmware v3, self-provisioning)
 * ════════════════════════════════════════════════════════════════════
 *
 *  NO PER-BIN CODE EDITS. One firmware for the whole fleet:
 *
 *  • Identity   — the device ID is derived from the burned-in chip MAC
 *                 (e.g. ESP32-A1B2C3). It can never collide or be mistyped.
 *  • Setup      — first boot starts a "BINCOIN-SETUP-XXXXXX" hotspot. The
 *                 portal lists the 2.4 GHz networks it can see, TESTS the
 *                 password live before saving, then asks for calibration.
 *                 It shows a copyable "ESP32-XXXXXX|BINC-XXXXXX" device
 *                 code for the app's Register Bin screen.
 *  • Calibrate  — the portal's "Calibrate" button measures the EMPTY bin
 *                 depth (median of 15 ultrasonic reads) and stores it as
 *                 the 0% baseline. The bin proves its own geometry —
 *                 tall thin bins and short wide bins all self-describe.
 *                 The measured height lands on the admin approval card.
 *  • Telemetry  — fill% = (1 − airGap/height) × 100, plus battery, air
 *                 gap, and the measured height are POSTed to Supabase.
 *                 The server answers { ok, recalibrate, need_height, ping }.
 *                 A dead sensor reports -1 (fault) — never a fake 100%.
 *  • Reset      — RST x2 (double-tap within ~4 s): forget WiFi only.
 *                 RST x3 (triple-tap): factory reset — wipes WiFi,
 *                 calibration and pairing code, back to setup mode.
 *                 (Never hold BOOT at power-on — that enters ROM
 *                 download mode before setup() runs.)
 *
 *  ── ONE-TIME FLEET SETUP (flash time, same for every bin) ───────────
 *  1. Copy SUPABASE_URL / SUPABASE_ANON_KEY from the app's env file.
 *  2. Board: "ESP32 Dev Module" · 115200 baud. That's it — no per-bin
 *     changes.
 *
 *  Wiring and details: firmware/README.md · ops: docs/RUNBOOK.md
 * ════════════════════════════════════════════════════════════════════
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>
#include <esp_mac.h>
#include <esp_sleep.h>

// ── Fleet-wide backend (baked at flash time — same for every bin) ────
const char* SUPABASE_URL      = "https://YOUR-PROJECT-REF.supabase.co";
const char* SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

// ── Pins ────────────────────────────────────────────────────────────
const int TRIG_PIN    = 5;    // HC-SR04 TRIG
const int ECHO_PIN    = 18;   // HC-SR04 ECHO — 5V output: level-shift / divider to 3.3V required
const int BATTERY_PIN = 34;   // ADC input from the battery voltage divider

// Set to true once the 18650 + TP4056 + voltage divider is wired.
#define BATTERY_ENABLED false

// TEMPORARY bench mode: streams live sensor readings to Serial ~every 1.5s.
// Skips WiFi, the setup portal, Supabase, and deep sleep entirely.
// Set back to false for normal operation.
#define TEST_BENCH_MODE false

// ── Sensor ──────────────────────────────────────────────────────────
const int   SENSOR_SAMPLES     = 7;      // median pool per reading
const int   CALIB_SAMPLES      = 15;     // median pool for calibration
const int   SAMPLE_GAP_MS      = 120;
const float MAX_RANGE_CM       = 400.0;  // HC-SR04 max ~4 m
const float SENSOR_BLIND_CM    = 2.0;    // HC-SR04 can't resolve surfaces closer than ~2 cm
const float MEMORY_WINDOW_CM   = 12.0;   // echoes near last-known gap beat room bounces
const float FALLBACK_TEMP_C    = 30.0;   // used until a real reading is fetched

// Survives deep sleep — the last trustworthy air gap.
RTC_DATA_ATTR float lastGapCm    = -1.0f;           // survives deep sleep (RAM stays powered)
RTC_DATA_ATTR float ambientTempC = FALLBACK_TEMP_C; // last fetched weather temp, survives sleep
RTC_DATA_ATTR float binLat = 0.0f, binLng = 0.0f;   // bin's registered coords (from telemetry RPC)
RTC_DATA_ATTR bool  hasCoords = false;
RTC_DATA_ATTR uint32_t bootCount = 0;               // RST-press counter for reset gestures

// ── Battery (100k/100k divider → Vbat/2, 3.3 V ADC ref) ─────────────
const float ADC_REF_VOLTAGE = 3.3;
const float ADC_MAX         = 4095.0;
const float DIVIDER_RATIO   = 2.0;
const float BATTERY_FULL_V  = 4.2;
const float BATTERY_EMPTY_V = 3.0;

// ── Power management ────────────────────────────────────────────────
const uint64_t SLEEP_SECONDS = 60;       // telemetry cadence — 60s for near-realtime dev (900 for battery fleet)
const unsigned long PORTAL_TIMEOUT_MS = 10 * 60 * 1000;  // portal gives up after 10 min → sleep, retry next wake
const unsigned long JOIN_TEST_MS = 15000;                // live WiFi password test window
const uint8_t WIFI_FAILS_BEFORE_PORTAL = 3;              // consecutive failed wakes → reopen portal (creds kept)

// ════════════════════════════════════════════════════════════════════

Preferences prefs;
String deviceId;

// Speed of sound in cm/µs, temperature-corrected: v = 331.3 + 0.606·T m/s.
// Using 0.0343 (20 °C) under-reads ~1–2 cm in warm bins.
float soundSpeedCmUs() {
  return (331.3 + 0.606 * ambientTempC) / 10000.0;
}

// Pairing code: generated on-device on first boot, shown on the portal —
// it IS the claim proof. A stale/garbage value gets regenerated.
String pairingCode() {
  String p = prefs.getString("pair", "");
  if (!p.startsWith("BINC-")) {
    char code[16];
    snprintf(code, sizeof(code), "BINC-%06lX", (unsigned long)(esp_random() % 0xFFFFFF));
    prefs.putString("pair", code);
    p = code;
  }
  return p;
}

// ── Identity: MAC-derived, unique, zero-config ──────────────────────
String deriveDeviceId() {
  uint8_t mac[6];
  esp_read_mac(mac, ESP_MAC_WIFI_STA);
  char id[16];
  snprintf(id, sizeof(id), "ESP32-%02X%02X%02X", mac[3], mac[4], mac[5]);
  return String(id);
}

// ── Ultrasonic: single pulse → distance in cm (−1 = no echo) ────────
// timeoutUs is per-call so telemetry can bound echoes to the calibrated
// bin height — late wall-bounce echoes get killed instead of measured.
float readDistanceCm(unsigned long timeoutUs) {
  // ECHO must be LOW before firing — a stuck-HIGH from a previous
  // blind-zone/timeout ping desyncs the next measurement (the 115cm
  // phantom-echo bug seen on the test bench).
  unsigned long t0 = micros();
  while (digitalRead(ECHO_PIN) == HIGH && micros() - t0 < 40000) delayMicroseconds(50);
  delayMicroseconds(150);

  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(4);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  unsigned long duration = pulseIn(ECHO_PIN, HIGH, timeoutUs);
  if (duration == 0) return -1.0;
  return (duration * soundSpeedCmUs()) / 2.0;
}

// Sort, drop the top quartile — bounced echoes always land at the long
// end — then median the surviving direct-path cluster.
float trimmedMedian(float* vals, int n) {
  for (int i = 1; i < n; i++) {                 // insertion sort (n is tiny)
    float k = vals[i]; int j = i - 1;
    while (j >= 0 && vals[j] > k) { vals[j + 1] = vals[j]; j--; }
    vals[j + 1] = k;
  }
  int keep = n - n / 4;
  int mid = keep / 2;
  return keep % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2.0;
}

// Bounded + trimmed median with last-known-position memory.
// - readings above maxCm: wall echoes → dropped
// - readings < ~2cm (trash at sensor face): clamped low, never rejected
// - refCm (last wake's gap): echoes near it win — a tilted trash surface
//   scatters most pings into wall/ceiling bounces, so the 2-3 hits that
//   return from the real surface cluster near the previous reading.
float medianDistance(int samples, float maxCm, float refCm = -1.0f) {
  // cm→µs round trip + slack: the HC-SR04 raises ECHO ~0.5 ms after TRIG and
  // pulseIn's timeout includes that wait. Without slack, small bins (14 cm →
  // ~970 µs) time out on every ping. Over-range echoes are still dropped below.
  const unsigned long timeoutUs = (unsigned long)(maxCm * 58.3) + 3000;
  float vals[CALIB_SAMPLES];
  int n = 0;
  for (int i = 0; i < samples && n < samples; i++) {
    float d = readDistanceCm(timeoutUs);
    if (d > 0 && d <= maxCm) vals[n++] = d < 2.0 ? 2.0 : d;
    delay(SAMPLE_GAP_MS);
  }
  if (n == 0) return -1.0;

  // Memory gate: if we know where the surface was last wake and at least
  // 2 pings still land near it, they are the true surface — scatter to
  // walls/ceiling is discarded entirely.
  if (refCm > 0) {
    float near[CALIB_SAMPLES];
    int m = 0;
    for (int i = 0; i < n; i++) {
      if (fabsf(vals[i] - refCm) <= MEMORY_WINDOW_CM) near[m++] = vals[i];
    }
    if (m >= 2) { n = m; memcpy(vals, near, m * sizeof(float)); }
  }
  return trimmedMedian(vals, n);
}

float binHeightCm() {
  return prefs.isKey("binHeight") ? prefs.getFloat("binHeight", 0) : 0;
}

// Telemetry read: echoes bounded to calibrated height; a surface inside the
// blind zone saturates to 0cm → 100%, and a burst with zero valid echoes
// holds the last known gap (trash surfaces scatter pings — a dead burst
// is NOT a level change).
float measureAirGap() {
  float maxGap = binHeightCm() > 0 ? binHeightCm() * 1.15 : MAX_RANGE_CM;
  float g = medianDistance(SENSOR_SAMPLES, maxGap, lastGapCm);
  if (g < 0) {
    // Every ping timed out. When the surface was already close, covered-face
    // timeouts mean FULL — not "hold". Only hold when the surface was far away
    // (a far miss is scatter, not contact). With NO prior reading at all this
    // is a dead/disconnected sensor — report the fault (-1), never fake 100%.
    // "Close" is relative to the bin — a fixed 25 cm meant every reading in a
    // small bin counted as close, so any missed burst reported 100%.
    float h = binHeightCm();
    float closeCm = h > 0 ? fminf(25.0f, h * 0.25f) : 25.0f;
    if (lastGapCm > 0 && lastGapCm < closeCm) return 0.0;
    return lastGapCm > 0 ? lastGapCm : -1.0;
  }
  lastGapCm = g;                              // remember for next wake
  return g < SENSOR_BLIND_CM ? 0.0 : g;       // measured but unresolvable → full
}

// Fill% from the measured air gap against the CALIBRATED height.
float fillPctFrom(float airGapCm) {
  if (airGapCm < 0) return -1;                // sensor fault propagates
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
  float h = medianDistance(CALIB_SAMPLES, MAX_RANGE_CM);   // height unknown yet — unbounded
  if (h < 5.0) {                              // <5 cm = sensor face covered
    Serial.println("Calibration failed — sensor blocked or bin not empty.");
    return 0;
  }
  prefs.putFloat("binHeight", h);
  prefs.putBool("hDirty", true);              // push the new height on next report
  lastGapCm = h;                              // seed memory: empty bin = full height
  Serial.printf("Calibrated: inside height %.1f cm\n", h);
  return h;
}

// ── Supabase RPC (anon key; RLS-safe security-definer functions) ────
int postRpc(const char* fn, const String& body, String& resp) {
  WiFiClientSecure tls;
  tls.setInsecure();                          // anon-key REST; cert pinning is a fleet-hardening step for later
  HTTPClient http;
  if (!http.begin(tls, String(SUPABASE_URL) + "/rest/v1/rpc/" + fn)) return -1;
  http.setTimeout(8000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", SUPABASE_ANON_KEY);
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
  int code = http.POST(body);
  resp = http.getString();
  http.end();
  return code;
}

// jsonb serializes with spaces — {"key" : true} — so string matching must
// skip whitespace after the colon. Reads a boolean flag.
bool jsonBool(const String& json, const char* key) {
  int i = json.indexOf(String("\"") + key + "\"");
  if (i < 0) return false;
  i += strlen(key) + 2;
  while (i < (int)json.length() && (json[i] == ' ' || json[i] == ':')) i++;
  return json.charAt(i) == 't';
}

// Same tolerant parse for a numeric value (returns NAN when absent/null).
float jsonNum(const String& json, const char* key) {
  int i = json.indexOf(String("\"") + key + "\"");
  if (i < 0) return NAN;
  i += strlen(key) + 2;
  while (i < (int)json.length() && (json[i] == ' ' || json[i] == ':')) i++;
  if (i >= (int)json.length() || json[i] == 'n') return NAN;   // null
  return json.substring(i).toFloat();
}

// ── Telemetry ───────────────────────────────────────────────────────
// Returns the server's recalibrate flag (true → re-measure + resend).
bool reportTelemetry(float fillPct, int batteryPct, float airGapCm, bool includeHeight) {
  String body = "{\"p_device_id\":\"" + deviceId +
                "\",\"p_fill_pct\":" + String((int)fillPct) +
                ",\"p_battery_pct\":" + String(batteryPct) +
                ",\"p_air_gap_cm\":" + String((int)airGapCm) +
                ",\"p_pairing_code\":\"" + pairingCode() + "\"";
  if (includeHeight) body += ",\"p_bin_height_cm\":" + String(binHeightCm(), 1);
  body += "}";

  Serial.print("Report: "); Serial.println(body);
  String resp;
  int code = postRpc("update_bin_telemetry", body, resp);
  Serial.printf("Supabase %d — %s\n", code, resp.c_str());   // 200 + {"ok":true,...}
  if (code != 200 && code != 204) return false;
  if (!jsonBool(resp, "ok")) {
    // HTTP 200 but no bin row matched — the reading was NOT stored.
    Serial.printf("Not stored — claim this device in the app: %s|%s\n",
                  deviceId.c_str(), pairingCode().c_str());
    return false;
  }

  // Stash the bin's registered coords — next wake uses them for weather.
  float lat = jsonNum(resp, "lat"), lng = jsonNum(resp, "lng");
  if (!isnan(lat) && !isnan(lng)) {
    binLat = lat; binLng = lng;
    hasCoords = true;
  }
  // Server flags a missing bin_height_cm → resend with height this same wake.
  if (!includeHeight && jsonBool(resp, "need_height") && binHeightCm() > 0) {
    Serial.println("Server wants bin height — resending.");
    reportTelemetry(fillPct, batteryPct, airGapCm, true);
  }
  // A pickup was just requested → take an extra fresh read and re-verify.
  if (jsonBool(resp, "ping")) {
    Serial.println("Pickup ping — verifying fill with a fresh read.");
    delay(500);
    float g2 = measureAirGap();
    reportTelemetry(fillPctFrom(g2), batteryPct, g2, false);
  }
  return jsonBool(resp, "recalibrate");
}

// Self-announce: "I'm online" → lands in announced_devices so the app
// can list this device for claiming. No-ops server-side once claimed.
void announceDevice() {
  String body = "{\"p_device_id\":\"" + deviceId +
                "\",\"p_pairing_code\":\"" + pairingCode() + "\"";
  if (binHeightCm() > 0) body += ",\"p_bin_height_cm\":" + String(binHeightCm(), 1);
  body += "}";
  String resp;
  int code = postRpc("announce_device", body, resp);
  Serial.printf("Announce: %d — %s\n", code, resp.c_str());
}

bool connectSavedWiFi(unsigned long timeoutMs = 20000) {
  String ssid = prefs.getString("ssid", "");
  String pass = prefs.getString("pass", "");
  if (!ssid.length()) return false;
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid.c_str(), pass.c_str());
  Serial.printf("WiFi connecting to \"%s\"", ssid.c_str());
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
// Runs in AP+STA mode: the hotspot stays up while the entered password is
// tested against the real router. Credentials are only saved once the join
// actually succeeds — a typo is reported on the spot, not after a reboot.
WebServer portal(80);
DNSServer dns;
String portalErr;                               // red banner (shown once)
String portalOk;                                // green banner (shown once)
String networkOptions;                          // <option>s from the last scan

enum JoinState { JOIN_IDLE, JOIN_TESTING, JOIN_OK, JOIN_FAIL };
JoinState joinState = JOIN_IDLE;
String joinSsid, joinPass;
String joinReason;                              // plain-text failure reason (for the app's /status.json)
unsigned long joinStart = 0;
unsigned long restartAt = 0;                    // 0 = no restart scheduled
unsigned long lastScan = 0;                     // rescan throttle — phones hammer portal URLs
volatile uint8_t lastDiscReason = 0;            // STA disconnect reason from the WiFi driver

String htmlEscape(String s) {
  s.replace("&", "&amp;"); s.replace("<", "&lt;"); s.replace(">", "&gt;");
  s.replace("\"", "&quot;"); s.replace("'", "&#39;");
  return s;
}

// The ESP32 radio is 2.4 GHz only — 5 GHz networks never appear here,
// which is exactly why the list beats a free-text field.
void scanNetworks() {
  Serial.println("Scanning WiFi...");
  int n = WiFi.scanNetworks();
  String seen = "|";
  networkOptions = "";
  for (int i = 0; i < n; i++) {               // results arrive strongest-first
    String s = WiFi.SSID(i);
    if (!s.length() || seen.indexOf("|" + s + "|") >= 0) continue;
    seen += s + "|";
    int rssi = WiFi.RSSI(i);
    const char* sig = rssi > -60 ? "strong" : rssi > -70 ? "good" : rssi > -80 ? "fair" : "weak";
    networkOptions += "<option value=\"" + htmlEscape(s) + "\">" + htmlEscape(s) + " (" + sig + ")</option>";
  }
  WiFi.scanDelete();
  if (n <= 0) networkOptions = "<option value=''>— none found, type it below</option>";
  Serial.printf("Found %d networks\n", n < 0 ? 0 : n);
}

// Send with no-store — phones/browsers must never cache the setup page
// (stale pages caused old pairing codes to linger).
void sendPortal(const String& html, int code = 200) {
  portal.sendHeader("Cache-Control", "no-store");
  portal.send(code, "text/html", html);
}

const char* PORTAL_HTML_HEAD = R"HTML(
<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>Bincoin Bin Setup</title>
<style>body{font-family:sans-serif;max-width:26rem;margin:2rem auto;padding:0 1rem;color:#0b1d3a}
input,select,button{width:100%;padding:.7rem;margin:.3rem 0;border:1px solid #cbd5e1;border-radius:.5rem;box-sizing:border-box;font-size:1rem}
button{background:#0099ff;color:#fff;border:0;font-weight:600}h1{font-size:1.2rem}
.box{border-radius:.6rem;padding:.8rem;margin:.6rem 0}.err{background:#fee2e2;border:1px solid #fecaca;color:#b91c1c}
.ok{background:#dcfce7;border:1px solid #bbf7d0;color:#166534}.step{margin:.2rem 0}
small{color:#64748b}a{color:#0099ff}</style>)HTML";

// One copy-pastable line for the app: "ESP32-XXXXXX|BINC-XXXXXX".
// Uses a plain textarea + execCommand — clipboard API needs HTTPS and
// the portal is plain HTTP.
String deviceCodeBlock() {
  return
    "<div class=box style='background:#eef6ff;border:1px solid #bfdbfe'>"
    "<b>Your device code</b> — copy this into the app's Register Bin screen:"
    "<textarea id=dc readonly rows=1 onclick='this.select()' "
    "style='font-family:monospace;font-size:1rem;width:100%;border:0;background:transparent;resize:none'>"
    + deviceId + "|" + pairingCode() + "</textarea>"
    "<button type=button style='background:#003B73' "
    "onclick=\"var i=document.getElementById('dc');i.select();i.setSelectionRange(0,999);document.execCommand('copy');this.innerText='Copied!'\">Copy device code</button>"
    "</div>";
}

void portalRoot(int code = 200) {
  if (portal.hasArg("rescan") && millis() - lastScan > 3000) {
    lastScan = millis();
    scanNetworks();
  }
  bool wifiOk = prefs.isKey("ssid");
  bool calOk = binHeightCm() > 0;

  String h = PORTAL_HTML_HEAD;
  h += "<h1>Bincoin Smart Bin Setup</h1>";
  if (portalErr.length()) { h += "<div class='box err'>" + portalErr + "</div>"; portalErr = ""; }
  if (portalOk.length())  { h += "<div class='box ok'>"  + portalOk  + "</div>"; portalOk = ""; }
  h += deviceCodeBlock();

  h += "<div class=step><b>" + String(wifiOk ? "DONE" : "STEP 1") + " — WiFi</b> " +
       (wifiOk ? "<small>saved: " + htmlEscape(prefs.getString("ssid", "")) + "</small>" : "") + "</div>";
  h += "<form method=POST action=/save>";
  h += "<select name=ssid_sel>" + networkOptions + "<option value=''>Other — type below</option></select>";
  h += "<input name=ssid_manual placeholder='…or type the network name'>";
  h += "<input name=pass type=password placeholder='WiFi password'>";
  h += "<button>Test & Save WiFi</button></form>";
  h += "<small>Only 2.4 GHz networks work. Missing? <a href='/?rescan=1'>Scan again</a></small>";

  h += "<div class=step style='margin-top:1rem'><b>" + String(calOk ? "DONE" : "STEP 2") + " — Calibrate</b> " +
       (calOk ? "<small>inside height " + String(binHeightCm(), 1) + " cm</small>" : "") + "</div>";
  h += "<form method=POST action=/calibrate><button style='background:#16a34a'>"
       "Calibrate Now — empty the bin first</button></form>";
  h += "</body>";
  sendPortal(h, code);
}

String testingPage() {
  return String(PORTAL_HTML_HEAD) +
    "<meta http-equiv=refresh content='3;url=/status'>"
    "<h1>Testing WiFi…</h1><p>Connecting to <b>" + htmlEscape(joinSsid) + "</b>. "
    "This page refreshes by itself.</p><small>If your phone drops off the "
    "BINCOIN-SETUP hotspot, rejoin it — the result will be waiting.</small>";
}

void portalSave() {
  // Portal form sends ssid_manual/ssid_sel; the mobile app sends plain ssid.
  String ssid = portal.arg("ssid_manual");
  ssid.trim();
  if (!ssid.length()) { ssid = portal.arg("ssid"); ssid.trim(); }
  if (!ssid.length()) ssid = portal.arg("ssid_sel");
  if (!ssid.length()) {
    portalErr = "Pick a network or type its name.";
    return portalRoot(400);
  }
  joinSsid = ssid;
  joinPass = portal.arg("pass");
  lastDiscReason = 0;
  WiFi.disconnect(false, false);
  WiFi.begin(joinSsid.c_str(), joinPass.c_str());
  joinState = JOIN_TESTING;
  joinStart = millis();
  Serial.printf("Testing WiFi \"%s\"...\n", joinSsid.c_str());
  sendPortal(testingPage());
}

// Machine-readable test result for the mobile app (it can't parse the HTML flow).
void portalStatusJson() {
  const char* st = joinState == JOIN_TESTING ? "testing" : joinState == JOIN_OK ? "ok"
                 : joinState == JOIN_FAIL ? "fail" : "idle";
  String r = joinReason; r.replace("\"", "'");
  portal.sendHeader("Cache-Control", "no-store");
  portal.send(200, "application/json",
    String("{\"state\":\"") + st + "\",\"reason\":\"" + r + "\",\"calibrated\":" +
    (binHeightCm() > 0 ? "true" : "false") + ",\"device\":\"" + deviceId + "\",\"code\":\"" + pairingCode() + "\"}");
}

void portalStatus() {
  if (joinState == JOIN_TESTING) return sendPortal(testingPage());
  portal.sendHeader("Location", "/");
  portal.sendHeader("Cache-Control", "no-store");
  portal.send(302, "text/plain", "");
}

void portalCalibrate() {
  float h = calibrate();
  if (h <= 0) {
    portalErr = "<b>Calibration failed</b><br>The sensor couldn't get a clean empty-bin "
                "reading — make sure nothing blocks it, then try again.";
    return portalRoot(422);                     // real error status — the app checks res.ok
  } else if (prefs.isKey("ssid")) {
    restartAt = millis() + 4000;
    return sendPortal(String(PORTAL_HTML_HEAD) +
      "<h1>All set</h1><p>Inside height: <b>" + String(h, 1) + " cm</b>.</p>" + deviceCodeBlock() +
      "<p>Rebooting — the bin joins your WiFi and announces itself.<br>"
      "Open the app → Register Bin → paste the code above.</p>");
  } else {
    portalOk = "Calibrated — inside height " + String(h, 1) + " cm. Now set up WiFi.";
  }
  portalRoot();
}

// Drives the live password test without blocking the web server.
void serviceJoinTest() {
  if (joinState != JOIN_TESTING) return;
  if (WiFi.status() == WL_CONNECTED) {
    prefs.putString("ssid", joinSsid);
    prefs.putString("pass", joinPass);
    prefs.putUChar("wifiFails", 0);
    joinState = JOIN_OK;
    Serial.printf("WiFi OK — %s saved\n", joinSsid.c_str());
    if (binHeightCm() > 0) {
      portalOk = "WiFi connected. Rebooting into normal mode...";
      restartAt = millis() + 5000;
    } else {
      portalOk = "WiFi connected and saved. Now calibrate the empty bin (step 2).";
    }
    WiFi.disconnect(false, false);            // keep creds in RAM off; AP stays up
    return;
  }
  if (millis() - joinStart < JOIN_TEST_MS) return;

  WiFi.disconnect(false, false);
  joinState = JOIN_FAIL;
  String n = htmlEscape(joinSsid);
  switch (lastDiscReason) {
    case WIFI_REASON_NO_AP_FOUND:
      joinReason = "Network \"" + joinSsid + "\" not found. The bin only sees 2.4 GHz WiFi.";
      portalErr = "<b>\"" + n + "\" not found.</b><br>Check the name — the bin only sees 2.4 GHz WiFi. "
                  "Dual-band routers: use the 2.4 GHz network name."; break;
    case WIFI_REASON_AUTH_FAIL:
    case WIFI_REASON_HANDSHAKE_TIMEOUT:
    case WIFI_REASON_4WAY_HANDSHAKE_TIMEOUT:
    case WIFI_REASON_AUTH_EXPIRE:
      joinReason = "Wrong password for \"" + joinSsid + "\".";
      portalErr = "<b>Wrong password for \"" + n + "\".</b><br>Passwords are case-sensitive — try again."; break;
    default:
      joinReason = "Couldn't join \"" + joinSsid + "\". Check the password and signal.";
      portalErr = "<b>Couldn't join \"" + n + "\".</b><br>Check the password and move the bin closer to the router."; break;
  }
  Serial.printf("WiFi test failed (reason %u)\n", lastDiscReason);
}

void runSetupPortal() {
  String ap = "BINCOIN-SETUP-" + deviceId.substring(6);
  WiFi.onEvent([](WiFiEvent_t, WiFiEventInfo_t info) {
    lastDiscReason = info.wifi_sta_disconnected.reason;
  }, ARDUINO_EVENT_WIFI_STA_DISCONNECTED);
  WiFi.mode(WIFI_AP_STA);
  scanNetworks();
  WiFi.softAP(ap.c_str());                    // open network — first-time ease
  Serial.printf("Setup mode: connect to %s, browse http://192.168.4.1\n", ap.c_str());

  dns.start(53, "*", WiFi.softAPIP());        // captive portal: every domain → us
  portal.on("/", [] { portalRoot(); });
  portal.on("/save", HTTP_POST, portalSave);
  portal.on("/status", portalStatus);
  portal.on("/status.json", portalStatusJson);
  portal.on("/calibrate", HTTP_POST, portalCalibrate);
  portal.onNotFound([] { portalRoot(); });              // any URL → the form
  portal.begin();

  unsigned long t0 = millis();
  while (millis() - t0 < PORTAL_TIMEOUT_MS) {
    dns.processNextRequest();
    portal.handleClient();
    serviceJoinTest();
    if (restartAt && millis() > restartAt) ESP.restart();
    delay(2);
  }
  Serial.println("Portal timeout — sleeping.");
}

// ════════════════════════════════════════════════════════════════════

// Fetch ambient temperature (°C) once per wake. Two tiers, both free & keyless:
//   1. Bin's registered lat/lng → Open-Meteo (accurate to the bin's location)
//   2. No coords yet (unregistered / first wake) → wttr.in by WAN-IP geo
// Fails silently → keeps the last good value in RTC (or FALLBACK_TEMP_C).
void fetchAmbientTemp() {
  float t = -1000.0;

  if (hasCoords) {
    WiFiClientSecure tls;
    tls.setInsecure();
    HTTPClient http;
    http.begin(tls, "https://api.open-meteo.com/v1/forecast?latitude=" +
              String(binLat, 4) + "&longitude=" + String(binLng, 4) +
              "&current=temperature_2m");
    http.setTimeout(5000);
    int code = http.GET();
    String resp = http.getString();
    http.end();
    int ti = code == 200 ? resp.indexOf("\"temperature_2m\":") : -1;
    if (ti > 0) t = resp.substring(ti + 17).toFloat();
  } else {
    HTTPClient http;
    http.begin("http://wttr.in/?format=%t");    // returns e.g. "+29°C"
    http.setTimeout(4000);
    int code = http.GET();
    if (code == 200) {
      String s = http.getString();
      s.trim(); s.replace("+", ""); s.replace("°C", "");
      t = s.toFloat();
    }
    http.end();
  }

  if (t > -40.0 && t < 60.0) {
    ambientTempC = t;
    Serial.printf("Ambient temp: %.1f °C%s (sound speed %.5f cm/µs)\n",
                  ambientTempC, hasCoords ? " @ bin location" : " @ IP geo",
                  soundSpeedCmUs());
  }
}

void goToSleep(uint64_t seconds) {
  bootCount = 0;                                  // normal wake → reset the RST-press counter
  Serial.printf("Sleeping %llu s\n", (unsigned long long)seconds);
  Serial.flush();
  esp_sleep_enable_timer_wakeup(seconds * 1000000ULL);
  esp_deep_sleep_start();
}

void setup() {
  Serial.begin(115200);
  delay(200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  analogReadResolution(12);
  prefs.begin("bincoin", false);
  deviceId = deriveDeviceId();
  Serial.printf("\nBincoin bin — %s | code %s\n", deviceId.c_str(), pairingCode().c_str());

  // Reset gestures — only on MANUAL resets (timer wakeups never count).
  // RTC memory survives RST, so rapid presses accumulate; goToSleep clears
  // the counter each normal wake:
  //   RST ×2 = WiFi reconfigure only (keep calibration + pairing code)
  //   RST ×3 (a press during the 2.5s window) = full factory reset
  if (esp_sleep_get_wakeup_cause() != ESP_SLEEP_WAKEUP_TIMER) {
    bootCount++;
    if (bootCount >= 3) {
      bootCount = 0;
      prefs.clear();
      Serial.println("Factory reset — all config wiped (RST x3).");
    } else if (bootCount == 2) {
      Serial.println("WiFi reset pending — press RST again within 2.5s for FULL factory reset.");
      delay(2500);                 // a press here → hard reset → next boot sees count 3
      bootCount = 0;
      prefs.remove("ssid");
      prefs.remove("pass");
      Serial.println("WiFi reset — reopening setup portal (calibration kept).");
    }
  }

#if TEST_BENCH_MODE
  Serial.printf("TEST BENCH — streaming readings (binHeight %.1f cm)\n", binHeightCm());
  return;                                        // loop() streams readings
#endif

  if (!prefs.isKey("ssid") || binHeightCm() <= 0) {   // never set up / never calibrated
    runSetupPortal();                        // exits via restart or timeout
    goToSleep(60);                           // try again in a minute
  }

  if (!connectSavedWiFi()) {
    // Router down or password changed. Credentials are KEPT — a short outage
    // must never force re-provisioning. After a few failed wakes the portal
    // reopens (with the saved WiFi still retried every wake) so a changed
    // password can be fixed on the spot.
    uint8_t fails = prefs.getUChar("wifiFails", 0) + 1;
    prefs.putUChar("wifiFails", fails);
    Serial.printf("WiFi unreachable — failure %u\n", fails);
    if (fails >= WIFI_FAILS_BEFORE_PORTAL) {
      prefs.putUChar("wifiFails", 0);
      portalErr = "<b>Can't reach \"" + htmlEscape(prefs.getString("ssid", "")) + "\".</b><br>"
                  "If the password changed, set WiFi again. Otherwise just wait — the bin keeps retrying.";
      runSetupPortal();
    }
    goToSleep(SLEEP_SECONDS);
  }

  prefs.putUChar("wifiFails", 0);            // healthy link — reset the failure counter
  announceDevice();                          // make the app see this device
  fetchAmbientTemp();                        // temp-compensate sound speed
  float airGap = measureAirGap();
  int battery = BATTERY_ENABLED ? batteryPercent(readBatteryVoltage()) : 0;
  float fill = fillPctFrom(airGap);
  if (airGap < 0)
    Serial.printf("Height %.1f | SENSOR FAULT — no echo | batt %d%%\n", binHeightCm(), battery);
  else
    Serial.printf("Height %.1f | gap %.1f | fill %.0f%% | batt %d%%\n",
                  binHeightCm(), airGap, fill, battery);

  bool hDirty = prefs.getBool("hDirty", false);   // height changed outside the recal flow (portal re-cal)
  bool recal = reportTelemetry(fill, battery, airGap, hDirty);
  if (hDirty) prefs.putBool("hDirty", false);
  if (recal) {
    Serial.println("Admin requested recalibration.");
    if (calibrate() > 0) {
      // Re-measure the (now known-height) bin and report again with height.
      airGap = measureAirGap();
      reportTelemetry(fillPctFrom(airGap), battery, airGap, true);  // sends bin_height_cm → clears the flag
      prefs.putBool("hDirty", false);
    }
  }
  goToSleep(SLEEP_SECONDS);
}

void loop() {
#if TEST_BENCH_MODE
  // Bench mode is UNBOUNDED — shows every raw ping so you can see what the
  // sensor actually hears. Production bounds reads to binHeight*1.15.
  const unsigned long tUs = (unsigned long)(MAX_RANGE_CM * 58.3);
  float vals[SENSOR_SAMPLES];
  int n = 0;
  Serial.print("raw:");
  for (int i = 0; i < SENSOR_SAMPLES; i++) {
    float d = readDistanceCm(tUs);
    if (d < 0) Serial.print("   miss");
    else { Serial.printf(" %6.1f", d); vals[n++] = d; }
    delay(SAMPLE_GAP_MS);
  }
  if (n == 0) {
    Serial.printf("   → all missed/out of range (memory %.1f)\n", lastGapCm);
  } else {
    float g = trimmedMedian(vals, n);
    float sat = g < SENSOR_BLIND_CM ? 0.0f : g;
    Serial.printf("   → gap %5.1f cm | memory %5.1f | fill %3.0f%%%s\n",
                  g, lastGapCm, fillPctFrom(sat),
                  g < SENSOR_BLIND_CM ? "  [BLIND→FULL]" : "");
    lastGapCm = g;
  }
  delay(1200);
#endif
  // Production: unreached — deep sleep restarts setup().
}
