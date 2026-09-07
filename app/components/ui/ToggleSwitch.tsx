import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ToggleSwitchProps {
  readonly value: boolean;
  readonly onValueChange: (value: boolean) => void;
  readonly disabled?: boolean;
}

export function ToggleSwitch({ value, onValueChange, disabled }: ToggleSwitchProps) {
  return (
    <TouchableOpacity
      style={[styles.track, value ? styles.trackOn : styles.trackOff, disabled && styles.disabled]}
      onPress={() => onValueChange(!value)}
      activeOpacity={0.8}
      disabled={disabled}
    >
      {value ? (
        <>
          <Text style={styles.labelOn}>ON</Text>
          <View style={styles.knob} />
        </>
      ) : (
        <>
          <View style={styles.knob} />
          <Text style={styles.labelOff}>OFF</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 58,
    height: 30,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 7,
  },
  trackOn: {
    backgroundColor: "#FACC15",
  },
  trackOff: {
    backgroundColor: "#2a2a2a",
  },
  disabled: {
    opacity: 0.5,
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
  },
  labelOn: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#111111",
  },
  labelOff: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#888888",
  },
});
