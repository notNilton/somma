import React, { useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export interface DropdownInputProps {
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly string[];
  errorMessage?: string;
}

export function DropdownInput({
  placeholder,
  value,
  onValueChange,
  options,
  errorMessage,
}: DropdownInputProps) {
  const [open, setOpen] = useState(false);
  const animatedValue = useRef(
    new Animated.Value(value ? 1 : 0),
  ).current;

  const handleOpen = () => {
    setOpen((prev) => !prev);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const handleSelect = (option: string) => {
    onValueChange(option);
    setOpen(false);
  };

  const handleClear = () => {
    onValueChange("");
    setOpen(false);
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const labelTop = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [14, -10],
  });

  const labelFontSize = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 12],
  });

  const labelColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["#ffffff80", open ? "#FACC15" : "#ffffff"],
  });

  return (
    <View style={styles.wrapper}>
      <Animated.Text
        style={[
          styles.label,
          { top: labelTop, fontSize: labelFontSize, color: labelColor },
        ]}
      >
        {placeholder}
      </Animated.Text>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleOpen}
        style={[styles.inputRow, open && styles.inputRowOpen]}
      >
        <Text style={[styles.valueText, !value && styles.valuePlaceholder]}>
          {value || " "}
        </Text>
        <View style={[styles.chevron, open && styles.chevronUp]} />
      </TouchableOpacity>

      {open && (
        <View style={styles.optionsList}>
          <ScrollView
            style={styles.optionsScroll}
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {value !== "" && (
              <TouchableOpacity
                style={[styles.option, styles.clearOption]}
                onPress={handleClear}
                activeOpacity={0.7}
              >
                <Text style={styles.clearText}>Limpar seleção</Text>
              </TouchableOpacity>
            )}
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.option, value === opt && styles.optionActive]}
                onPress={() => handleSelect(opt)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.optionText,
                    value === opt && styles.optionTextActive,
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <Text style={styles.errorText}>{errorMessage ?? ""}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    position: "relative",
  },
  label: {
    position: "absolute",
    left: 12,
    paddingHorizontal: 6,
    backgroundColor: "black",
    fontFamily: "Inter_400Regular",
    borderRadius: 99,
    zIndex: 1,
  },
  inputRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#ffffff",
    borderRadius: 8,
    backgroundColor: "black",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputRowOpen: {
    borderColor: "#FACC15",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  valueText: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#ffffff",
  },
  valuePlaceholder: {
    color: "transparent",
  },
  chevron: {
    width: 8,
    height: 8,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: "#ffffff80",
    transform: [{ rotate: "45deg" }],
    marginBottom: 4,
  },
  chevronUp: {
    transform: [{ rotate: "-135deg" }],
    marginBottom: -4,
  },
  optionsList: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#FACC15",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: "#111111",
    overflow: "hidden",
  },
  optionsScroll: {
    maxHeight: 180,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionActive: {
    backgroundColor: "#1a1a1a",
  },
  clearOption: {
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  optionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#ffffff",
  },
  optionTextActive: {
    color: "#FACC15",
    fontFamily: "Inter_600SemiBold",
  },
  clearText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#888888",
  },
  errorText: {
    color: "#F87171",
    fontSize: 12,
    marginTop: 6,
    fontFamily: "Inter_400Regular",
  },
});
