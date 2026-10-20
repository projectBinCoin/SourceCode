import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Clock, CheckCircle2, Truck, RefreshCw, LogOut } from "lucide-react-native";
import { useAuthStore } from "@/lib/store/auth-store";

export default function PendingApproval() {
  const user = useAuthStore((s) => s.user);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const signOut = useAuthStore((s) => s.signOut);

  const handleLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <View className="flex-1 bg-sapphire-950">
      <ScrollView contentContainerClassName="flex-grow justify-center p-5">
        <View className="rounded-2xl border border-sapphire-500/20 bg-card p-5">
          <View className="items-center gap-4">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-sapphire-800">
              <Clock size={32} color="#ffffff" />
            </View>
            <View className="items-center">
              <Text className="text-center text-xl font-semibold text-foreground">
                Account Pending Admin Approval
              </Text>
              <Text className="mt-1 text-center text-sm text-muted-foreground">
                Welcome, {user?.name}! Your collector account is awaiting approval from the system administrator.
              </Text>
            </View>
          </View>

          <View className="mt-5 gap-2 rounded-xl border border-sapphire-500/10 bg-sapphire-500/5 p-4">
            <View className="flex-row items-center gap-2">
              <CheckCircle2 size={16} color="#0099FF" />
              <Text className="text-sm text-foreground">Registration complete</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Clock size={16} color="#f59e0b" />
              <Text className="text-sm text-foreground">Awaiting admin review</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Truck size={16} color="#8fa3b8" />
              <Text className="text-sm text-muted-foreground">Ready to collect once approved</Text>
            </View>
          </View>

          <View className="mt-4 flex-row gap-2">
            <Button_ onPress={() => void refreshProfile()} label="Refresh Status" Icon={RefreshCw} />
            <Button_ onPress={() => void handleLogout()} label="Logout" Icon={LogOut} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Button_({ onPress, label, Icon }: { onPress: () => void; label: string; Icon: typeof Clock }) {
  return (
    <Pressable onPress={onPress} className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border py-3 active:bg-muted">
      <Icon size={16} color="#8fa3b8" />
      <Text className="text-sm font-medium text-foreground">{label}</Text>
    </Pressable>
  );
}
