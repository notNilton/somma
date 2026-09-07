import { StyleSheet, View } from "react-native";

import { LoadingDots } from "@/components/LoadingDots";
import { Text } from "@/components/Themed";

const CARD_BG = "#0F2A1A";

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

interface Props {
  value: number | null;
  loading: boolean;
}

export function AvailableWithdrawalCard({ value, loading }: Readonly<Props>) {
  return (
    <View style={styles.card}>
      <View>
        <Text style={styles.label}>Disponível</Text>
        {loading ? (
          <LoadingDots />
        ) : (
          <Text style={styles.value}>{formatBRL(value ?? 0)}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderWidth: 0.5,
    borderColor: "#3BB166",
    borderRadius: 8,
    padding: 14,
    width: "100%",
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#3BB166",
    backgroundColor: CARD_BG,
  },
  value: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    backgroundColor: CARD_BG,
  },
});
