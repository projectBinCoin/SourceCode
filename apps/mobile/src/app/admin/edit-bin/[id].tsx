import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useBins } from "@/lib/hooks/queries";
import { Button } from "@/components/ui";
import { EditBinForm } from "@/components/edit-bin-form";

export default function AdminEditBinScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: bins = [] } = useBins();
  const bin = bins.find((b) => b.id === id);

  if (!bin) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
        <Text className="text-muted-foreground">Bin not found.</Text>
        <Button variant="outline" onPress={() => router.back()}>
          <Text className="text-sm font-medium text-foreground">Go back</Text>
        </Button>
      </View>
    );
  }
  // Keyed so the form state re-seeds if the route id changes.
  return <EditBinForm key={bin.id} bin={bin} mode="admin" />;
}
