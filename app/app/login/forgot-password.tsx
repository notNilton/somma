import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet } from "react-native";

import { CustomButton } from "@/components/Button";
import { CustomInput } from "@/components/Input";
import { Text, View } from "@/components/Themed";
import { authService } from "@/services/auth";

const pagahLogo = require("@/assets/images/pagah-logo.png");

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSend() {
    if (email.trim().length === 0) {
      setEmailError("Campo obrigatório");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await authService.forgotPassword(email.trim());
      setSuccessMessage(
        res.message ||
          "Se o e-mail estiver cadastrado, as instruções foram enviadas."
      );
    } catch {
      setErrorMessage("Erro ao solicitar recuperação. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Image source={pagahLogo} style={styles.logo} />

      <View style={styles.CTAsection}>
        <Text style={styles.title}>Recuperar senha</Text>
        <Text style={styles.subtitle}>
          Informe seu e-mail para receber as instruções de redefinição de senha.
        </Text>

        {successMessage !== "" ? (
          <View style={styles.successWrapper}>
            <Text style={styles.successText}>{successMessage}</Text>
            <CustomButton
              label="Voltar para o login"
              type="secondary"
              onPress={() => router.back()}
            />
          </View>
        ) : (
          <View style={styles.inputsWrapper}>
            <CustomInput
              placeholder="E-mail"
              type="email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setEmailError("");
                setErrorMessage("");
              }}
              errorMessage={emailError}
              autoComplete="email"
              textContentType="emailAddress"
            />
            {errorMessage !== "" && (
              <Text style={styles.errorText}>{errorMessage}</Text>
            )}

            <View style={styles.buttonsWrapper}>
              <CustomButton
                label="Enviar instruções"
                onPress={handleSend}
                loading={isLoading}
              />
              <CustomButton
                label="Voltar para o login"
                type="string"
                onPress={() => router.back()}
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
