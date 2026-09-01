import { useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import AnticipateIcon from "@/assets/icons/anticipate.svg";
import WithdrawIcon from "@/assets/icons/withdrawal.svg";
import { BottomNav } from "@/components/BottomNav";
import { EmptyState } from "@/components/EmptyState";
import { HeaderNav } from "@/components/HeaderNav";
import { LoadingDots } from "@/components/LoadingDots";
import { walletService } from "@/services/wallet";
import type { Transaction } from "@/types/wallet";


const STATUS_MAP: Record<Transaction["status"], { label: string; color: string; bg: string }> = {
  paid:       { label: "Pago",        color: "#3BB166", bg: "#0F2A1A" },
  processing: { label: "Em processo", color: "#FACC15", bg: "#2a2200" },
  refused:    { label: "Recusado",    color: "#ef4444", bg: "#2A0A0A" },
};

const TYPE_MAP: Record<Transaction["type"], { label: string; icon: React.ComponentType<{ width?: number; height?: number; color?: string }>; iconColor: string; iconBg: string }> = {
  withdraw:   { label: "Saque",       icon: WithdrawIcon,  iconColor: "#3BB166", iconBg: "#0F2A1A" },
  anticipate: { label: "Antecipação", icon: AnticipateIcon, iconColor: "#f97316", iconBg: "#2A1A0A" },
};

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function WalletHistoryScreen() {
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadHistory() {
    const data = await walletService.getHistory();
    setHistory(data);
  }

  useEffect(() => {
    loadHistory().finally(() => setLoading(false));
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadHistory();
    } finally {
      setRefreshing(false);
    }
  }

  const isEmpty = !loading && history.length === 0;

  return (
    <View style={styles.screen}>
      <HeaderNav />
      <ScrollView
        contentContainerStyle={[styles.container, isEmpty && styles.containerEmpty]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FACC15" colors={["#FACC15"]} />}
      >
        <Text style={styles.title}>Histórico</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <LoadingDots color="#ffffff60" />
          </View>
        ) : isEmpty ? (
          <EmptyState
            title="Nenhuma transação encontrada!"
            description="Quando você possuir alguma transação, ela será exibida em seu Histórico."
          />
        ) : (
          history.map(({ id, type, value, date, time, status }) => {
            const { label, icon: Icon, iconColor, iconBg } = TYPE_MAP[type];
            const statusInfo = STATUS_MAP[status];
            return (
              <View key={id} style={styles.card}>
                <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                  <Icon width={22} height={22} color={iconColor} />
                </View>
                <View style={styles.info}>
                  <View style={styles.topRow}>
                    <Text style={styles.label}>{label}</Text>
                    <Text style={styles.value}>{formatCurrency(value)}</Text>
                  </View>
                  <View style={styles.bottomRow}>
                    <Text style={styles.datetime}>{date} • {time}</Text>
                    <View style={[styles.statusTag, { backgroundColor: statusInfo.bg }]}>
                      <Text style={[styles.statusLabel, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
      <BottomNav />
    </View>
  );
}

const CARD_BG = "#1a1a1a";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#111111",
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  containerEmpty: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    paddingTop: 40,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  card: {
    backgroundColor: CARD_BG,
    borderWidth: 0.5,
    borderColor: "#2a2a2a",
    borderRadius: 8,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 6,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
  },
  value: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  datetime: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#888888",
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
