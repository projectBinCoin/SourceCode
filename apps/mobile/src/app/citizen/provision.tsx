import { useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as IntentLauncher from "expo-intent-launcher";
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw, Wifi, WifiOff, Zap } from "lucide-react-native";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, PasswordInput } from "@/components/ui";

const PORTAL_BASE = "http://192.168.4.1";

type Stage = "idle" | "waiting" | "connected" | "sent" | "failed";

function makePairingCode() {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  return `BINC-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

export default function ProvisionDevice() {
  const params = useLocalSearchParams<{ deviceId?: string; pairingCode?: string; mode?: string }>();
  const reconfigure = params.mode === "reconfigure";

  const [deviceId, setDeviceId] = useState(() => String(params.deviceId ?? ""));
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPass, setWifiPass] = useState("");
  const [pairing] = useState(() => String(params.pairingCode ?? "") || makePairingCode());
  const [stage, setStage] = useState<Stage>("idle");
  const [calibrated, setCalibrated] = useState(false);
  const [busy, setBusy] = useState(false);

  const suffix = deviceId.trim().toUpperCase().replace(/^ESP32-/, "");
  const expectedSsid = useMemo(
    () => (suffix.length === 6 ? `BINCOIN-SETUP-${suffix}` : null),
    [suffix]
  );

  const openWifiPicker = async () => {
    setStage("waiting");
    if (Platform.OS === "android") {
      try {
        await IntentLauncher.startActivityAsync("android.settings.panel.WIFI");
      } catch {
        await IntentLauncher.startActivityAsync("android.settings.WIFI_SETTINGS");
      }
    } else {
      Alert.alert(
        "Join the device network",
        `Open Settings → Wi-Fi and join ${expectedSsid ?? "BINCOIN-SETUP-******"}, then come back to this screen.`,
        [{ text: "OK" }]
      );
    }
  };

  const portalRequest = async (path: string, body?: string) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    try {
      const res = await fetch(`${PORTAL_BASE}${path}`, {
        method: body ? "POST" : "GET",
        headers: body ? { "Content-Type": "application/x-www-form-urlencoded" } : undefined,
        body,
        signal: ctrl.signal,
      });
      return res;
    } finally {
      clearTimeout(t);
    }
  };

  // Polls the captive portal; on success also pulls the real device ID from it.
  const waitForPortal = async (): Promise<boolean> => {
    for (let i = 0; i < 12; i++) {
      try {
        const res = await portalRequest("/");
        if (res.ok) {
          const html = await res.text();
          const match = html.match(/Device:\s*<b>(ESP32-[0-9A-F]+)<\/b>/i);
          if (match) setDeviceId(match[1].toUpperCase());
          return true;
        }
      } catch {
        // not on the device network yet
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    return false;
  };

  const checkConnection = async () => {
    setBusy(true);
    const ok = await waitForPortal();
    setBusy(false);
    setStage(ok ? "connected" : "failed");
  };

  const configure = async (action: "calibrate" | "save") => {
    setBusy(true);
    try {
      const reachable = stage === "connected" || (await waitForPortal());
      if (!reachable) {
        setStage("failed");
        return;
      }
      setStage("connected");
      if (action === "calibrate") {
        const res = await portalRequest("/calibrate", "");
        const ok = res.ok;
        setCalibrated(ok);
        Alert.alert(ok ? "Calibrated" : "Calibration failed", ok
          ? "The bin measured its empty height. Tap 'Send setup' to finish."
          : "The sensor couldn't get a clean reading — make sure the bin is empty and try again.");
        return;
      }
      const params = new URLSearchParams();
      params.set("ssid", wifiSsid.trim());
      params.set("pass", wifiPass);
      if (pairing.trim()) params.set("pair", pairing.trim());
      const res = await portalRequest("/save", params.toString());
      if (res.ok) setStage("sent");
      else Alert.alert("Setup failed", "The device didn't accept the configuration — try again.");
    } finally {
      setBusy(false);
    }
  };

  const finish = () => {
    if (reconfigure) return router.back();
    router.push({
      pathname: "/citizen/register-bin",
      params: { deviceId: deviceId.trim().toUpperCase(), pairingCode: pairing.trim() },
    });
  };

  const connected = stage === "connected" || stage === "sent";

  return (
    <ScrollView keyboardShouldPersistTaps="handled" className="flex-1 bg-background" contentContainerClassName="gap-4 p-4 pb-8">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center rounded-full border border-border bg-card">
          <ArrowLeft size={16} color="#8fa3b8" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-bold text-foreground">{reconfigure ? "Reconnect device" : "Set up device"}</Text>
          <Text className="text-muted-foreground">
            {reconfigure ? "Give the bin its new WiFi credentials" : "First-time pairing — no browser needed"}
          </Text>
        </View>
      </View>

      <Card className="border-sapphire-500/20">
        <CardContent className="gap-2 p-4">
          <View className="flex-row items-center gap-2">
            <Zap size={16} color="#0099FF" />
            <Text className="font-semibold text-foreground">How it works</Text>
          </View>
          <Text className="text-sm text-muted-foreground">
            The bin broadcasts its own WiFi network. Connect once, send your home WiFi, and the device configures
            itself and joins the cloud — all from this screen.
          </Text>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle>1 · Connect to the device</CardTitle>
          <CardDescription>Power on the bin — it broadcasts its own network</CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          <Button onPress={openWifiPicker} disabled={busy} variant="outline" className="border-sapphire-500/40">
            <Wifi size={16} color="#0099FF" />
            <Text className="text-sm font-semibold text-sapphire-500">
              {stage === "waiting" ? "Open WiFi picker again" : "Connect to device WiFi"}
            </Text>
          </Button>
          {Platform.OS === "android" && (stage === "waiting" || stage === "failed") ? (
            <Text className="text-xs text-muted-foreground">
              Pick the network starting with BINCOIN-SETUP. If Android warns about no internet, tap &quot;Keep
              connection&quot; — the device only needs local access.
            </Text>
          ) : null}

          <View className="gap-1.5">
            <Label>Device ID</Label>
            <View className="flex-row items-center gap-2">
              <View className="flex-1">
                <Input value={deviceId} editable={false} placeholder="Appears after connecting" className="opacity-70" />
              </View>
              {deviceId ? <CheckCircle2 size={18} color="#16a34a" /> : null}
            </View>
            <Text className="text-xs text-muted-foreground">Read from the device automatically — no typing.</Text>
          </View>

          {stage === "waiting" ? (
            <Button onPress={checkConnection} disabled={busy} variant="outline">
              {busy ? <Loader2 size={16} color="#0099FF" /> : <RefreshCw size={16} color="#0099FF" />}
              <Text className="text-sm font-semibold text-sapphire-500">{busy ? "Checking…" : "I'm connected — check"}</Text>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {stage === "failed" ? (
        <Card className="border-destructive/40">
          <CardContent className="gap-3 p-4">
            <View className="flex-row items-center gap-2">
              <WifiOff size={16} color="#e5484d" />
              <Text className="font-semibold text-foreground">Connection failed</Text>
            </View>
            <Text className="text-sm text-muted-foreground">
              Couldn&apos;t reach the device. Make sure the bin is powered on, you joined BINCOIN-SETUP, and you kept the
              connection when prompted.
            </Text>
            <View className="flex-row gap-2">
              <Button onPress={checkConnection} disabled={busy} className="flex-1 bg-sapphire-500">
                {busy ? <Loader2 size={16} color="#fff" /> : <RefreshCw size={16} color="#fff" />}
                <Text className="text-sm font-semibold text-white">Check connection</Text>
              </Button>
              <Button onPress={() => router.back()} variant="outline" className="flex-1">
                <Text className="text-sm font-semibold text-muted-foreground">Ignore</Text>
              </Button>
            </View>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle>2 · Home WiFi</CardTitle>
          <CardDescription>The network the bin will report through</CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          <View className="gap-1.5">
            <Label>Home WiFi name</Label>
            <Input value={wifiSsid} onChangeText={setWifiSsid} placeholder="Your WiFi network name" autoCorrect={false} />
          </View>
          <View className="gap-1.5">
            <Label>WiFi password</Label>
            <PasswordInput value={wifiPass} onChangeText={setWifiPass} placeholder="WiFi password" />
          </View>
          <View className="gap-1.5">
            <Label>Pairing code</Label>
            <View className="flex-row items-center gap-2">
              <View className="flex-1">
                <Input value={pairing} editable={false} className="opacity-70" />
              </View>
              <CheckCircle2 size={18} color="#16a34a" />
            </View>
            <Text className="text-xs text-muted-foreground">
              Generated automatically — it proves this physical device belongs to your bin.
            </Text>
          </View>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle>3 · Configure</CardTitle>
          <CardDescription>Runs only while connected to the device network</CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          {!reconfigure ? (
            <Button onPress={() => configure("calibrate")} disabled={busy || !connected} variant="outline" className="border-emerald-500/40">
              {busy ? <Loader2 size={16} color="#16a34a" /> : <CheckCircle2 size={16} color="#16a34a" />}
              <Text className="text-sm font-semibold text-emerald-600">
                {calibrated ? "Calibrated ✓" : "Calibrate — empty the bin first"}
              </Text>
            </Button>
          ) : null}
          <Button
            onPress={() => configure("save")}
            disabled={busy || !wifiSsid.trim()}
            size="lg"
            className="bg-sapphire-500"
          >
            {busy ? <Loader2 size={18} color="#ffffff" /> : <Zap size={18} color="#ffffff" />}
            <Text className="text-base font-semibold text-white">
              {stage === "sent" ? "Setup sent — device rebooting" : reconfigure ? "Update WiFi credentials" : "Send setup to device"}
            </Text>
          </Button>
        </CardContent>
      </Card>

      {stage === "sent" ? (
        <Button onPress={finish} size="lg" variant="outline" className="border-sapphire-500/40">
          <Text className="text-base font-semibold text-sapphire-500">
            {reconfigure ? "Done" : "Done — register the bin"}
          </Text>
        </Button>
      ) : null}
    </ScrollView>
  );
}
