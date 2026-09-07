import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import NotFoundIcon from "@/assets/icons/notfound.svg";
import { CustomButton } from "@/components/Button";

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <NotFoundIcon width={96} height={96} color="#FACC15" />
      <View style={styles.texts}>
        <Text style={styles.title}>Página não encontrada</Text>
        <Text style={styles.description}>
          Ops! A página que você está procurando não existe ou foi removida.
        </Text>
      </View>
      <CustomButton label="Ir para o Início" onPress={() => router.replace("/home")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: "#0a0a0a",
    gap: 20,
  },
  texts: {
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#888888",
    textAlign: "center",
    lineHeight: 22,
  },
});
