import { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import * as IntentLauncher from "expo-intent-launcher";
import { ArrowLeft, CheckCircle2, Loader2, Wifi, Wrench, Zap } from "lucide-react-native";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, IconInput, Input, Label, PasswordInput } from "@/components/ui";

const PORTAL_BASE = "http://192.168.4.1";

type Stage = "idle" | "waiting" | "connected" | "sent" | "failed";

export default function ProvisionDevice() {
  const [deviceId, setDeviceId] = useState("");
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPass, setWifiPass] = useState("");
  const [pairing, setPairing] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [calibrated, setCalibrated] = useState(false);
  const [busy, setBusy] = useState(false);

  const suffix = deviceId.trim().toUpperCase().replace(/^ESP32-/, "");
  const expectedSsid = suffix.length === 6 ? `BINCOIN-SETUP-${suffix}` : null;

  const openWifiPicker = async () => {
    if (Platform.OS === "android") {
      try {
        await IntentLauncher.startActivityAsync("android.settings.panel.WIFI");
      } catch {
        await IntentLauncher.startActivityAsync("android.settings.WIFI_SETTINGS");
      }
      setStage("waiting");
    } else {
      Alert.alert(
        "Join the device network",
        `Open Settings → Wi-Fi and join ${expectedSsid ?? "BINCOIN-SETUP-******"}, then come back to this screen.`,
        [{ text: "I'm connected", onPress: () => setStage("waiting") }]
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
      return res.ok;
    } finally {
      clearTimeout(t);
    }
  };

  const waitForPortal = async (): Promise<boolean> => {
    for (let i = 0; i < 12; i++) {
      try {
        if (await portalRequest("/")) return true;
      } catch {
        // not on the device network yet
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    return false;
  };

  const configure = async (action: "calibrate" | "save") => {
    if (!expectedSsid) return;
    setBusy(true);
    try {
      const reachable = stage === "connected" || (await waitForPortal());
      if (!reachable) {
        setStage("failed");
        Alert.alert("Device not reachable", `Join ${expectedSsid} first — if Android asks about "no internet", choose "Keep connection".`);
        return;
      }
      setStage("connected");
      if (action === "calibrate") {
        const ok = await portalRequest("/calibrate", "");
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
      const ok = await portalRequest("/save", params.toString());
      if (ok) {
        setStage("sent");
      } else {
        Alert.alert("Setup failed", "The device didn't accept the configuration — try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const finish = () => {
    router.push({
      pathname: "/citizen/register-bin",
      params: { deviceId: deviceId.trim().toUpperCase(), pairingCode: pairing.trim() },
    });
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" className="flex-1 bg-background" contentContainerClassName="gap-4 p-4 pb-8">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center rounded-full border border-border bg-card">
          <ArrowLeft size={16} color="#8fa3b8" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-bold text-foreground">Set up device</Text>
          <Text className="text-muted-foreground">First-time pairing — no browser needed</Text>
        </View>
      </View>

      <Card className="border-sapphire-500/20">
        <CardContent className="gap-3 p-4">
          <View className="flex-row items-center gap-2">
            <Zap size={16} color="#0099FF" />
            <Text className="font-semibold text-foreground">How it works</Text>
          </View>
          <Text className="text-sm text-muted-foreground">
            The bin broadcasts its own WiFi network. Connect once, send your home WiFi + pairing code, and the device
            configures itself and joins the cloud — all from this screen.
          </Text>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle>1 · Device</CardTitle>
          <CardDescription>From the sticker, or the BINCOIN-SETUP network name</CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          <View className="gap-1.5">
            <Label>ESP32 Device ID</Label>
            <Input
              value={deviceId}
              onChangeText={setDeviceId}
              placeholder="ESP32-XXXXXX"
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
          {expectedSsid ? (
            <Text className="text-xs text-muted-foreground">Expected network: <Text className="font-semibold text-foreground">{expectedSsid}</Text></Text>
          ) : null}
          <Button onPress={openWifiPicker} disabled={!expectedSsid} variant="outline" className="border-sapphire-500/40">
            <Wifi size={16} color="#0099FF" />
            <Text className="text-sm font-semibold text-sapphire-500">
              {stage === "waiting" || stage === "connected" ? "Open WiFi picker again" : "Connect to device WiFi"}
            </Text>
          </Button>
          {Platform.OS === "android" && stage === "waiting" ? (
            <Text className="text-xs text-muted-foreground">
              Pick {expectedSsid}. If Android warns about no internet, tap &quot;Keep connection&quot; — the device only needs local access.
            </Text>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle>2 · Home WiFi + pairing</CardTitle>
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
            <IconInput
              icon={<Wrench size={16} color="#8fa3b8" />}
              value={pairing}
              onChangeText={setPairing}
              placeholder="Same code you will register in the app"
              autoCapitalize="characters"
            />
          </View>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle>3 · Configure</CardTitle>
          <CardDescription>Runs only while connected to the device network</CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          <Button onPress={() => configure("calibrate")} disabled={busy || !expectedSsid} variant="outline" className="border-emerald-500/40">
            {busy ? <Loader2 size={16} color="#16a34a" /> : <CheckCircle2 size={16} color="#16a34a" />}
            <Text className="text-sm font-semibold text-emerald-600">
              {calibrated ? "Calibrated ✓" : "Calibrate — empty the bin first"}
            </Text>
          </Button>
          <Button
            onPress={() => configure("save")}
            disabled={busy || !expectedSsid || !wifiSsid.trim()}
            size="lg"
            className="bg-sapphire-500"
          >
            {busy ? <Loader2 size={18} color="#ffffff" /> : <Zap size={18} color="#ffffff" />}
            <Text className="text-base font-semibold text-white">{stage === "sent" ? "Setup sent — device rebooting" : "Send setup to device"}</Text>
          </Button>
          {stage === "failed" ? (
            <Text className="text-xs text-destructive">Couldn&apos;t reach the device — make sure you&apos;re on {expectedSsid} and tap again.</Text>
          ) : null}
        </CardContent>
      </Card>

      {stage === "sent" ? (
        <Button onPress={finish} size="lg" variant="outline" className="border-sapphire-500/40">
          <Text className="text-base font-semibold text-sapphire-500">Done — register the bin</Text>
        </Button>
      ) : null}
    </ScrollView>
  );
}
