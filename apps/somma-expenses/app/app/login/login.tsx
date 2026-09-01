import Constants from "expo-constants";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet } from "react-native";

import { CustomButton } from "@/components/Button";
import { CustomInput } from "@/components/Input";
import { Text, View } from "@/components/Themed";
import { useAuth } from "@/context/AuthContext";
import { analyticsService } from "@/services/analytics";

const pagahLogo = require("@/assets/images/pagah-logo.png");

export default function TabOneScreen() {
  const router = useRouter();
  const { login, demoLogin, user, isLoading: authLoading } = useAuth();

  if (authLoading) return null;
  if (user) return <Redirect href="/home" />;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function validateForm(): boolean {
    let valid = true;

    if (email.trim().length === 0) {
      setEmailError("Campo obrigatório");
      valid = false;
      // } else if (!isValidEmail(email)) {
      //   setEmailError("E-mail inválido");
      //   valid = false;
    } else {
      setEmailError("");
    }

    if (password.trim().length === 0) {
      setPasswordError("Campo obrigatório");
      valid = false;
    } else {
      setPasswordError("");
    }

    return valid;
  }

  async function handleLogin() {
    if (!validateForm()) return;

    if (email === "tester2526@gmail.com" && password === "tester2526") {
      demoLogin();
      // Conta demo: desliga a coleta para não poluir os dados reais do GA4.
      analyticsService.setCollectionEnabled(false);
      router.replace("/home");
      return;
    }

    setIsLoading(true);
    setApiError("");

    try {
      await login(email, password);
      analyticsService.setCollectionEnabled(true);
      analyticsService.logLoginSuccess();
      router.replace("/home");
    } catch {
      analyticsService.logLoginFailure();
      setApiError("E-mail ou senha incorretos.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Image source={pagahLogo} style={styles.logo} />

      <View style={styles.CTAsection}>
        <Text style={styles.title}>Acesse sua conta</Text>

        <View style={styles.inputsWrapper}>
          <CustomInput
            placeholder="E-mail"
            type="email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setEmailError("");
              setApiError("");
            }}
            errorMessage={emailError}
          />
          <CustomInput
            placeholder="Senha"
            type="password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setPasswordError("");
              setApiError("");
            }}
            errorMessage={passwordError}
          />
          {apiError !== "" && <Text style={styles.apiError}>{apiError}</Text>}
        </View>

        <View style={styles.buttonsWrapper}>
          <CustomButton
            label="Entrar"
            onPress={handleLogin}
            loading={isLoading}
          />
          {/*   <CustomButton
            label="Esqueci minha senha"
            type="secondary"
            onPress={() => { demoLogin(); router.replace("/home"); }}
            loading={isLoading}
          />
         <CustomButton
            label="Novo aqui? Cadastre-se"
            type="string"
            onPress={() => router.push("/login/login")}
            loading={isLoading}
          /> */}
        </View>
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
    gap: 84,
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
  CTAsection: {
    gap: 42,
    backgroundColor: "transparent",
  },
  inputsWrapper: {
    gap: 12,
    backgroundColor: "transparent",
  },
  buttonsWrapper: {
    gap: 14,
    backgroundColor: "transparent",
  },
  apiError: {
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
