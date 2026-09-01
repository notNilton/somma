import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import BoxIcon from "@/assets/icons/empty-box.svg";
import { CustomButton } from "@/components/Button";

interface EmptyStateProps {
  readonly title?: string;
  readonly description?: string;
}

export function EmptyState({
  title = "Não encontrado",
  description = "Nenhum dado encontrado",
}: EmptyStateProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <BoxIcon width={96} height={96} color="#FACC15" />
      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <CustomButton label="Retornar ao Início" onPress={() => router.replace("/home")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
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
