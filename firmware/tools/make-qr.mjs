#!/usr/bin/env node
/**
 * Generates the pairing QR code + sticker text for one Bincoin bin.
 *
 * Usage:
 *   node make-qr.mjs <mac-address>
 *   node make-qr.mjs 24:6F:28:A1:B2:C3
 *
 * Output:
 *   qr-ESP32-A1B2C3.png   — print this on the bin sticker
 *   prints the pairing code to also write on the sticker (the user types
 *   it into the BINCOIN-SETUP portal once; the app reads it from the QR)
 *
 * The QR payload format is:  BINCOIN|<deviceId>|<pairingCode>
 * e.g.  BINCOIN|ESP32-A1B2C3|PAIR-9F2K7X
 *
 * Requires: nothing to install — it shells out to `npx qrcode`.
 */

import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";

const mac = process.argv[2];
if (!mac) {
  console.error("Usage: node make-qr.mjs <mac-address>");
  console.error("       (get it from the chip's serial output or esptool)");
  process.exit(1);
}

// Same derivation as the firmware: ESP32-<last 3 MAC bytes>
const bytes = mac.split(/[:-]/).map((h) => parseInt(h, 16));
if (bytes.length !== 6 || bytes.some((b) => Number.isNaN(b))) {
  console.error("Bad MAC — expected 6 hex bytes like 24:6F:28:A1:B2:C3");
  process.exit(1);
}
const deviceId = `ESP32-${bytes.slice(3).map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join("")}`;
const pairing = `PAIR-${randomBytes(3).toString("hex").toUpperCase()}`;
const payload = `BINCOIN|${deviceId}|${pairing}`;
const file = `qr-${deviceId}.png`;

execFileSync("npx", ["-y", "qrcode@1.5.4", "-o", file, "-w", "512", "-e", "H", payload], { stdio: "inherit" });

console.log("\n────────────────────────────────");
console.log("Device ID   :", deviceId);
console.log("Pairing code:", pairing);
console.log("QR payload  :", payload);
console.log("Sticker     :", file);
console.log("────────────────────────────────");
console.log("Print the QR + both codes on the bin. The pairing code is what the");
console.log("user types into the BINCOIN-SETUP portal during WiFi setup.");
