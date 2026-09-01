import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { expensesApi } from '../services/expensesApi';
import { useFocusEffect } from 'expo-router';

export default function AnalyticsScreen() {
  const [trends, setTrends] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrends = async () => {
    try {
      const data = await expensesApi.getTrends('EXPENSE');
      setTrends(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTrends();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrends();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  const items = trends?.items || [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
      >
        <Text style={styles.headerTitle}>Tendências & Analytics</Text>
        <Text style={styles.headerSubtitle}>Variação mês a mês e médias móveis por categoria</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Despesas por Categoria (Mês Atual)</Text>

          {items.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="analytics-outline" size={44} color="#64748B" />
              <Text style={styles.emptyText}>Sem dados suficientes para cálculo de tendências.</Text>
            </View>
          ) : (
            items.map((cat: any, idx: number) => {
              const delta = cat.deltaPct;
              const hasDelta = delta !== null && delta !== undefined;
              const isUp = hasDelta && delta > 0;

              return (
                <View key={idx} style={styles.catCard}>
                  <View style={styles.catCardHeader}>
                    <Text style={styles.catName}>{cat.categoryName || 'Outros'}</Text>
                    <Text style={styles.catTotal}>R$ {cat.total || '0,00'}</Text>
                  </View>

                  <View style={styles.metricsRow}>
                    <View style={styles.mItem}>
                      <Text style={styles.mLbl}>Média Móvel (3m)</Text>
                      <Text style={styles.mVal}>R$ {cat.movingAvg || '0,00'}</Text>
                    </View>
                    <View style={styles.mItem}>
                      <Text style={styles.mLbl}>Mês Anterior</Text>
                      <Text style={styles.mVal}>R$ {cat.prevMonth || '0,00'}</Text>
                    </View>
                    {hasDelta && (
                      <View style={styles.mItem}>
                        <Text style={styles.mLbl}>Variação</Text>
                        <Text style={[styles.mVal, { color: isUp ? '#EF4444' : '#10B981' }]}>
                          {isUp ? '+' : ''}{delta.toFixed(1)}%
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090D16' },
  loadingContainer: { flex: 1, backgroundColor: '#090D16', justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#F8FAFC' },
  headerSubtitle: { fontSize: 13, color: '#94A3B8', marginTop: 2, marginBottom: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#F1F5F9', marginBottom: 12 },
  catCard: {
    backgroundColor: '#131B2E',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  catCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catName: { fontSize: 16, fontWeight: '700', color: '#F8FAFC' },
  catTotal: { fontSize: 16, fontWeight: 'bold', color: '#EF4444' },
  metricsRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    justifyContent: 'space-between',
  },
  mItem: { alignItems: 'flex-start' },
  mLbl: { fontSize: 11, color: '#64748B' },
  mVal: { fontSize: 13, fontWeight: '600', color: '#CBD5E1', marginTop: 2 },
  emptyCard: { backgroundColor: '#131B2E', borderRadius: 14, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#1E293B' },
  emptyText: { fontSize: 14, color: '#94A3B8', marginTop: 10 },
});
