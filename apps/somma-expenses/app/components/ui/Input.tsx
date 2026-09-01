import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";

import EyeIcon from "@/assets/icons/eye.svg";
import EyeOffIcon from "@/assets/icons/eyeoff.svg";
import { LoadingDots } from "@/components/LoadingDots";

type InputType = "text" | "email" | "password";

export interface CustomInputProps extends TextInputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  errorMessage?: string;
  type?: InputType;
  disabled?: boolean;
  loading?: boolean;
}

const typeProps: Record<InputType, Partial<TextInputProps>> = {
  text: {},
  email: { keyboardType: "email-address", autoCapitalize: "none" },
  password: { secureTextEntry: true },
};

export function CustomInput({
  placeholder,
  value,
  onChangeText,
  errorMessage,
  type = "text",
  disabled = false,
  loading = false,
  ...rest
}: CustomInputProps) {
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    if ((value ?? "").length > 0 || loading) {
      Animated.timing(animatedValue, { toValue: 1, duration: 180, useNativeDriver: false }).start();
    } else if (!focused) {
      Animated.timing(animatedValue, { toValue: 0, duration: 180, useNativeDriver: false }).start();
    }
  }, [value, loading, focused, animatedValue]);

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setFocused(false);
    if ((value ?? "").length === 0) {
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 180,
        useNativeDriver: false,
      }).start();
    }
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
    outputRange: ["#ffffff80", focused ? "#FACC15" : "#ffffff"],
  });

  const isLocked = disabled || loading;

  return (
    <View style={styles.wrapper}>
      <Animated.Text
        style={[
          styles.label,
          {
            top: labelTop,
            fontSize: labelFontSize,
            color: labelColor,
          },
        ]}
      >
        {placeholder}
      </Animated.Text>

      <View style={styles.inputRow}>
        {loading ? (
          <View style={[styles.input, styles.inputDisabled, styles.inputLoading]}>
            <LoadingDots color="#ffffff60" />
          </View>
        ) : (
          <TextInput
            style={[styles.input, focused && !isLocked && styles.inputFocused, type === "password" && styles.inputWithIcon, isLocked && styles.inputDisabled]}
            placeholder=""
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            editable={!isLocked}
            {...typeProps[type]}
            secureTextEntry={type === "password" && !passwordVisible}
            {...rest}
          />
        )}
        {type === "password" && !loading && (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setPasswordVisible((prev) => !prev)}
            activeOpacity={0.7}
          >
            {passwordVisible
              ? <EyeOffIcon width={20} height={20} color="#ffffff80" />
              : <EyeIcon width={20} height={20} color="#ffffff80" />
            }
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.errorText}>{errorMessage ?? ""}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    position: "relative",
    justifyContent: "center",
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
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ffffff",
    borderRadius: 8,
    backgroundColor: "black",
    color: "#ffffff",
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputFocused: {
    borderColor: "#FACC15",
  },
  inputDisabled: {
    borderColor: "#ffffff30",
    color: "#ffffff60",
  },
  inputLoading: {
    justifyContent: "center",
  },
  inputRow: {
    width: "100%",
    position: "relative",
  },
  inputWithIcon: {
    paddingRight: 48,
  },
  eyeButton: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  errorText: {
    color: "#F87171",
    fontSize: 12,
    marginTop: 6,
    fontFamily: "Inter_400Regular",
  },
});
