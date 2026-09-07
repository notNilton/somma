import Constants from "expo-constants";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet } from "react-native";

import { CustomButton } from "@/components/Button";
import { Text, View } from "@/components/Themed";
import { useAuth } from "@/context/AuthContext";

const pagahLogo = require("@/assets/images/pagah-logo.png");

function useFadeUp(delay: number) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return { opacity, translateY };
}

export default function TabOneScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const line1 = useFadeUp(100);
  const line2 = useFadeUp(300);
  const line3 = useFadeUp(500);

  if (isLoading) return null;
  if (user) return <Redirect href="/home" />;

  return (
    <View style={styles.container}>
      <Image source={pagahLogo} style={styles.logo} />

      <View style={styles.CTAsection}>
        <View style={styles.titleWrapper}>
          <Animated.Text
            style={[
              styles.title,
              {
                color: "#ffffff",
                opacity: line1.opacity,
                transform: [{ translateY: line1.translateY }],
              },
            ]}
          >
            Aqui, o seu
          </Animated.Text>

          <Animated.Text
            style={[
              styles.title,
              {
                color: "#ffffff",
                opacity: line2.opacity,
                transform: [{ translateY: line2.translateY }],
              },
            ]}
          >
            ROI pode ser
          </Animated.Text>

          <Animated.Text
            style={[
              styles.title,
              {
                color: "#FACC15",
                opacity: line3.opacity,
                transform: [{ translateY: line3.translateY }],
              },
            ]}
          >
            extraordinário.
          </Animated.Text>
        </View>

        <CustomButton
          label="Acessar minha conta"
          onPress={() => router.push("/login/login")}
        />
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
  CTAsection: {
    gap: 84,
    backgroundColor: "transparent",
  },
  titleWrapper: {
    gap: 4,
    backgroundColor: "transparent",
  },
  title: {
    fontSize: 52,
    fontWeight: "500",
  },
  version: {
    position: "absolute",
    bottom: 72,
    alignSelf: "center",
    backgroundColor: "transparent",
  },
});
