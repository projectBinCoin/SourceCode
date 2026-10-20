import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import { Map, History, User } from "lucide-react-native";

export default function CollectorTabsLayout() {
  const scheme = useColorScheme();
  const dark = scheme === "dark";
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      detachInactiveScreens
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0099FF",
        tabBarInactiveTintColor: dark ? "#8fa3b8" : "#5b6b7f",
        tabBarStyle: {
          backgroundColor: dark ? "#0b1d3a" : "#ffffff",
          borderTopColor: dark ? "#1e3a5f" : "#dce4ec",
          height: 60 + insets.bottom,
          paddingBottom: 6 + insets.bottom,
          paddingTop: 6,
        },
        freezeOnBlur: true,
        sceneStyle: { paddingTop: insets.top },
        lazy: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Map", tabBarIcon: ({ color }) => <Map size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: "History", tabBarIcon: ({ color }) => <History size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color }) => <User size={22} color={color} /> }}
      />
    </Tabs>
  );
}
