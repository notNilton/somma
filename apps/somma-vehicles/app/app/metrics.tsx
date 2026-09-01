import { useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import CheckCircleIcon from "@/assets/icons/check-circle.svg";
import SettingsIcon from "@/assets/icons/settings.svg";
import { BottomNav } from "@/components/BottomNav";
import { BottomSheet } from "@/components/BottomSheet";
import { CustomButton } from "@/components/Button";
import { DateInput } from "@/components/DateInput";
import { DropdownInput } from "@/components/DropdownInput";
import { HeaderNav } from "@/components/HeaderNav";
import { CustomInput } from "@/components/Input";
import { LoadingDots } from "@/components/LoadingDots";
import { Table } from "@/components/Table";
import { todayInBrazil } from "@/utils/timezone";
import { metricsService } from "@/services/metrics";
import type { MetricsFilters, UtmResponse } from "@/types/metrics";

const UTM_OPTIONS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "parametros_url"];

function displayDateToIso(ddmmyyyy: string): string {
  const [dd, mm, yyyy] = ddmmyyyy.split("/");
  return `${yyyy}-${mm}-${dd}`;
}

function currentMonthRange(): { from: string; to: string } {
  const today = todayInBrazil(); // YYYY-MM-DD no fuso Brasil
  const [y, m] = today.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate(); // last day of month m
  return {
    from: `01/${String(m).padStart(2, "0")}/${y}`,
    to:   `${lastDay}/${String(m).padStart(2, "0")}/${y}`,
  };
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type AppliedFilters = {
  search: string;
  dateFrom: string;
  dateTo: string;
  utm: string | null;
};

export function MetricsContent() {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedUtm, setSelectedUtm] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [applied, setApplied] = useState<AppliedFilters>({ search: "", dateFrom: "", dateTo: "", utm: null });
  const [report, setReport] = useState<UtmResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadReport(filters: AppliedFilters) {
    const range = currentMonthRange();
    const params: MetricsFilters = {};
    params.dt_inicial = displayDateToIso(filters.dateFrom.length === 10 ? filters.dateFrom : range.from);
    params.dt_final   = displayDateToIso(filters.dateTo.length   === 10 ? filters.dateTo   : range.to);
    if (filters.search)  params.search   = filters.search;
    if (filters.utm)     params.group_by = filters.utm;
    const data = await metricsService.getUtmReport(params);
    setReport(data);
  }

  useEffect(() => {
    loadReport(applied)
      .catch((e) => console.error("UTM error:", e))
      .finally(() => setLoading(false));
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try { await loadReport(applied); } finally { setRefreshing(false); }
  }

  const applyFilters = async () => {
    const next = { search, dateFrom, dateTo, utm: selectedUtm };
    setApplied(next);
    setFiltersOpen(false);
    setLoading(true);
    try { await loadReport(next); } finally { setLoading(false); }
  };

  const clearAll = async () => {
    const next = { search: "", dateFrom: "", dateTo: "", utm: null };
    setSearch(""); setDateFrom(""); setDateTo(""); setSelectedUtm(null);
    setApplied(next);
    setLoading(true);
    try { await loadReport(next); } finally { setLoading(false); }
  };

  const removeFilter = async (key: keyof AppliedFilters) => {
    const next = { ...applied, [key]: key === "utm" ? null : "" };
    setApplied(next);
    if (key === "search")   setSearch("");
    if (key === "dateFrom") setDateFrom("");
    if (key === "dateTo")   setDateTo("");
    if (key === "utm")      setSelectedUtm(null);
    setLoading(true);
    try { await loadReport(next); } finally { setLoading(false); }
  };

  const activeBadges = [
    applied.search   ? { key: "search"   as const, label: `Busca: ${applied.search}`       } : null,
    applied.dateFrom ? { key: "dateFrom" as const, label: `De: ${applied.dateFrom}`         } : null,
    applied.dateTo   ? { key: "dateTo"   as const, label: `Até: ${applied.dateTo}`          } : null,
    applied.utm      ? { key: "utm"      as const, label: `Agrupar: ${applied.utm}`         } : null,
  ].filter(Boolean) as { key: keyof AppliedFilters; label: string }[];

  const tableData = report?.data ?? [];

  const isLoading = loading || refreshing;

  return (
    <>
      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FACC15" colors={["#FACC15"]} />}
      >
        <View style={styles.titleRow}>
          <Text style={styles.title}>Relatório de UTMs</Text>
          <TouchableOpacity style={styles.settingsBtn} activeOpacity={0.7} onPress={() => setFiltersOpen(true)}>
            <SettingsIcon width={20} height={20} color="#000000" />
          </TouchableOpacity>
        </View>

        {activeBadges.length > 0 && (
          <View style={styles.activeFiltersRow}>
            <Text style={styles.activeFiltersLabel}>Filtros:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFiltersList}>
              {activeBadges.map(({ key, label }) => (
                <TouchableOpacity key={key} style={styles.filterBadge} activeOpacity={0.7} onPress={() => removeFilter(key)}>
                  <Text style={styles.filterBadgeText}>{label}</Text>
                  <Text style={styles.filterBadgeX}>✕</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>Total no período</Text>
            {isLoading
              ? <LoadingDots color="#ffffff60" />
              : <Text style={styles.summaryCount}>{report?.total_sales ?? 0} pedidos</Text>
            }
          </View>
          <View style={styles.summaryRight}>
            <View style={styles.approvedRow}>
              <CheckCircleIcon width={13} height={13} color="#4ADE80" />
              <Text style={styles.approvedText}>Aprovado</Text>
            </View>
            {isLoading
              ? <LoadingDots color="#FACC1560" />
              : <Text style={styles.summaryValue}>{formatBRL(report?.total_revenue ?? 0)}</Text>
            }
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Resultados{" "}
            {!isLoading && <Text style={styles.sectionCount}>({tableData.length} grupos)</Text>}
          </Text>
          <Text style={styles.sectionDate}>
            {report ? `${report.period.from} a ${report.period.to}` : ""}
          </Text>
        </View>

        <Table
          data={tableData}
          cellWidth={130}
          keyExtractor={(row) => row.utm_value}
          headers={
            <>
              <Text key="th-utm" style={styles.thText}>{applied.utm ?? "utm_source"}</Text>
              <Text key="th-sales" style={styles.thText}>Vendas</Text>
              <Text key="th-revenue" style={styles.thText}>Receita</Text>
            </>
          }
          renderRow={(row) => (
            <>
              <Text key="utm" style={styles.tdText}>{row.utm_value}</Text>
              <Text key="sales" style={styles.tdText}>{row.sales}</Text>
              <Text key="revenue" style={[styles.tdText, styles.tdValue]}>{formatBRL(row.revenue)}</Text>
            </>
          )}
        />
      </ScrollView>

      <BottomSheet visible={filtersOpen} title="Filtros" onClose={() => setFiltersOpen(false)} contentGap={0}>
        <CustomInput placeholder="Buscar UTM" value={search} onChangeText={setSearch} />
        <DateInput placeholder="Data inicial" value={dateFrom} onChangeText={setDateFrom} />
        <DateInput placeholder="Data final" value={dateTo} onChangeText={setDateTo} />
        <DropdownInput
          placeholder="Agrupar por"
          value={selectedUtm ?? ""}
          onValueChange={(val) => setSelectedUtm(val || null)}
          options={UTM_OPTIONS}
        />
        <View style={styles.filterActions}>
          <CustomButton label="Aplicar" type="primary" onPress={applyFilters} />
          <CustomButton label="Limpar" type="secondary" onPress={clearAll} />
        </View>
      </BottomSheet>
    </>
  );
}

export default function MetricsScreen() {
  return (
    <View style={styles.screen}>
      <HeaderNav />
      <MetricsContent />
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#111111",
  },
  fill: {
    flex: 1,
    backgroundColor: "#111111",
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 20,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  settingsBtn: {
    backgroundColor: "#FACC15",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    height: 42,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#ffffff",
  },
  calendarBtn: {
    backgroundColor: "#FACC15",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  groupLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#888888",
    marginRight: 10,
    flexShrink: 0,
  },
  badgeScroll: {
    flex: 1,
  },
  badgeList: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  badgeActive: {
    backgroundColor: "#FACC15",
    borderColor: "#FACC15",
  },
  badgeText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#FFFFFF",
  },
  badgeTextActive: {
    color: "#000000",
    fontFamily: "Inter_600SemiBold",
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#888888",
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  summaryRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  approvedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  approvedText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#4ADE80",
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: "#FACC15",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  sectionCount: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#888888",
  },
  sectionDate: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#888888",
  },
  thText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#888888",
  },
  tdText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#FFFFFF",
  },
  tdValue: {
    color: "#4ADE80",
    fontFamily: "Inter_600SemiBold",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  placeholderText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#888888",
  },
  filterActions: {
    gap: 12,
  },
  activeFiltersRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  activeFiltersLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#888888",
    marginRight: 10,
    flexShrink: 0,
  },
  activeFiltersList: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  filterBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#FACC15",
  },
  filterBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#000000",
  },
  filterBadgeX: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#000000",
  },
});
