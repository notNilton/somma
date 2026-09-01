import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { walletService } from "@/services/wallet";
import type { WalletBalance } from "@/types/wallet";

import HistoryIcon from "@/assets/icons/history.svg";
import { BottomNav } from "@/components/BottomNav";
import { BottomSheet } from "@/components/BottomSheet";
import { CustomButton } from "@/components/Button";
import { HeaderNav } from "@/components/HeaderNav";
import { LoadingDots } from "@/components/LoadingDots";

const GREEN_BG = "#0F2A1A";
const DARK_BG = "#1a1a1a";
const CHARGE_BG = "#1F0A0A";

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function WalletContent() {
  const router = useRouter();
  const [taxasVisible, setTaxasVisible] = useState(false);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadBalance() {
    const data = await walletService.getBalance();
    setBalance(data);
  }

  useEffect(() => {
    loadBalance().finally(() => setLoading(false));
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadBalance();
    } finally {
      setRefreshing(false);
    }
  }

  const isLoading = loading || refreshing;

  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#FACC15"
          colors={["#FACC15"]}
        />
      }
    >
      <View style={styles.titleRow}>
        <Text style={styles.title}>Carteira</Text>
        <TouchableOpacity
          onPress={() => router.push("/wallet-history")}
          activeOpacity={0.7}
          style={styles.historyBtn}
        >
          <HistoryIcon width={18} height={18} color="#000000" />
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: GREEN_BG, borderColor: "#3BB166" },
        ]}
      >
        <Text style={[styles.cardLabel, { color: "#3BB166" }]}>
          Disponível para saque
        </Text>
        {isLoading ? (
          <LoadingDots color="#ffffff60" />
        ) : (
          <Text style={[styles.cardValueLg, { color: "#ffffff" }]}>
            {formatBRL(balance?.available_for_withdrawal ?? 0)}
          </Text>
        )}
        {/*

    <CustomButton
          label="Solicitar saque"
          onPress={() => router.push("/withdrawal")}
          backgroundColor="#3BB166"
          labelColor={GREEN_BG}
        />
      */}
      </View>

      <View
        style={[
          styles.cardSm,
          { backgroundColor: DARK_BG, borderColor: "#2a2a2a" },
        ]}
      >
        <Text style={styles.cardLabel}>Disponível para antecipar</Text>
        {isLoading ? (
          <LoadingDots color="#f9731660" />
        ) : (
          <Text style={[styles.cardValueSm, { color: "#f97316" }]}>
            {formatBRL(balance?.available_to_anticipate ?? 0)}
          </Text>
        )}
        {/*
        <CustomButton
          label="Antecipar"
          onPress={() => router.push("/advance")}
          backgroundColor="#f97316"
          labelColor="#000000"
          buttonStyle={{ paddingVertical: 8 }}
          labelFontSize={13}
        />
           */}
      </View>

      <View
        style={[
          styles.cardSm,
          { backgroundColor: DARK_BG, borderColor: "#2a2a2a" },
        ]}
      >
        <Text style={styles.cardLabel}>Não antecipável</Text>
        {isLoading ? (
          <LoadingDots color="#ef444460" />
        ) : (
          <Text style={[styles.cardValueSm, { color: "#ef4444" }]}>
            {formatBRL(balance?.non_anticipatable ?? 0)}
          </Text>
        )}
      </View>

      <View
        style={[
          styles.cardSm,
          { backgroundColor: DARK_BG, borderColor: "#2a2a2a" },
        ]}
      >
        <Text style={styles.cardLabel}>Em análise</Text>
        {isLoading ? (
          <LoadingDots color="#ffffff60" />
        ) : (
          <Text style={[styles.cardValueSm, { color: "#ffffff" }]}>
            {formatBRL(balance?.under_review ?? 0)}
          </Text>
        )}
      </View>

      <View
        style={[
          styles.cardSm,
          {
            backgroundColor: CHARGE_BG,
            borderColor: "#ef4444",
            borderWidth: 1,
          },
        ]}
      >
        <Text style={[styles.cardLabel, { color: "#ef4444" }]}>
          Chargebacks
        </Text>
        {isLoading ? (
          <LoadingDots color="#ef444460" />
        ) : (
          <Text style={[styles.cardValueSm, { color: "#ef4444" }]}>
            {formatBRL(balance?.chargebacks.total_amount ?? 0)}
          </Text>
        )}
      </View>

      <CustomButton
        label="Taxas e Prazos"
        type="string"
        onPress={() => setTaxasVisible(true)}
      />

      <BottomSheet
        visible={taxasVisible}
        title="Taxas e Prazos"
        onClose={() => setTaxasVisible(false)}
      >
        <View style={styles.modalContent}>
          {[
            {
              label: "Cartão",
              rows: [
                { title: "Taxas", value: "3,99% + R$ 0,99 por transação" },
                { title: "Antecipação Automática", value: "D+30 (0)" },
                { title: "Reserva de segurança", value: "7,50% / D+90" },
              ],
            },
            {
              label: "Boleto",
              rows: [
                { title: "Taxas", value: "0,00% + R$ 1,00 por transação" },
                { title: "Prazo", value: "D+1" },
                { title: "Reserva de segurança", value: "7,50% / D+90" },
              ],
            },
            {
              label: "Pix",
              rows: [
                { title: "Taxas", value: "0,00% + R$ 0,99 por transação" },
                { title: "Prazo", value: "D+0" },
                { title: "Reserva de segurança", value: "7,50% / D+90" },
              ],
            },
          ].map(({ label, rows }) => (
            <View key={label} style={styles.modalCard}>
              <Text style={styles.modalCardTitle}>{label}</Text>
              <View style={styles.modalSeparator} />
              {rows.map(({ title, value }) => (
                <View key={title} style={styles.modalRow}>
                  <Text style={styles.modalRowLabel}>{title}</Text>
                  <Text style={styles.modalRowValue}>{value}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </BottomSheet>
    </ScrollView>
  );
}

export default function WalletScreen() {
  return (
    <View style={styles.screen}>
      <HeaderNav />
      <WalletContent />
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#111111",
  },
  iconWrapper: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  historyBtn: {
    backgroundColor: "#FACC15",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  fill: {
    flex: 1,
    backgroundColor: "#111111",
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  card: {
    borderWidth: 0.5,
    borderRadius: 8,
    padding: 14,
    width: "100%",
    gap: 16,
  },
  cardSm: {
    borderWidth: 0.5,
    borderRadius: 8,
    padding: 12,
    width: "100%",
    gap: 6,
  },
  cardLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#888888",
  },
  cardValueLg: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
  },
  cardValueSm: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  modalContent: {
    gap: 12,
  },
  modalCard: {
    backgroundColor: "#252525",
    borderRadius: 8,
    padding: 14,
    gap: 10,
  },
  modalCardTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
  },
  modalSeparator: {
    height: 0.5,
    backgroundColor: "#3a3a3a",
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalRowLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#888888",
  },
  modalRowValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
  },
});
