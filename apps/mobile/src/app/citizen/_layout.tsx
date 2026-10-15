import { Stack } from "expo-router";
import { PortalGuard } from "@/components/portal-guard";

export default function CitizenSegmentLayout() {
  return (
    <PortalGuard allow={["citizen"]}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="request-status/[id]" />
      </Stack>
    </PortalGuard>
  );
}
