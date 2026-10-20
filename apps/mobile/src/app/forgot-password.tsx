import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Mail, Loader2 as LoaderIcon, Info, AlertCircle, ArrowLeft } from "lucide-react-native";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { Button, IconInput, Label } from "@/components/ui";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim()) {
      setError("Please enter your account email.");
      return;
    }
    if (!isSupabaseConfigured) {
      setError("Supabase is not configured.");
      return;
    }
    setBusy(true);
    const sb = getSupabase()!;
    const { error: err } = await sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: "bincoin://reset-password",
    });
    setBusy(false);
    if (err) setError(err.message);
    else setSent(true);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-sapphire-950">
      <ScrollView contentContainerClassName="min-h-full justify-center px-5 py-10" keyboardShouldPersistTaps="handled">
        <View className="w-full rounded-2xl border border-sapphire-500/20 bg-card p-5">
          <View className="mb-5 items-center gap-3">
            <Image source={require("../../assets/images/logo.jpg")} className="h-14 w-14 rounded-xl" />
            <View className="items-center">
              <Text className="text-xl font-bold text-foreground">Reset your password</Text>
              <Text className="mt-1 text-center text-sm text-muted-foreground">
                Enter your account email and we&apos;ll send you a reset link.
              </Text>
            </View>
          </View>

          {sent ? (
            <View className="gap-4">
              <View className="flex-row gap-2 rounded-lg border border-sapphire-500/30 bg-sapphire-500/10 p-3">
                <Info size={16} color="#0099FF" />
                <Text className="flex-1 text-sm text-foreground">
                  Reset link sent to <Text className="font-semibold">{email}</Text>. Check your inbox —
                  the link opens the password reset screen.
                </Text>
              </View>
              <Button variant="outline" onPress={() => router.replace("/login")}>
                <ArrowLeft size={16} color="#8fa3b8" />
                <Text className="text-sm font-medium text-foreground">Back to Sign In</Text>
              </Button>
            </View>
          ) : (
            <View className="gap-4">
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

              {error && (
                <View className="flex-row gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5">
                  <AlertCircle size={16} color="#dc2626" />
                  <Text className="flex-1 text-sm text-destructive">{error}</Text>
                </View>
              )}

              <Button onPress={handleSubmit} disabled={busy} size="lg" className="bg-sapphire-500">
                {busy ? <LoaderIcon size={18} color="#ffffff" /> : <Mail size={18} color="#ffffff" />}
                <Text className="text-base font-semibold text-white">
                  {busy ? "Sending…" : "Send Reset Link"}
                </Text>
              </Button>

              <Pressable onPress={() => router.replace("/login")} className="self-center">
                <View className="flex-row items-center gap-1">
                  <ArrowLeft size={14} color="#8fa3b8" />
                  <Text className="text-sm text-muted-foreground">Back to Sign In</Text>
                </View>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
