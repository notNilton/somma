import { BottomSheet } from "@/components/BottomSheet";
import { DateInput } from "@/components/DateInput";
import { LoadingDots } from "@/components/LoadingDots";
import { Text } from "@/components/Themed";
import { useAuth } from "@/context/AuthContext";
import type { GeneralData, HomeFilters } from "@/types/home";
import { formatInBrazil, todayInBrazil } from "@/utils/timezone";
import { useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { LineChart } from "react-native-chart-kit";

const CARD_BG = "#1a1a1a";

type PeriodKey =
  | "hoje"
  | "ontem"
  | "ultimos_7_dias"
  | "mes_atual"
  | "mes_anterior"
  | "personalizado";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "ontem", label: "Ontem" },
  { key: "ultimos_7_dias", label: "Últimos 7 dias" },
  { key: "mes_atual", label: "Mês atual" },
  { key: "mes_anterior", label: "Mês anterior" },
  { key: "personalizado", label: "Personalizado" },
];

function displayToIso(ddmmyyyy: string): string {
  const [dd, mm, yyyy] = ddmmyyyy.split("/");
  return `${yyyy}-${mm}-${dd}`;
}

/** Retorna data YYYY-MM-DD para `n` dias atrás no fuso Brasil */
function daysAgo(n: number): string {
  const now = new Date();
  const brStr = todayInBrazil(); // YYYY-MM-DD
  // Parse Brazil date, subtract days
  const brDate = new Date(brStr + "T12:00:00-03:00");
  brDate.setDate(brDate.getDate() - n);
  return formatInBrazil(brDate);
}

