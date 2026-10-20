# Bincoin — Operations Runbook

Day-to-day commands. Hardware → backend → apps.

---

## Reading the data (SQL Editor → supabase.com)

```sql
-- Live bin state — heights/gaps are in centimetres
select label, fill_pct, air_gap_cm, bin_height_cm, last_ping_at from bins;

-- Awaiting claim
select * from announced_devices;

-- Pickup history
select id, status, fill_at_request, points_awarded, photo_ref
from pickup_requests order by created_at desc;
```

| Column | Unit | Meaning |
|---|---|---|
| `bin_height_cm` | cm | Empty-bin depth (calibrated) |
| `air_gap_cm` | cm | Sensor → trash surface right now |
| `fill_pct` | % | `(height − gap) / height` |
| `-1` | — | Sensor fault (no echo) — check wiring/mount |

## Supabase API logs

Dashboard → **Logs → API**:
- `POST …/update_bin_telemetry` + `ESP32HTTPClient` = device writing
- `POST …/announce_device` = device wake check-in
- `GET /rest/v1/bins` + `Mozilla` = app reading

Status `200` = request received. The **response body** `{"ok":true}` is what proves the row updated.

---

## ESP32 — everyday ops

| Action | How |
|---|---|
| Fresh reading now | Press **RST** once — wakes, measures, reports |
| Forget WiFi only | **RST ×2** within ~4s — keeps calibration + code |
| Factory reset | **RST ×3** — wipes everything |
| Full wipe (sure way) | `esptool erase_region 0x9000 0x6000` (close Serial Monitor first) |
| Serial output | Arduino IDE → Serial Monitor @ 115200 |

⚠️ Never hold BOOT at power-on — that's ROM download mode, not reset.

### Serial → what to expect

```
Connected <SSID> — <ip>
Announce: 200 — {"ok":true,...}
Height 73.8 | gap 21.5 | fill 71%        ← sensor reading
Supabase 200 — {"ok":true,...}           ← landed in DB
```

`SENSOR FAULT — no echo` = dead ECHO wiring / blocked face. Check divider + mount.

## Provisioning a bin (fresh device)

1. Power on → hotspot `BINCOIN-SETUP-XXXXXX` → `http://192.168.4.1`
2. **Copy the device code** `ESP32-XXXX|BINC-XXXX`
3. Bin empty → **Calibrate Now** → enter WiFi → Save
4. App → Register Bin → select device → paste code → submit
5. `bin_height_cm` fills in; fill updates every ~60s

---

## Deploys

```bash
cd apps/web
npm run deploy          # build → out/ → Cloudflare Pages (needs wrangler login or CLOUDFLARE_API_TOKEN)
```

Env vars must exist **where the build runs** (Pages → Settings → Environment variables) — static export bakes them. Missing vars → amber "Demo mode" banner, never silent fake data.

## Migrations

SQL files in `supabase/supabase/migrations/` run in order via SQL Editor. Current: 001–010.

---

## Troubleshooting quick map

| Symptom | Look at |
|---|---|
| App shows old data | `last_ping_at` in SQL — advancing? |
| `fill_pct` = −1 / "Fault" | Serial `SENSOR FAULT` → ECHO wire/divider/mount |
| `bin_height_cm` null | Old firmware — reflash `bincoin_bin.ino` |
| 200 but row unchanged | Response `ok:false` — no matching `bins` row / pairing mismatch |
| Connects to old WiFi | NVS not wiped — RST ×2 or esptool erase |
