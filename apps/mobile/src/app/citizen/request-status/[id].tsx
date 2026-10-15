import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Check, Clock, Truck, ArrowLeft, MapPin, Trash2, Calendar } from "lucide-react-native";
import { useRequest, useBins, useCollectors } from "@/lib/hooks/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from "@/components/ui";
import { WASTAGE_META } from "@/lib/constants";

export default function RequestStatus() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: request } = useRequest(id);
  const { data: bins = [] } = useBins();
  const { data: collectors = [] } = useCollectors();

  const bin = request ? bins.find((b) => b.id === request.binId) : undefined;
  const collector = request?.collectorId
    ? collectors.find((c) => c.id === request.collectorId)
    : undefined;

  if (!request) {
    return (
      <ScrollView keyboardShouldPersistTaps="handled" className="flex-1 bg-background" contentContainerClassName="p-4">
        <Pressable onPress={() => router.back()} className="mb-4 flex-row items-center gap-1">
          <ArrowLeft size={16} color="#8fa3b8" />
          <Text className="text-sm text-muted-foreground">Back</Text>
        </Pressable>
        <View className="items-center gap-4 py-20">
          <Text className="text-muted-foreground">Request not found.</Text>
          <Button variant="outline" onPress={() => router.replace("/citizen/dashboard")}>
            <Text className="text-sm font-medium text-foreground">Back to Dashboard</Text>
          </Button>
        </View>
      </ScrollView>
    );
  }

  const steps = [
    {
      label: "Pending Nearby Collectors",
      Icon: Clock,
      done: request.status === "claimed" || request.status === "collected",
      active: request.status === "pending",
    },
    {
      label: `Claimed by Driver${collector ? ` ${collector.name}` : ""}`,
      Icon: Truck,
      done: request.status === "collected",
      active: request.status === "claimed",
    },
    {
      label: "Collected & Points Awarded",
      Icon: Check,
      done: request.status === "collected",
      active: false,
    },
  ];

  return (
    <ScrollView keyboardShouldPersistTaps="handled" className="flex-1 bg-background" contentContainerClassName="p-4 pb-8">
      <Pressable onPress={() => router.back()} className="mb-4 flex-row items-center gap-1">
        <ArrowLeft size={16} color="#8fa3b8" />
        <Text className="text-sm text-muted-foreground">Back to Dashboard</Text>
      </Pressable>

      <Text className="text-2xl font-bold text-foreground">Request Status</Text>
      <Text className="mb-4 text-muted-foreground">Track your pickup request in real-time.</Text>

      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent className="gap-2">
          {bin && (
            <View className="flex-row items-center gap-2">
              <MapPin size={16} color="#8fa3b8" />
              <Text className="text-sm font-medium text-foreground">{bin.label}</Text>
              <Text className="flex-1 text-sm text-muted-foreground">— {bin.address}</Text>
            </View>
          )}
          <View className="flex-row items-center gap-2">
            <Trash2 size={16} color="#8fa3b8" />
            <Text className="text-sm text-foreground">
              {WASTAGE_META[request.wastageType].icon} {request.wastageType}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Calendar size={16} color="#8fa3b8" />
            <Text className="text-sm text-foreground">{request.preferredSlot}</Text>
          </View>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Progress</CardTitle>
          <CardDescription>Live status of your pickup request</CardDescription>
        </CardHeader>
        <CardContent className="gap-0">
          {steps.map((step, i) => (
            <View key={i} className="flex-row gap-4">
              <View className="items-center">
                <View
                  className={`h-10 w-10 items-center justify-center rounded-full border-2 ${
                    step.done
                      ? "border-primary bg-primary"
                      : step.active
                        ? "border-primary"
                        : "border-border"
                  }`}
                >
                  {step.done ? (
                    <Check size={20} color="#0099FF" />
                  ) : (
                    <step.Icon size={20} color={step.active ? "#0099FF" : "#8fa3b8"} />
                  )}
                </View>
                {i < steps.length - 1 && <View className={`h-12 w-0.5 ${step.done ? "bg-primary" : "bg-border"}`} />}
              </View>
              <View className="pt-1.5">
                <Text className={`font-medium ${step.done || step.active ? "text-foreground" : "text-muted-foreground"}`}>
                  {step.label}
                </Text>
                {step.active && (
                  <View className="mt-1 self-start rounded-full border border-border px-2 py-0.5">
                    <Text className="text-xs text-sapphire-500">In Progress</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </CardContent>
      </Card>

      {request.status === "pending" && (
        <Card className="mt-4 border-sapphire-500/20">
          <CardContent className="p-4">
            <Text className="text-sm text-muted-foreground">
              Your request is visible to nearby collectors and will be claimed soon. You&apos;ll see live
              updates on this screen.
            </Text>
          </CardContent>
        </Card>
      )}

      {request.status === "claimed" && collector && (
        <Card className="mt-4 border-sapphire-500/20">
          <CardContent className="p-4">
            <Text className="text-sm text-foreground">
              <Text className="font-semibold">{collector.name}</Text> has claimed your request and is on the way!
            </Text>
          </CardContent>
        </Card>
      )}

      {request.status === "collected" && (
        <Card className="mt-4 border-green-500/20">
          <CardContent className="items-center p-4">
            <View className="mb-2 h-12 w-12 items-center justify-center rounded-full bg-green-500">
              <Check size={24} color="#ffffff" />
            </View>
            <Text className="font-medium text-foreground">Pickup Completed!</Text>
            {request.pointsAwarded !== undefined && (
              <Text className="mt-1 text-2xl font-bold text-sapphire-500">+{Math.round(request.pointsAwarded)} points</Text>
            )}
            <Button onPress={() => router.replace("/citizen/wallet")} className="mt-3 bg-sapphire-500">
              <Text className="text-sm font-semibold text-white">View Wallet</Text>
            </Button>
          </CardContent>
        </Card>
      )}
    </ScrollView>
  );
}
