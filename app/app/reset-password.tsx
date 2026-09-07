import Constants from "expo-constants";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet } from "react-native";

import { CustomButton } from "@/components/Button";
import { CustomInput } from "@/components/Input";
import { Text, View } from "@/components/Themed";
import { authService } from "@/services/auth";

const pagahLogo = require("@/assets/images/pagah-logo.png");

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = params.token || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleReset() {
    let valid = true;

    if (password.length < 12) {
      setPasswordError("Senha deve ter no mínimo 12 caracteres");
      valid = false;
    } else {
      setPasswordError("");
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError("As senhas não coincidem");
      valid = false;
    } else {
      setConfirmPasswordError("");
    }

    if (!valid) return;

    if (!token) {
      setErrorMessage("Token de redefinição não encontrado ou inválido.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      await authService.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => {
        router.replace("/login/login" as any);
      }, 2500);
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Token inválido ou expirado.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Image source={pagahLogo} style={styles.logo} />

      <View style={styles.CTAsection}>
        <Text style={styles.title}>Redefinir senha</Text>
        <Text style={styles.subtitle}>
          Crie uma nova senha segura para sua conta.
        </Text>

        {success ? (
          <View style={styles.successWrapper}>
            <Text style={styles.successText}>
              Senha redefinida com sucesso! Você será redirecionado para o login.
            </Text>
            <CustomButton
              label="Ir para o login"
              onPress={() => router.replace("/login/login" as any)}
            />
          </View>
        ) : !token ? (
          <View style={styles.errorWrapper}>
            <Text style={styles.errorText}>
              Link de redefinição inválido ou incompleto (token ausente).
            </Text>
            <CustomButton
              label="Solicitar novo link"
              onPress={() => router.replace("/login/forgot-password" as any)}
            />
          </View>
        ) : (
          <View style={styles.inputsWrapper}>
            <CustomInput
              placeholder="Nova senha (mín. 12 caracteres)"
              type="password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setPasswordError("");
                setErrorMessage("");
              }}
              errorMessage={passwordError}
              autoComplete="new-password"
              textContentType="newPassword"
            />
            <CustomInput
              placeholder="Confirmar nova senha"
              type="password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setConfirmPasswordError("");
                setErrorMessage("");
              }}
              errorMessage={confirmPasswordError}
              autoComplete="new-password"
              textContentType="newPassword"
            />
            {errorMessage !== "" && (
              <Text style={styles.errorText}>{errorMessage}</Text>
            )}

            <View style={styles.buttonsWrapper}>
              <CustomButton
                label="Redefinir senha"
                onPress={handleReset}
                loading={isLoading}
              />
              <CustomButton
                label="Voltar para o login"
                type="string"
                onPress={() => router.replace("/login/login" as any)}
                disabled={isLoading}
              />
            </View>
          </View>
        )}
      </View>

      <View style={styles.version}>
        <Text>v.{Constants.expoConfig?.version ?? "0.0.0"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 104,
    gap: 60,
  },
  logo: {
    width: 240,
    height: 80,
    resizeMode: "contain",
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_600SemiBold",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#94a3b8",
    lineHeight: 20,
    marginTop: -20,
  },
  CTAsection: {
    gap: 32,
    backgroundColor: "transparent",
  },
  inputsWrapper: {
    gap: 16,
    backgroundColor: "transparent",
  },
  buttonsWrapper: {
    gap: 12,
    marginTop: 8,
    backgroundColor: "transparent",
  },
  successWrapper: {
    gap: 20,
    backgroundColor: "transparent",
  },
  successText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#34d399",
    lineHeight: 22,
  },
  errorWrapper: {
    gap: 20,
    backgroundColor: "transparent",
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#F87171",
  },
  version: {
    position: "absolute",
    bottom: 72,
    alignSelf: "center",
    backgroundColor: "transparent",
  },
});
