import { Stack } from "expo-router";
import { PortalGuard } from "@/components/portal-guard";

export default function AdminSegmentLayout() {
  return (
    <PortalGuard allow={["admin"]}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="edit-bin/[id]" />
      </Stack>
    </PortalGuard>
  );
}
