import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { LogOut } from "lucide-react-native";
import { Badge } from "@/components/ui";
import { useAuthStore } from "@/lib/store/auth-store";

type Props = {
  name: string;
  email: string;
  role: string;
  extra?: string;
};

const roleColors: Record<string, string> = {
  citizen: "bg-sapphire-500",
  collector: "bg-emerald-500",
  admin: "bg-violet-500",
};

export function ProfileHeader({ name, email, role, extra }: Props) {
  const signOut = useAuthStore((s) => s.signOut);
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <View className="items-center gap-2 rounded-2xl border border-border bg-card p-6">
      <Pressable
        onPress={async () => {
          await signOut();
          router.replace("/login");
        }}
        accessibilityLabel="Sign out"
        className="absolute right-4 top-4 h-9 w-9 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10"
      >
        <LogOut size={16} color="#e5484d" />
      </Pressable>
      <View className={`h-20 w-20 items-center justify-center rounded-full ${roleColors[role] ?? "bg-sapphire-500"}`}>
        <Text className="text-2xl font-bold text-white">{initials || "?"}</Text>
      </View>
      <Text className="text-xl font-bold text-foreground">{name}</Text>
      <Text className="text-sm text-muted-foreground">{email}</Text>
      <View className="flex-row items-center gap-2">
        <Badge className="border-sapphire-500/40">
          <Text className="text-xs font-semibold capitalize text-sapphire-500">{role}</Text>
        </Badge>
        {extra ? (
          <Badge>
            <Text className="text-xs font-medium text-muted-foreground">{extra}</Text>
          </Badge>
        ) : null}
      </View>
    </View>
  );
}
