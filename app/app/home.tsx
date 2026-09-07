import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { expensesApi } from '../services/expensesApi';
import { Category, CreateTransactionPayload, Transaction, TxKind, TxType } from '../types/expenses';
import { useFocusEffect } from 'expo-router';

export default function ExpensesHomeScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Month Selector
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [txType, setTxType] = useState<TxType>('EXPENSE');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const monthStr = month < 10 ? `0${month}` : `${month}`;
  const lastDay = new Date(year, month, 0).getDate();
  const fromDate = `${year}-${monthStr}-01`;
  const toDate = `${year}-${monthStr}-${lastDay < 10 ? `0${lastDay}` : lastDay}`;

  const fetchData = async () => {
    try {
      const [txs, cats] = await Promise.all([
        expensesApi.getTransactions(fromDate, toDate).catch(() => []),
        expensesApi.getCategories().catch(() => []),
      ]);
      setTransactions(txs);
      setCategories(cats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fromDate, toDate])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1));
  };

  const handleCreateTransaction = async () => {
    if (!description || !amount) {
      alert('Preencha a descrição e o valor.');
      return;
    }

    setSubmitting(true);
    try {
      const parsedAmount = parseFloat(amount.replace(',', '.'));
      const payload: CreateTransactionPayload = {
        type: txType,
        kind: txType as TxKind,
        amount: parsedAmount,
        description,
        date: new Date().toISOString().slice(0, 10),
        categoryId: selectedCategoryId || undefined,
        status: 'COMPLETED',
      };

      await expensesApi.createTransaction(payload);
      setModalVisible(false);
      setDescription('');
      setAmount('');
      setSelectedCategoryId('');
      fetchData();
    } catch (err) {
      alert('Erro ao salvar transação.');
    } finally {
      setSubmitting(false);
    }
  };

  // Totals calculation
  let totalIncome = 0;
  let totalExpense = 0;
  transactions.forEach((tx) => {
    const val = tx.amount || 0;
    if (tx.type === 'INCOME') totalIncome += val;
    else totalExpense += val;
  });
  const balance = totalIncome - totalExpense;

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Somma Expenses</Text>
            <Text style={styles.headerSubtitle}>Gestão Financeira Pessoal</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Month Navigator */}
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.arrowBtn}>
            <Ionicons name="chevron-back" size={20} color="#94A3B8" />
          </TouchableOpacity>
          <Text style={styles.monthText}>
            {monthNames[currentDate.getMonth()]} {year}
          </Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.arrowBtn}>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Summary Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Saldo do Mês</Text>
          <Text style={[styles.balanceValue, { color: balance >= 0 ? '#10B981' : '#EF4444' }]}>
            R$ {balance.toFixed(2)}
          </Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
              <View>
                <Text style={styles.summarySub}>Receitas</Text>
                <Text style={styles.summaryIncome}>+ R$ {totalIncome.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.summaryItem}>
              <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
              <View>
                <Text style={styles.summarySub}>Despesas</Text>
                <Text style={styles.summaryExpense}>- R$ {totalExpense.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Transactions List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transações ({transactions.length})</Text>

          {transactions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={44} color="#64748B" />
              <Text style={styles.emptyText}>Nenhuma transação neste período.</Text>
            </View>
          ) : (
            transactions.map((tx) => {
              const isIncome = tx.type === 'INCOME';
              return (
                <View key={tx.id} style={styles.txRow}>
                  <View
                    style={[
                      styles.txIconBox,
                      { backgroundColor: isIncome ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' },
                    ]}
                  >
                    <Ionicons
                      name={isIncome ? 'arrow-down-outline' : 'arrow-up-outline'}
                      size={20}
                      color={isIncome ? '#10B981' : '#EF4444'}
                    />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txDesc}>{tx.description}</Text>
                    <Text style={styles.txMeta}>
                      {tx.date ? tx.date.slice(0, 10) : ''} • {tx.category?.name || 'Geral'}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, { color: isIncome ? '#10B981' : '#F87171' }]}>
                    {isIncome ? '+' : '-'} R$ {(tx.amount || 0).toFixed(2)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Modal Nova Transação */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✨ Nova Transação</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Type selector */}
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeBtn, txType === 'EXPENSE' && styles.typeBtnActiveExpense]}
                onPress={() => setTxType('EXPENSE')}
              >
                <Text style={[styles.typeBtnText, txType === 'EXPENSE' && styles.typeBtnTextActive]}>Despesa</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, txType === 'INCOME' && styles.typeBtnActiveIncome]}
                onPress={() => setTxType('INCOME')}
              >
                <Text style={[styles.typeBtnText, txType === 'INCOME' && styles.typeBtnTextActive]}>Receita</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginBottom: 20 }}>
              <Text style={styles.label}>Descrição *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Supermercado, Salário, Aluguel"
                placeholderTextColor="#64748B"
                value={description}
                onChangeText={setDescription}
              />

              <Text style={styles.label}>Valor (R$) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 150.00"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />

              <Text style={styles.label}>Categoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                {categories.map((c) => {
                  const active = selectedCategoryId === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.catChip, active && styles.catChipActive]}
                      onPress={() => setSelectedCategoryId(active ? '' : c.id)}
                    >
                      <Text style={[styles.catChipText, active && styles.catChipTextActive]}>{c.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: txType === 'INCOME' ? '#10B981' : '#EF4444' }]}
                onPress={handleCreateTransaction}
                disabled={submitting}
              >
                {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Adicionar</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090D16' },
  loadingContainer: { flex: 1, backgroundColor: '#090D16', justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#F8FAFC' },
  headerSubtitle: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#131B2E',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  arrowBtn: { padding: 6 },
  monthText: { fontSize: 15, fontWeight: '700', color: '#F8FAFC' },
  balanceCard: {
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  balanceLabel: { fontSize: 12, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase' },
  balanceValue: { fontSize: 32, fontWeight: 'bold', marginVertical: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#1E293B' },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  summarySub: { fontSize: 11, color: '#64748B' },
  summaryIncome: { fontSize: 15, fontWeight: '700', color: '#10B981', marginTop: 2 },
  summaryExpense: { fontSize: 15, fontWeight: '700', color: '#EF4444', marginTop: 2 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#F1F5F9', marginBottom: 12 },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131B2E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  txIconBox: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 15, fontWeight: '600', color: '#F8FAFC' },
  txMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '700' },
  emptyCard: { backgroundColor: '#131B2E', borderRadius: 14, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#1E293B' },
  emptyText: { fontSize: 14, color: '#94A3B8', marginTop: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#131B2E', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#F8FAFC' },
  typeSelector: { flexDirection: 'row', backgroundColor: '#090D16', borderRadius: 10, padding: 4, marginBottom: 16 },
  typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  typeBtnActiveExpense: { backgroundColor: '#EF4444' },
  typeBtnActiveIncome: { backgroundColor: '#10B981' },
  typeBtnText: { color: '#94A3B8', fontWeight: '600' },
  typeBtnTextActive: { color: '#FFF' },
  label: { fontSize: 12, fontWeight: '600', color: '#94A3B8', marginBottom: 6 },
  input: {
    backgroundColor: '#090D16',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    color: '#F8FAFC',
    padding: 12,
    fontSize: 14,
    marginBottom: 14,
  },
  catChip: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#090D16', borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: '#1E293B' },
  catChipActive: { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.1)' },
  catChipText: { color: '#94A3B8', fontSize: 13 },
  catChipTextActive: { color: '#10B981', fontWeight: '700' },
  submitBtn: { borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
