import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import PagerView from "@/components/PagerViewCompat";

import { BottomNav } from "@/components/BottomNav";
import { DailySummaryCard } from "@/components/DailySummaryCard";
import { GeneralDataCard } from "@/components/GeneralDataCard";
import { HeaderNav } from "@/components/HeaderNav";
import { PaymentMethodsCard } from "@/components/PaymentMethodsCard";
import { View } from "@/components/Themed";
import { MetricsContent } from "@/app/metrics";
import { homeService } from "@/services/home";
import { todayInBrazil } from "@/utils/timezone";
import type { HomeData, HomeFilters } from "@/types/home";

function todayFilters(): HomeFilters {
  const today = todayInBrazil();
  return { dt_inicial: today, dt_final: today };
}

export default function HomeScreen() {
  const { page } = useLocalSearchParams<{ page?: string }>();
  const initialPage = page !== undefined ? (Number.parseInt(page, 10) || 0) : 0;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const pagerRef = useRef<{ setPage: (page: number) => void } | null>(null);

  const [homeData, setHomeData]     = useState<HomeData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters]       = useState<HomeFilters>(todayFilters());
  const [periodLabel, setPeriodLabel] = useState("Hoje");

  async function loadHome(f: HomeFilters) {
    try {
      const data = await homeService.getHome(f);
      setHomeData(data);
    } catch {}
  }

  useEffect(() => {
    loadHome(filters).finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHome(filters);
    setRefreshing(false);
  }, [filters]);

  const handlePeriodChange = useCallback(async (newFilters: HomeFilters, label: string) => {
    setFilters(newFilters);
    setPeriodLabel(label);
    setLoading(true);
    await loadHome(newFilters);
    setLoading(false);
  }, []);

  const handlePageChange = (index: number) => {
    pagerRef.current?.setPage(index);
    setCurrentPage(index);
  };

  return (
    <View style={styles.screen}>
      <HeaderNav currentPage={currentPage} onPageChange={handlePageChange} />
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={initialPage}
        onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
      >
        <ScrollView
          key="0"
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <GeneralDataCard
            data={homeData?.general ?? null}
            loading={loading || refreshing}
            periodLabel={periodLabel}
            onPeriodChange={handlePeriodChange}
          />
          <PaymentMethodsCard channels={homeData?.sales_channels ?? []} loading={loading || refreshing} />
          <DailySummaryCard data={homeData?.last_accesses ?? null} loading={loading || refreshing} />
        </ScrollView>

        <MetricsContent key="1" />
      </PagerView>
      <BottomNav activeIndex={currentPage} onPageChange={handlePageChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  pager:  { flex: 1 },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 20,
  },
});
