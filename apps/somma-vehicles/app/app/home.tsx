import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { vehiclesApi } from '../services/vehiclesApi';
import { AnalyticsSummary, CreateRefuelingPayload, RefuelingLog, Vehicle } from '../types/vehicles';
import { useFocusEffect } from 'expo-router';

export default function HomeScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [refuelings, setRefuelings] = useState<RefuelingLog[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [station, setStation] = useState('');
  const [fuelType, setFuelType] = useState('Gasolina');
  const [currentKm, setCurrentKm] = useState('');
  const [liters, setLiters] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [isFullTank, setIsFullTank] = useState(true);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [vList, rList, aData] = await Promise.all([
        vehiclesApi.getVehicles().catch(() => []),
        vehiclesApi.getRefuelings().catch(() => []),
        vehiclesApi.getAnalytics().catch(() => null),
      ]);
      setVehicles(vList);
      setRefuelings(rList);
      setAnalytics(aData);
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
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleOpenRefuelingModal = (vId?: string) => {
    const targetId = vId || (vehicles.length > 0 ? vehicles[0].id : '');
    setSelectedVehicleId(targetId);
    setStation('');
    setFuelType('Gasolina');
    setCurrentKm('');
    setLiters('');
    setPricePerLiter('');
    setTotalAmount('');
    setIsFullTank(true);
    setNotes('');
    setModalVisible(true);
  };

  const handleSaveRefueling = async () => {
    if (!selectedVehicleId || !liters || !totalAmount || !currentKm) {
      alert('Preencha os campos obrigatórios (Veículo, KM, Litros e Valor Total).');
      return;
    }

    setSubmitting(true);
    try {
      const totalCents = Math.round(parseFloat(totalAmount.replace(',', '.')) * 100);
      const priceCents = pricePerLiter
        ? Math.round(parseFloat(pricePerLiter.replace(',', '.')) * 100)
        : Math.round(totalCents / parseFloat(liters.replace(',', '.')));

      const payload: CreateRefuelingPayload = {
        vehicle_id: selectedVehicleId,
        date: new Date().toISOString().slice(0, 10),
        station: station || 'Posto',
        fuel_type: fuelType,
        current_km: parseInt(currentKm, 10),
        liters: parseFloat(liters.replace(',', '.')),
        price_per_liter_cents: priceCents,
        total_amount_cents: totalCents,
        is_full_tank: isFullTank,
        notes: notes || undefined,
      };

      await vehiclesApi.createRefueling(payload);
      setModalVisible(false);
      fetchData();
    } catch (err) {
      alert('Erro ao registrar abastecimento.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalSpentReais = analytics ? (analytics.total_spent_cents / 100).toFixed(2) : '0,00';
  const avgKmL = analytics?.avg_km_l ? analytics.avg_km_l.toFixed(2) : '0,00';
  const avgCostKm = analytics?.avg_cost_per_km ? analytics.avg_cost_per_km.toFixed(2) : '0,00';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
      >
        {/* Header Dashboard */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Somma Vehicles</Text>
            <Text style={styles.headerSubtitle}>Gestão de Frota & Combustível</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => handleOpenRefuelingModal()}>
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Global KPI Cards */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { borderColor: '#3B82F6' }]}>
            <Text style={styles.kpiLabel}>Total Gasto</Text>
            <Text style={styles.kpiValue}>R$ {totalSpentReais}</Text>
            <Text style={styles.kpiSub}>{analytics?.total_liters?.toFixed(1) || 0} L abastecidos</Text>
          </View>

          <View style={[styles.kpiCard, { borderColor: '#10B981' }]}>
            <Text style={styles.kpiLabel}>Consumo Médio</Text>
            <Text style={styles.kpiValue}>{avgKmL} km/L</Text>
            <Text style={styles.kpiSub}>{analytics?.total_refuelings || 0} abastecimentos</Text>
          </View>
        </View>

        {/* Vehicles List Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Meus Veículos ({vehicles.length})</Text>
          </View>

          {vehicles.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="car-outline" size={40} color="#6B7280" />
              <Text style={styles.emptyText}>Nenhum veículo cadastrado ainda.</Text>
            </View>
          ) : (
            vehicles.map((v) => (
              <View key={v.id} style={styles.vehicleCard}>
                <View style={styles.vehicleCardTop}>
                  <View>
                    <Text style={styles.vehicleName}>{v.name}</Text>
                    <Text style={styles.vehiclePlate}>{v.license_plate} • {v.brand} {v.model}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.refuelMiniButton}
                    onPress={() => handleOpenRefuelingModal(v.id)}
                  >
                    <Ionicons name="color-fill-outline" size={16} color="#3B82F6" />
                    <Text style={styles.refuelMiniText}>Abastecer</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.vehicleMetricsRow}>
                  <View style={styles.vMetric}>
                    <Text style={styles.vMetricVal}>{v.odometer_km} km</Text>
                    <Text style={styles.vMetricLbl}>Odômetro</Text>
                  </View>
                  <View style={styles.vMetric}>
                    <Text style={styles.vMetricVal}>{v.avg_km_l ? `${v.avg_km_l.toFixed(1)} km/L` : '—'}</Text>
                    <Text style={styles.vMetricLbl}>Méd. Consumo</Text>
                  </View>
                  <View style={styles.vMetric}>
                    <Text style={styles.vMetricVal}>R$ {((v.total_spent_cents || 0) / 100).toFixed(0)}</Text>
                    <Text style={styles.vMetricLbl}>Total Gasto</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Recent Refuelings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Últimos Abastecimentos</Text>

          {refuelings.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="water-outline" size={40} color="#6B7280" />
              <Text style={styles.emptyText}>Nenhum abastecimento registrado.</Text>
            </View>
          ) : (
            refuelings.slice(0, 8).map((r) => (
              <View key={r.id} style={styles.refuelingRow}>
                <View style={styles.refuelIconBox}>
                  <Ionicons name="speedometer-outline" size={20} color="#3B82F6" />
                </View>
                <View style={styles.refuelInfo}>
                  <Text style={styles.refuelVehicle}>{r.vehicle_name || 'Veículo'}</Text>
                  <Text style={styles.refuelDate}>{r.date} • {r.station}</Text>
                </View>
                <View style={styles.refuelValues}>
                  <Text style={styles.refuelAmount}>R$ {((r.total_amount_cents || 0) / 100).toFixed(2)}</Text>
                  <Text style={styles.refuelLiters}>{r.liters} L ({r.fuel_type})</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal Novo Abastecimento */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⛽ Novo Abastecimento</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>KM Atual *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 54200"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
                value={currentKm}
                onChangeText={setCurrentKm}
              />

              <View style={styles.inputRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Litros *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 45.5"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                    value={liters}
                    onChangeText={setLiters}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Valor Total (R$) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 250.00"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                    value={totalAmount}
                    onChangeText={setTotalAmount}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Posto / Estabelecimento</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Posto Shell Ipiranga"
                placeholderTextColor="#6B7280"
                value={station}
                onChangeText={setStation}
              />

              <Text style={styles.inputLabel}>Observações</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                placeholder="Opcional"
                placeholderTextColor="#6B7280"
                multiline
                value={notes}
                onChangeText={setNotes}
              />

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSaveRefueling}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Salvar Abastecimento</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginTop: 6,
  },
  kpiSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 12,
  },
  vehicleCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  vehicleCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  vehiclePlate: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  refuelMiniButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
  },
  refuelMiniText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#93C5FD',
  },
  vehicleMetricsRow: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    justifyContent: 'space-between',
  },
  vMetric: {
    alignItems: 'center',
  },
  vMetricVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  vMetricLbl: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
  },
  refuelingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  refuelIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  refuelInfo: {
    flex: 1,
  },
  refuelVehicle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  refuelDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  refuelValues: {
    alignItems: 'flex-end',
  },
  refuelAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#38BDF8',
  },
  refuelLiters: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  modalBody: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#F8FAFC',
    padding: 12,
    fontSize: 14,
    marginBottom: 14,
  },
  inputRow: {
    flexDirection: 'row',
  },
  submitBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
