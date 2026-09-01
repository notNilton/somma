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
import { vehiclesApi } from '../services/vehiclesApi';
import { AnalyticsSummary, Vehicle } from '../types/vehicles';
import { useFocusEffect } from 'expo-router';

export default function AnalyticsScreen() {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    try {
      const [aData, vData] = await Promise.all([
        vehiclesApi.getAnalytics().catch(() => null),
        vehiclesApi.getVehicles().catch(() => []),
      ]);
      setAnalytics(aData);
      setVehicles(vData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAnalytics();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const totalSpent = analytics ? (analytics.total_spent_cents / 100).toFixed(2) : '0,00';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
      >
        <Text style={styles.headerTitle}>BI & Estatísticas</Text>
        <Text style={styles.headerSubtitle}>Indicadores e performance da sua frota</Text>

        {/* Big Cards */}
        <View style={styles.statBox}>
          <View style={styles.statIcon}>
            <Ionicons name="cash-outline" size={24} color="#10B981" />
          </View>
          <View>
            <Text style={styles.statLbl}>Gasto Total em Combustível</Text>
            <Text style={styles.statVal}>R$ {totalSpent}</Text>
          </View>
        </View>

        <View style={styles.gridRow}>
          <View style={[styles.miniStatBox, { borderColor: '#3B82F6' }]}>
            <Text style={styles.miniLbl}>Média Global</Text>
            <Text style={styles.miniVal}>{analytics?.avg_km_l?.toFixed(1) || '0.0'} km/L</Text>
          </View>
          <View style={[styles.miniStatBox, { borderColor: '#8B5CF6' }]}>
            <Text style={styles.miniLbl}>Custo por KM</Text>
            <Text style={styles.miniVal}>R$ {analytics?.avg_cost_per_km?.toFixed(2) || '0.00'}</Text>
          </View>
        </View>

        {/* Spend per Vehicle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gasto por Veículo</Text>
          {vehicles.map((v) => {
            const spent = (v.total_spent_cents || 0) / 100;
            return (
              <View key={v.id} style={styles.spendRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.spendName}>{v.name}</Text>
                  <Text style={styles.spendPlate}>{v.license_plate} • {v.brand} {v.model}</Text>
                </View>
                <Text style={styles.spendVal}>R$ {spent.toFixed(2)}</Text>
              </View>
            );
          })}
        </View>

        {/* Fuel price history table/list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Histórico de Preço de Combustível</Text>
          {analytics?.price_history && analytics.price_history.length > 0 ? (
            analytics.price_history.slice(0, 6).map((item, idx) => (
              <View key={idx} style={styles.priceRow}>
                <Text style={styles.priceDate}>{item.date}</Text>
                <Text style={styles.priceType}>{item.fuel_type}</Text>
                <Text style={styles.priceVal}>R$ {((item.price_per_liter_cents || 0) / 100).toFixed(3)}/L</Text>
              </View>
            ))
          ) : (
            <Text style={{ color: '#64748B', fontStyle: 'italic' }}>Sem histórico de preços registrado.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  loadingContainer: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#F8FAFC' },
  headerSubtitle: { fontSize: 13, color: '#94A3B8', marginTop: 2, marginBottom: 20 },
  statBox: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(16,185,129,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statLbl: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  statVal: { fontSize: 22, fontWeight: 'bold', color: '#F8FAFC', marginTop: 4 },
  gridRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  miniStatBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  miniLbl: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  miniVal: { fontSize: 18, fontWeight: 'bold', color: '#F8FAFC', marginTop: 6 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#F1F5F9', marginBottom: 12 },
  spendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  spendName: { fontSize: 15, fontWeight: '600', color: '#F8FAFC' },
  spendPlate: { fontSize: 12, color: '#64748B', marginTop: 2 },
  spendVal: { fontSize: 15, fontWeight: '700', color: '#38BDF8' },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  priceDate: { color: '#94A3B8', fontSize: 13 },
  priceType: { color: '#E2E8F0', fontSize: 13, fontWeight: '500' },
  priceVal: { color: '#10B981', fontSize: 13, fontWeight: '700' },
});
