import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import CheckIcon from "@/assets/icons/check.svg";
import { CustomButton } from "@/components/Button";

export default function SalesSuccessScreen() {
  const router = useRouter();
  const scale = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1.5,
        useNativeDriver: true,
        speed: 18,
        bounciness: 0,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 18,
        bounciness: 0,
      }),
    ]).start();

    Animated.parallel([
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        delay: 350,
        useNativeDriver: true,
      }),
      Animated.timing(textTranslateY, {
        toValue: 0,
        duration: 400,
        delay: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, textOpacity, textTranslateY]);

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <CheckIcon width={72} height={72} color="#3BB166" />
        </Animated.View>
        <Animated.View
          style={[
            styles.texts,
            { opacity: textOpacity, transform: [{ translateY: textTranslateY }] },
          ]}
        >
          <Text style={styles.title}>Venda registrada com sucesso!</Text>
          <Text style={styles.description}>
            Uma notificação foi enviada para o seu dispositivo com os detalhes
            da venda.
          </Text>
        </Animated.View>
      </View>
      <View style={styles.footer}>
        <CustomButton
          label="Nova venda"
          onPress={() => router.replace("/sales")}
          backgroundColor="#FACC15"
          labelColor="#000000"
        />
        <CustomButton
          label="Ir para o início"
          type="secondary"
          onPress={() => router.replace("/home")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#111111",
    paddingHorizontal: 20,
    paddingVertical: 48,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  texts: {
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#888888",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  footer: {
    gap: 12,
    paddingBottom: 12,
  },
});
