import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { router } from "expo-router";
import { KeyRound, LogOut } from "lucide-react-native";
import { getSupabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store/auth-store";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Label, PasswordInput } from "@/components/ui";

export function AccountSection() {
  const signOut = useAuthStore((s) => s.signOut);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [busy, setBusy] = useState(false);

  const changePassword = async () => {
    if (newPw.length < 8) return Alert.alert("Change Password", "Password must be at least 8 characters");
    if (newPw !== confirmPw) return Alert.alert("Change Password", "Passwords do not match");
    const sb = getSupabase();
    if (!sb) return Alert.alert("Change Password", "Supabase is not configured");
    setBusy(true);
    const { error } = await sb.auth.updateUser({ password: newPw });
    setBusy(false);
    if (error) Alert.alert("Change Password", error.message);
    else {
      setNewPw("");
      setConfirmPw("");
      Alert.alert("Change Password", "Password updated successfully");
    }
  };

  const doSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 p-4 pb-2">
        <KeyRound size={18} color="#0099FF" />
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardContent className="gap-3">
        <View className="gap-1.5">
          <Label>New Password</Label>
          <PasswordInput value={newPw} onChangeText={setNewPw} placeholder="At least 8 characters" />
        </View>
        <View className="gap-1.5">
          <Label>Confirm Password</Label>
          <PasswordInput value={confirmPw} onChangeText={setConfirmPw} placeholder="Repeat the password" />
        </View>
        <Button onPress={changePassword} disabled={busy} variant="outline" className="border-sapphire-500/40">
          <KeyRound size={16} color="#0099FF" />
          <Text className="text-sm font-semibold text-sapphire-500">{busy ? "Updating…" : "Change Password"}</Text>
        </Button>
        <View className="mt-1 border-t border-border pt-3">
          <Button onPress={doSignOut} variant="outline" className="border-destructive/40">
            <LogOut size={16} color="#e5484d" />
            <Text className="text-sm font-semibold text-destructive">Sign Out</Text>
          </Button>
        </View>
        <CardDescription className="text-center">Bincoin • Smart Waste Management</CardDescription>
      </CardContent>
    </Card>
  );
}