function filtersForPeriod(key: PeriodKey): HomeFilters {
  switch (key) {
    case "hoje": {
      return { dt_inicial: todayInBrazil(), dt_final: todayInBrazil() };
    }
    case "ontem": {
      return { dt_inicial: daysAgo(1), dt_final: daysAgo(1) };
    }
    case "ultimos_7_dias": {
      return { dt_inicial: daysAgo(6), dt_final: todayInBrazil() };
    }
    case "mes_atual": {
      const firstDay = todayInBrazil().slice(0, 8) + "01";
      return { dt_inicial: firstDay, dt_final: todayInBrazil() };
    }
    case "mes_anterior": {
      // Get current month in Brazil, go back one month
      const today = todayInBrazil(); // YYYY-MM-DD
      const [y, m] = today.split("-").map(Number);
      // Previous month: month 1 → 12, year -1
      const pm = m === 1 ? 12 : m - 1;
      const py = m === 1 ? y - 1 : y;
      // Last day of previous month
      const lastDay = new Date(Date.UTC(py, pm, 0)).getUTCDate();
      const s = `${py}-${String(pm).padStart(2, "0")}-01`;
      const e = `${py}-${String(pm).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      return { dt_inicial: s, dt_final: e };
    }
    default:
      return {};
  }
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function buildChartData(chart: GeneralData["chart"]) {
  const totalPoints = chart.length;

  const labels = chart.map((p, index) => {
    if (totalPoints > 7) {
      const step = Math.ceil(totalPoints / 5);
      const isFirst = index === 0;
      const isLast = index === totalPoints - 1;
      const isStep = index % step === 0;

      if (!isFirst && !isLast && !isStep) {
        return "";
      }
    }

    const [, month, day] = p.date.split("-");
    return `${day}/${month}`;
  });

  return { labels, values: chart.map((p) => p.revenue / 100) };
}

interface Props {
  data: GeneralData | null;
  loading: boolean;
  periodLabel: string;
  onPeriodChange: (filters: HomeFilters, label: string) => void;
}

export function GeneralDataCard({
  data,
  loading,
  periodLabel,
  onPeriodChange,
}: Readonly<Props>) {
  const { user } = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = windowWidth + 20;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [activePeriod, setActivePeriod] = useState<PeriodKey>("hoje");

  const chartData = data ? buildChartData(data.chart) : null;
  const lineData = chartData
    ? { labels: chartData.labels, datasets: [{ data: chartData.values }] }
    : null;

  const paymentMethods = [
    {
      label: "Cartão",
      color: "#3b82f6",
      bg: "#162d52",
      value: data?.payment_methods.cartao ?? 0,
    },
    {
      label: "Pix",
      color: "#12c955",
      bg: "#0f3d20",
      value: data?.payment_methods.pix ?? 0,
    },
    {
      label: "Boleto",
      color: "#D4A800",
      bg: "#2e2a00",
      value: data?.payment_methods.boleto ?? 0,
    },
  ];

  function handleSelect(key: PeriodKey) {
    setActivePeriod(key);
    if (key !== "personalizado") {
      const filters = filtersForPeriod(key);
      const label = PERIODS.find((p) => p.key === key)!.label;
      onPeriodChange(filters, label);
      setSheetOpen(false);
    }
  }

  function handleApplyCustom() {
    if (customFrom.length !== 10 || customTo.length !== 10) return;
    onPeriodChange(
      {
        dt_inicial: displayToIso(customFrom),
        dt_final: displayToIso(customTo),
      },
      "Personalizado",
    );
    setSheetOpen(false);
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.welcome}>
        Olá, <Text style={styles.name}>{user?.name ?? "..."}</Text> !
      </Text>

      <View style={styles.card}>
        <View>
          <View style={styles.salesHeader}>
            <Text style={styles.salesLabel}>Vendas gerais</Text>
            <TouchableOpacity
              onPress={() => setSheetOpen(true)}
              activeOpacity={0.7}
              style={styles.periodBtn}
            >
              <Text style={styles.periodBtnText}>{periodLabel} ▾</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <LoadingDots />
          ) : (
            <Text style={styles.salesValue}>
              {formatBRL(data?.revenue_sem_juros ?? data?.total_revenue ?? 0)}
            </Text>
          )}
        </View>

        <View style={styles.dataRow}>
          {[
            {
              label: "Pedidos",
              value: data?.orders_sem_juros ?? data?.total_orders ?? 0,
              fmt: false,
            },
            {
              label: "Ticket médio",
              value: data?.average_ticket ?? 0,
              fmt: true,
            },
            {
              label: "Comissão",
              value: data?.commission ?? data?.comissao ?? 0,
              fmt: true,
              green: true,
            },
          ].map(({ label, value, fmt: isMoney, green }) => (
            <View key={label} style={styles.dataItem}>
              <Text style={styles.dataLabel}>{label}</Text>
              {loading ? (
                <LoadingDots />
              ) : (
                <Text
                  style={[styles.dataValue, green && styles.dataValueGreen]}
                >
                  {isMoney ? formatBRL(value as number) : value}
                </Text>
              )}
            </View>
          ))}
        </View>

        <View style={styles.separator} />

        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>Formas de pagamento</Text>

          <View style={styles.dataRow}>
            {paymentMethods.map(({ label, color, bg, value }) => (
              <View
                key={label}
                style={[
                  styles.dataItem,
                  { backgroundColor: bg },
                  value === 0 && styles.itemZero,
                ]}
              >
                <View style={styles.labelRow}>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <Text
                    style={[styles.dataLabel, { color, backgroundColor: bg }]}
                  >
                    {label}
                  </Text>
                </View>
                {loading ? (
                  <LoadingDots />
                ) : (
                  <Text style={[styles.dataValue, { backgroundColor: bg }]}>
                    {formatBRL(value)}
                  </Text>
                )}
              </View>
            ))}
          </View>

          {chartData && chartData.values.length > 0 && lineData && (
            <>
              <LineChart
                data={lineData}
                width={chartWidth}
                height={100}
                withDots={false}
                withInnerLines={false}
                withOuterLines={false}
                withHorizontalLabels={false}
                withVerticalLabels={true}
                chartConfig={
                  {
                    backgroundColor: CARD_BG,
                    backgroundGradientFrom: CARD_BG,
                    backgroundGradientTo: CARD_BG,
                    color: () => "#FACC15",
                    labelColor: () => "#888888",
                    propsForLabels: { fontSize: 9 },
                    paddingLeft: 16,
                  } as any
                }
                style={styles.graph}
              />
              <View style={styles.labelsRow}>
                {lineData.labels.map((label, i) => (
                  <Text key={`${label}-${i}`} style={styles.chartLabel}>
                    {label}
                  </Text>
                ))}
              </View>
            </>
          )}
        </View>
      </View>

      <BottomSheet
        visible={sheetOpen}
        title="Período"
        onClose={() => setSheetOpen(false)}
        contentGap={0}
      >
        {PERIODS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.periodOption,
              activePeriod === key && styles.periodOptionActive,
            ]}
            activeOpacity={0.7}
            onPress={() => handleSelect(key)}
          >
            <Text
              style={[
                styles.periodOptionText,
                activePeriod === key && styles.periodOptionTextActive,
              ]}
            >
              {label}
            </Text>
            {activePeriod === key && <Text style={styles.periodCheck}>✓</Text>}
          </TouchableOpacity>
        ))}

        {activePeriod === "personalizado" && (
          <View style={styles.customDates}>
            <DateInput
              placeholder="Data inicial"
              value={customFrom}
              onChangeText={setCustomFrom}
            />
            <DateInput
              placeholder="Data final"
              value={customTo}
              onChangeText={setCustomTo}
            />
            <TouchableOpacity
              style={[
                styles.applyBtn,
                (customFrom.length !== 10 || customTo.length !== 10) &&
                  styles.applyBtnDisabled,
              ]}
              activeOpacity={0.8}
              onPress={handleApplyCustom}
            >
              <Text style={styles.applyBtnText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "flex-start", gap: 16 },
  welcome: { fontSize: 16, fontFamily: "Inter_400Regular", color: "#888888" },
  name: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#ffffff" },
  card: {
    backgroundColor: CARD_BG,
    borderWidth: 0.5,
    borderColor: "#2a2a2a",
    borderRadius: 8,
    padding: 14,
    width: "100%",
    gap: 16,
    overflow: "hidden",
  },
  salesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: CARD_BG,
  },
  salesLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#b1b1b1",
    backgroundColor: CARD_BG,
  },
  periodBtn: {
    backgroundColor: "#252525",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  periodBtnText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#FACC15",
  },
  salesValue: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#FACC15",
    backgroundColor: CARD_BG,
  },
  separator: { height: 0.5, backgroundColor: "#2a2a2a", width: "100%" },
  paymentSection: { gap: 12 },
  paymentTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    backgroundColor: CARD_BG,
  },
  dataRow: { flexDirection: "row", gap: 8 },
  dataItem: {
    flex: 1,
    alignItems: "flex-start",
    gap: 4,
    backgroundColor: "#252525",
    borderRadius: 8,
    padding: 10,
  },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dataLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "#b1b1b1",
    backgroundColor: "#252525",
  },
  dataValue: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#ffffff" },
  dataValueGreen: { color: "#12c955" },
  itemZero: { opacity: 0.4 },
  graph: { marginHorizontal: -14, overflow: "hidden" },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 8,
  },
  chartLabel: { fontSize: 10, color: "#888" },
  periodOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#2a2a2a",
  },
  periodOptionActive: { borderBottomColor: "#FACC1530" },
  periodOptionText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#ffffff",
  },
  periodOptionTextActive: { fontFamily: "Inter_600SemiBold", color: "#FACC15" },
  periodCheck: { fontSize: 14, color: "#FACC15" },
  customDates: { gap: 12, paddingTop: 16 },
  applyBtn: {
    backgroundColor: "#FACC15",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  applyBtnDisabled: { opacity: 0.4 },
  applyBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#000000",
  },
});
