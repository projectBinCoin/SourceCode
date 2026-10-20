import { Stack } from "expo-router";
import { PortalGuard } from "@/components/portal-guard";

export default function CollectorSegmentLayout() {
  return (
    <PortalGuard allow={["collector"]}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="active-job/[id]" />
        <Stack.Screen name="pending-approval" />
      </Stack>
    </PortalGuard>
  );
}
