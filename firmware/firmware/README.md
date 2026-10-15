# Bincoin Smart Bin — ESP32 firmware

Self-provisioning firmware for the registered smart bins: an **ESP32** reads the **JSN-SR04T waterproof ultrasonic sensor** (fill level via air gap) and the **battery voltage**, and reports to the Bincoin backend (Supabase). **No per-bin code edits** — every unit runs the same firmware.

## How a bin comes online (user flow)

1. **Power on** — the bin can't join any WiFi yet, so it starts a hotspot: **`BINCOIN-SETUP-XXXXXX`**.
2. **Phone → connect to that hotspot** — a setup page opens automatically (captive portal) at `http://192.168.4.1`.
3. **Fill it in**: home WiFi name + password, and the **pairing code** printed on the bin sticker. Press **"Calibrate Now"** *with the bin empty* — the sensor measures the inside height itself and stores it.
4. **Save & Connect** — the bin joins your WiFi and starts reporting every 15 minutes.
5. **In the app** → Register Bin → **Scan QR** on the sticker → the device ID + pairing code fill themselves → label, pin the location, submit for admin approval.

The admin approval card shows the **sensor-measured inside height** — the device proves its own geometry, so a tall-thin bin or short-wide bin is verified before approval rather than trusting a guessed size.

## Hardware

| Part | Notes |
|---|---|
| ESP32 dev board | Any WROOM-based board (DevKit V1 etc.) |
| JSN-SR04T ultrasonic sensor | Waterproof probe — mount at the **top center facing down** into the bin |
| 18650 Li-ion cell + TP4056 charger | Battery supply |
| 100 kΩ resistors ×2 | Voltage divider for the battery ADC |

### Wiring

| Signal | ESP32 pin |
|---|---|
| JSN-SR04T VCC | 3V3 *(or VIN/5V — see note)* |
| JSN-SR04T TRIG *(RX label)* | **GPIO 5** |
| JSN-SR04T ECHO *(TX label)* | **GPIO 18** |
| JSN-SR04T GND | GND |
| Battery divider midpoint | **GPIO 34** (ADC1) |
| GND | common ground |

> **Sensor voltage note:** powering the JSN-SR04T at **3.3 V** keeps its echo output 3.3 V-safe — recommended. At **5 V**, the echo line needs a level shifter or 10 kΩ/20 kΩ divider before GPIO 18.
>
> **Battery divider:** two 100 kΩ resistors in series across the battery; midpoint → GPIO 34. Set `BATTERY_ENABLED true` once wired.

## Flashing (once per batch — identical firmware on every bin)

1. **Board package:** Arduino IDE → Preferences → Additional Board URLs → `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json` → Boards Manager → **esp32 by Espressif**.
2. **Board:** ESP32 Dev Module · Upload speed 115200.
3. **Edit two constants only** — `SUPABASE_URL` / `SUPABASE_ANON_KEY` (from the app `.env`). Everything else is self-configured.
4. Upload → Serial Monitor at **115200** shows the derived device ID, e.g. `ESP32-A1B2C3`.

## Identity & pairing

- **Device ID** is derived from the chip's factory MAC (`ESP32-<last3MACbytes>`) — unique, unforgeable by typing, no config needed.
- **QR sticker format:** `BINCOIN|<deviceId>|<pairingCode>` — generate one per unit:
  ```bash
  node tools/make-qr.mjs 24:6F:28:A1:B2:C3   # the chip's MAC
  ```
  Prints `qr-ESP32-A1B2C3.png` + the pairing code to put on the sticker.
- The **pairing code** is stored on the bins row at registration; the telemetry RPC refuses writes that don't present it (rows registered without a code stay open for legacy compatibility).

## Runtime behaviour

1. **Wake** (deep-sleep timer, every 15 min).
2. **Measure** — median of 7 ultrasonic samples → air gap → `fill% = (1 − airGap/height) × 100` against the **calibrated** height, clamped 0–100.
3. **Report** — `POST /rest/v1/rpc/update_bin_telemetry` with `device_id`, `pairing_code`, fill, battery, air gap.
4. **Response** — the RPC answers `{ "ok": true, "recalibrate": false }`. If `recalibrate` is true (admin pressed *Recalibrate* in the app), the bin re-measures its empty height and reports it back — the flag clears automatically.
5. **Deep sleep** until the next wake.

### Controls

- **Factory reset:** hold the **BOOT button (GPIO0) for 3 s** at power-on → wipes saved WiFi/pairing/height → back to setup portal.
- **Re-calibrate:** empty the bin → hold BOOT 3 s → setup portal → *Calibrate Now* (or use the admin *Recalibrate* action, which the device picks up on its next wake).
- **Setup timeout:** the portal stays up for 10 minutes; if nobody connects, the bin sleeps a minute and retries on the next wake.

## Security notes

- The **anon key** is public by design — RLS applies. The demo-phase RLS is permissive; tighten per-user before production.
- `setInsecure()` skips TLS certificate validation for simplicity. For production, pin Supabase's root CA via `client.setCACert(...)`.
- Pairing codes mean a stolen device ID alone can't inject telemetry — rotate a bin's code by re-registering it.
