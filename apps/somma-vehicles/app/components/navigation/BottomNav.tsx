import { usePathname, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HomeIcon from "@/assets/icons/home.svg";
import MetricsIcon from "@/assets/icons/metrics.svg";

const TABS = [
  { label: "Home", icon: HomeIcon, route: "/home" },
  { label: "Relatórios", icon: MetricsIcon, route: "/metrics" },
] as const;

interface BottomNavProps {
  readonly activeIndex?: number;
  readonly onPageChange?: (index: number) => void;
}

export function BottomNav({ activeIndex, onPageChange }: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const isPagerMode = activeIndex !== undefined && onPageChange !== undefined;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.bar}>
        {TABS.map(({ label, icon: Icon, route }, index) => {
          const active = isPagerMode
            ? activeIndex === index
            : pathname === route;
          return (
            <TouchableOpacity
              key={route}
              style={styles.tab}
              onPress={() =>
                isPagerMode ? onPageChange(index) : router.push(route as any)
              }
              activeOpacity={0.7}
            >
              <Icon
                width={22}
                height={22}
                color={active ? "#FACC15" : "#888888"}
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
    backgroundColor: "#000000",
    borderTopWidth: 1,
    borderTopColor: "#2a2a2a",
  },
  bar: {
    height: 64,
    flexDirection: "row",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  label: {
    fontSize: 10,
    color: "#888888",
    fontFamily: "Inter_400Regular",
  },
  labelActive: {
    color: "#FACC15",
  },
});
