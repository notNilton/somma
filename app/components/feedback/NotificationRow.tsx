import type { ComponentType } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ToggleSwitch } from "@/components/ToggleSwitch";

type IconComponent = ComponentType<{ width?: number; height?: number; color?: string }>;

interface NotificationRowProps {
  readonly icon: IconComponent;
  readonly label: string;
  readonly value: boolean;
  readonly onValueChange: (value: boolean) => void;
  readonly disabled?: boolean;
}

export function NotificationRow({ icon: Icon, label, value, onValueChange, disabled }: NotificationRowProps) {
  return (
    <View style={styles.row}>
      <Icon width={20} height={20} color="#888888" />
      <Text style={styles.label}>{label}</Text>
      <ToggleSwitch value={value} onValueChange={onValueChange} disabled={disabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#FFFFFF",
  },
});
