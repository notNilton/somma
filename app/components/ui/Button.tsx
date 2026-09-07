import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from "react-native";

import { LoadingDots } from "@/components/LoadingDots";

type ButtonType = "primary" | "secondary" | "string";

interface CustomButtonProps extends TouchableOpacityProps {
  label: string;
  onPress: () => void;
  type?: ButtonType;
  backgroundColor?: string;
  labelColor?: string;
  buttonStyle?: ViewStyle;
  labelFontSize?: number;
  loading?: boolean;
}


export function CustomButton({
  label,
  onPress,
  type = "primary",
  backgroundColor,
  labelColor,
  buttonStyle,
  labelFontSize,
  loading = false,
  ...rest
}: Readonly<CustomButtonProps>) {
  const resolvedLabelColor =
    labelColor ??
    (type === "secondary" || type === "string" ? "#ffffff" : "#000000");

  return (
    <TouchableOpacity
      style={[
        styles.button,
        type === "secondary" && styles.buttonSecondary,
        type === "string" && styles.buttonString,
        backgroundColor ? { backgroundColor } : undefined,
        buttonStyle,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={loading}
      {...rest}
    >
      {loading ? (
        <LoadingDots color={resolvedLabelColor} />
      ) : (
        <Text
          style={[
            styles.label,
            type === "secondary" && styles.labelSecondary,
            type === "string" && styles.labelString,
            labelColor ? { color: labelColor } : undefined,
            labelFontSize ? { fontSize: labelFontSize } : undefined,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    backgroundColor: "#FACC15",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  buttonString: {
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  label: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#000000",
  },
  labelSecondary: {
    color: "#ffffff",
  },
  labelString: {
    color: "#ffffff",
  },
});
