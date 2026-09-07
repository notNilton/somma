import { Text } from "@/components/Themed";
import { LoadingDots } from "@/components/LoadingDots";
import type { LastAccesses } from "@/types/home";
import { StyleSheet, View } from "react-native";

const CARD_BG = "#1a1a1a";

interface Props {
  data: LastAccesses | null;
  loading: boolean;
}

export function DailySummaryCard({ data, loading }: Readonly<Props>) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Últimos acessos</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Checkout</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>5 min</Text>
          {loading ? (
            <LoadingDots />
          ) : (
            <Text style={styles.statValue}>{data?.checkout.last_5min ?? 0}</Text>
          )}
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>30 min</Text>
          {loading ? (
            <LoadingDots />
          ) : (
            <Text style={styles.statValue}>{data?.checkout.last_30min ?? 0}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "flex-start",
    gap: 16,
  },
  title: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  card: {
    width: "100%",
    flex: 1,
    backgroundColor: CARD_BG,
    borderWidth: 0.5,
    borderColor: "#2a2a2a",
    borderRadius: 8,
    padding: 22,
    gap: 10,
  },
  cardLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#ffffff",
    backgroundColor: CARD_BG,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#b1b1b1",
    backgroundColor: CARD_BG,
  },
  statValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    backgroundColor: CARD_BG,
  },
});
