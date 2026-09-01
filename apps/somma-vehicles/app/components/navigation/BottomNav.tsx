import { usePathname, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const TABS = [
  { label: "Início", iconName: "home-outline", activeIcon: "home", route: "/home" },
  { label: "Garagem", iconName: "car-outline", activeIcon: "car", route: "/wallet" },
  { label: "Métricas", iconName: "stats-chart-outline", activeIcon: "stats-chart", route: "/metrics" },
  { label: "Perfil", iconName: "person-outline", activeIcon: "person", route: "/profile" },
] as const;

export function BottomNav() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.bar}>
        {TABS.map(({ label, iconName, activeIcon, route }) => {
          const active = pathname === route;
          return (
            <TouchableOpacity
              key={route}
              style={styles.tab}
              onPress={() => router.push(route as any)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={active ? (activeIcon as any) : (iconName as any)}
                size={22}
                color={active ? "#3B82F6" : "#64748B"}
              />
              <Text style={[styles.label, active && styles.labelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0B132B",
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
  },
  bar: {
    height: 60,
    flexDirection: "row",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  label: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  labelActive: {
    color: "#3B82F6",
    fontWeight: "700",
  },
});
