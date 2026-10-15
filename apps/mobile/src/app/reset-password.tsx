import { useEffect, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Lock, Loader2 as LoaderIcon, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react-native";
import { useAuthStore } from "@/lib/store/auth-store";
import { getSupabase } from "@/lib/supabase";
import { getDashboardRoute } from "@/lib/access";
import { Button, Label, PasswordInput } from "@/components/ui";

export default function ResetPassword() {
  const { status, user } = useAuthStore();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "authed" && done) {
      const t = setTimeout(() => {
        router.replace(user ? getDashboardRoute(user) : "/login");
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [status, user, done]);

  const handleSubmit = async () => {
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const sb = getSupabase();
    const { error: err } = sb
      ? await sb.auth.updateUser({ password })
      : { error: { message: "Supabase is not configured." } };
    setBusy(false);
    if (err) setError(err.message);
    else setDone(true);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-sapphire-950">
      <ScrollView contentContainerClassName="min-h-full justify-center px-5 py-10" keyboardShouldPersistTaps="handled">
        <View className="w-full rounded-2xl border border-sapphire-500/20 bg-card p-5">
          <View className="mb-5 items-center gap-3">
            <Image source={require("../../assets/images/logo.jpg")} className="h-14 w-14 rounded-xl" />
            <Text className="text-xl font-bold text-foreground">Set a new password</Text>
          </View>

          {status === "loading" && (
            <View className="items-center gap-3 py-8">
              <LoaderIcon size={24} color="#8fa3b8" />
              <Text className="text-sm text-muted-foreground">Verifying reset link…</Text>
            </View>
          )}

          {status === "anon" && (
            <View className="gap-4">
              <View className="flex-row gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                <AlertCircle size={16} color="#dc2626" />
                <Text className="flex-1 text-sm text-destructive">
                  This reset link is invalid or has expired. Request a new one.
                </Text>
              </View>
              <Button onPress={() => router.replace("/forgot-password")}>
                <Text className="text-sm font-semibold text-white">Request New Link</Text>
              </Button>
              <Pressable onPress={() => router.replace("/login")} className="self-center">
                <View className="flex-row items-center gap-1">
                  <ArrowLeft size={14} color="#8fa3b8" />
                  <Text className="text-sm text-muted-foreground">Back to Sign In</Text>
                </View>
              </Pressable>
            </View>
          )}

          {status === "authed" && !done && (
            <View className="gap-4">
              <View className="gap-2">
                <Label>New Password</Label>
                <PasswordInput
                  icon={<Lock size={16} color="#8fa3b8" />}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                />
              </View>
              <View className="gap-2">
                <Label>Confirm New Password</Label>
                <PasswordInput
                  icon={<Lock size={16} color="#8fa3b8" />}
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Repeat the new password"
                />
              </View>

              {error && (
                <View className="flex-row gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5">
                  <AlertCircle size={16} color="#dc2626" />
                  <Text className="flex-1 text-sm text-destructive">{error}</Text>
                </View>
              )}

              <Button onPress={handleSubmit} disabled={busy} size="lg" className="bg-sapphire-500">
                {busy ? <LoaderIcon size={18} color="#ffffff" /> : <CheckCircle2 size={18} color="#ffffff" />}
                <Text className="text-base font-semibold text-white">
                  {busy ? "Updating…" : "Update Password"}
                </Text>
              </Button>
            </View>
          )}

          {status === "authed" && done && (
            <View className="items-center gap-3 py-6">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-green-500">
                <CheckCircle2 size={24} color="#ffffff" />
              </View>
              <Text className="text-sm text-muted-foreground">
                Password updated! Redirecting you to your dashboard…
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
