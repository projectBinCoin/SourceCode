import { useEffect, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, useColorScheme, View } from "react-native";
import { router } from "expo-router";
import { Mail, Lock, Sparkles, ShieldCheck, Loader2 as LoaderIcon, Info, User as UserIcon, Truck } from "lucide-react-native";
import { useAuthStore } from "@/lib/store/auth-store";
import { getDashboardRoute } from "@/lib/access";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Button, IconInput, Input, Label, PasswordInput } from "@/components/ui";

type Mode = "signin" | "signup";

export default function Login() {
  const dark = useColorScheme() === "dark";
  const { status, user, signIn, signUp } = useAuthStore();

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"citizen" | "collector">("citizen");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Navigate only from effects — never during render.
  useEffect(() => {
    if (status === "authed" && user) {
      router.replace(getDashboardRoute(user));
    }
  }, [status, user]);

  const handleSubmit = async () => {
    setError(null);
    setNotice(null);
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    setBusy(true);
    if (mode === "signin") {
      const err = await signIn(email.trim(), password);
      setBusy(false);
      if (err) setError(err);
      // Navigation is driven by the auth-state effect above.
    } else {
      const res = await signUp({ name: name.trim(), email: email.trim(), password, role });
      setBusy(false);
      if (res.error) setError(res.error);
      else if (res.needsConfirmation) {
        setNotice("Account created! Confirm your email, then sign in.");
      }
      // Signed-in users are routed by the auth-state effect above.
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-sapphire-950">
      <ScrollView contentContainerClassName="min-h-full justify-center px-5 py-10" keyboardShouldPersistTaps="handled">
        {!isSupabaseConfigured && (
          <View className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3">
            <Text className="text-sm font-semibold text-destructive">Supabase is not configured</Text>
            <Text className="mt-1 text-xs text-destructive/80">
              The EXPO_PUBLIC_SUPABASE_URL / ANON_KEY variables are missing. Run the app from
              apps/mobile (where the .env file lives) or rebuild with the env set.
            </Text>
          </View>
        )}
        <View className="items-center gap-3 pb-6">
          <Image source={require("../../assets/images/logo.jpg")} className="h-20 w-20 rounded-2xl" />
          <View className="items-center">
            <Text className="text-3xl font-bold text-white">Bincoin</Text>
            <View className="mt-1 flex-row items-center gap-1.5">
              <Sparkles size={14} color="#0099FF" />
              <Text className="text-sm font-medium text-sapphire-500">Smart Waste Management System</Text>
            </View>
          </View>
        </View>

        <View className="w-full rounded-2xl border border-sapphire-500/20 bg-card p-5">
          <View className="mb-5 flex-row rounded-xl bg-muted p-1">
            {(["signin", "signup"] as Mode[]).map((m) => (
              <Pressable
                key={m}
                onPress={() => {
                  setMode(m);
                  setError(null);
                  setNotice(null);
                }}
                className="flex-1 rounded-lg py-2"
                style={mode === m ? { backgroundColor: dark ? "#0b1d3a" : "#ffffff", elevation: 2 } : undefined}
              >
                <Text className={`text-center text-sm font-medium ${mode === m ? "text-foreground" : "text-muted-foreground"}`}>
                  {m === "signin" ? "Sign In" : "Create Account"}
                </Text>
              </Pressable>
            ))}
          </View>

          <View className="gap-4">
            {mode === "signup" && (
              <View className="gap-2">
                <Label>Full Name</Label>
                <Input value={name} onChangeText={setName} placeholder="e.g., Husni Mohamad" autoCapitalize="words" />
              </View>
            )}

            <View className="gap-2">
              <Label>Email</Label>
              <IconInput
                icon={<Mail size={16} color="#8fa3b8" />}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View className="gap-2">
              <Label>Password</Label>
              <PasswordInput
                icon={<Lock size={16} color="#8fa3b8" />}
                value={password}
                onChangeText={setPassword}
                placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
              />
            </View>

            {mode === "signup" && (
              <View className="gap-2">
                <Label>I am joining as</Label>
                <View className="flex-row gap-2">
                  {(
                    [
                      { key: "citizen", label: "Citizen", sub: "Household user", Icon: UserIcon },
                      { key: "collector", label: "Collector", sub: "Needs approval", Icon: Truck },
                    ] as const
                  ).map(({ key, label, sub, Icon }) => (
                    <Pressable
                      key={key}
                      onPress={() => setRole(key)}
                      className={`flex-1 flex-row items-center gap-2 rounded-xl border-2 p-3 ${
                        role === key ? "border-sapphire-500 bg-sapphire-500/10" : "border-border"
                      }`}
                    >
                      <Icon size={20} color={role === key ? "#0099FF" : "#8fa3b8"} />
                      <View>
                        <Text className="text-sm font-medium text-foreground">{label}</Text>
                        <Text className="text-xs text-muted-foreground">{sub}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {error && (
              <Text className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">
                {error}
              </Text>
            )}
            {notice && (
              <View className="flex-row gap-2 rounded-lg border border-sapphire-500/30 bg-sapphire-500/10 p-2.5">
                <Info size={16} color="#0099FF" />
                <Text className="flex-1 text-sm text-foreground">{notice}</Text>
              </View>
            )}

            <Button onPress={handleSubmit} disabled={busy} size="lg" className="bg-sapphire-500">
              {busy ? (
                <LoaderIcon size={18} color="#ffffff" />
              ) : mode === "signin" ? (
                <ShieldCheck size={18} color="#ffffff" />
              ) : (
                <Sparkles size={18} color="#ffffff" />
              )}
              <Text className="text-base font-semibold text-white">
                {busy ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
              </Text>
            </Button>
          </View>

          <Pressable onPress={() => router.push("/forgot-password")} className="mt-4 self-end">
            <Text className="text-xs font-medium text-sapphire-500">Forgot password?</Text>
          </Pressable>
        </View>

        <Text className="mt-5 text-center text-xs text-sapphire-300/70">
          {mode === "signin"
            ? "New to Bincoin? Switch to Create Account above."
            : "Collector accounts become active once an admin approves them."}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
