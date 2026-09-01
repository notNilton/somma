import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { expensesApi } from '../services/expensesApi';
import { Budget } from '../types/expenses';
import { useFocusEffect } from 'expo-router';

export default function BudgetsScreen() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBudgets = async () => {
    try {
      const data = await expensesApi.getBudgets();
      setBudgets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBudgets();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Orçamentos & Envelopes</Text>
        <Text style={styles.headerSubtitle}>Acompanhe o teto de gastos por categoria</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={budgets}
          keyExtractor={(item) => item.id || item.categoryId}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => {
            const spent = (item.spentCents || 0) / 100;
            const limit = (item.limitCents || 0) / 100;
            const pct = Math.min(item.percentage || (limit > 0 ? (spent / limit) * 100 : 0), 100);
            const isExceeded = spent > limit;

            return (
              <View style={styles.budgetCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.catName}>{item.categoryName || 'Categoria'}</Text>
                  <Text style={[styles.pctText, isExceeded && { color: '#EF4444' }]}>
                    {pct.toFixed(0)}%
                  </Text>
                </View>

                {/* Progress bar */}
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${pct}%`, backgroundColor: isExceeded ? '#EF4444' : '#10B981' },
                    ]}
                  />
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.spentText}>Gasto: R$ {spent.toFixed(2)}</Text>
                  <Text style={styles.limitText}>Limite: R$ {limit.toFixed(2)}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Ionicons name="pie-chart-outline" size={48} color="#64748B" />
              <Text style={styles.emptyText}>Nenhum orçamento configurado.</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090D16' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#F8FAFC' },
  headerSubtitle: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  budgetCard: {
    backgroundColor: '#131B2E',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catName: { fontSize: 16, fontWeight: '700', color: '#F8FAFC' },
  pctText: { fontSize: 14, fontWeight: 'bold', color: '#10B981' },
  progressBarBg: {
    height: 8,
    backgroundColor: '#090D16',
    borderRadius: 4,
    marginVertical: 12,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  spentText: { fontSize: 13, color: '#CBD5E1', fontWeight: '500' },
  limitText: { fontSize: 13, color: '#64748B' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#94A3B8', marginTop: 12, fontSize: 15 },
});
