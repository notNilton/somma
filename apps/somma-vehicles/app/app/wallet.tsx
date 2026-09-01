import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { vehiclesApi } from '../services/vehiclesApi';
import { CreateVehiclePayload, Vehicle } from '../types/vehicles';
import { useFocusEffect } from 'expo-router';

export default function VehiclesScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [tankLiters, setTankLiters] = useState('50');
  const [odometerKm, setOdometerKm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchVehicles = async () => {
    try {
      const data = await vehiclesApi.getVehicles();
      setVehicles(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchVehicles();
    }, [])
  );

  const handleCreateVehicle = async () => {
    if (!name || !licensePlate || !brand || !model || !odometerKm) {
      alert('Preencha os campos obrigatórios do veículo.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateVehiclePayload = {
        name,
        license_plate: licensePlate.toUpperCase(),
        brand,
        model,
        year: parseInt(year || '2024', 10),
        tank_liters: parseFloat(tankLiters || '50'),
        fuel_type: 'Flex',
        odometer_km: parseInt(odometerKm, 10),
      };

      await vehiclesApi.createVehicle(payload);
      setModalVisible(false);
      setName('');
      setLicensePlate('');
      setBrand('');
      setModel('');
      setOdometerKm('');
      fetchVehicles();
    } catch (err) {
      alert('Erro ao cadastrar veículo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Garagem & Frota</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.plate}>{item.license_plate} • {item.brand} {item.model} ({item.year})</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.fuel_type || 'Flex'}</Text>
                </View>
              </View>

              <View style={styles.grid}>
                <View style={styles.gridItem}>
                  <Text style={styles.gridVal}>{item.odometer_km} km</Text>
                  <Text style={styles.gridLbl}>Odômetro</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridVal}>{item.tank_liters} L</Text>
                  <Text style={styles.gridLbl}>Tanque</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridVal}>
                    {item.avg_km_l ? `${item.avg_km_l.toFixed(1)} km/L` : '—'}
                  </Text>
                  <Text style={styles.gridLbl}>Média</Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Ionicons name="car-sport-outline" size={48} color="#64748B" />
              <Text style={styles.emptyText}>Nenhum veículo adicionado.</Text>
            </View>
          )}
        />
      )}

      {/* Modal Novo Veículo */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🚗 Novo Veículo</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Apelido / Nome *</Text>
            <TextInput style={styles.input} placeholder="Ex: Corolla Preto" placeholderTextColor="#64748B" value={name} onChangeText={setName} />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Placa *</Text>
                <TextInput style={styles.input} placeholder="ABC1D23" placeholderTextColor="#64748B" autoCapitalize="characters" value={licensePlate} onChangeText={setLicensePlate} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>KM Inicial *</Text>
                <TextInput style={styles.input} placeholder="50000" placeholderTextColor="#64748B" keyboardType="numeric" value={odometerKm} onChangeText={setOdometerKm} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Marca *</Text>
                <TextInput style={styles.input} placeholder="Toyota" placeholderTextColor="#64748B" value={brand} onChangeText={setBrand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Modelo *</Text>
                <TextInput style={styles.input} placeholder="Corolla XEi" placeholderTextColor="#64748B" value={model} onChangeText={setModel} />
              </View>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleCreateVehicle} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Adicionar Veículo</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#F8FAFC' },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontSize: 17, fontWeight: '700', color: '#F8FAFC' },
  plate: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  badge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  badgeText: { fontSize: 11, color: '#60A5FA', fontWeight: '600' },
  grid: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    justifyContent: 'space-between',
  },
  gridItem: { alignItems: 'center' },
  gridVal: { fontSize: 14, fontWeight: '700', color: '#E2E8F0' },
  gridLbl: { fontSize: 11, color: '#64748B', marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#94A3B8', marginTop: 12, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#1E293B', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#F8FAFC' },
  label: { fontSize: 12, fontWeight: '600', color: '#94A3B8', marginBottom: 6 },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#F8FAFC',
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  saveBtn: { backgroundColor: '#3B82F6', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
