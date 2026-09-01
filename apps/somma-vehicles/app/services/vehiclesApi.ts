import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { AnalyticsSummary, CreateRefuelingPayload, CreateVehiclePayload, RefuelingLog, Vehicle } from '../types/vehicles';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://sommav.nilbyte.com.br';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const vehiclesApi = {
  // Vehicles
  getVehicles: async (): Promise<Vehicle[]> => {
    const res = await apiClient.get('/api/vehicles');
    return res.data?.data || res.data || [];
  },

  getVehicle: async (id: string): Promise<Vehicle> => {
    const res = await apiClient.get(`/api/vehicles/${id}`);
    return res.data?.data || res.data;
  },

  createVehicle: async (payload: CreateVehiclePayload): Promise<Vehicle> => {
    const res = await apiClient.post('/api/vehicles', payload);
    return res.data?.data || res.data;
  },

  updateVehicle: async (id: string, payload: Partial<CreateVehiclePayload>): Promise<Vehicle> => {
    const res = await apiClient.put(`/api/vehicles/${id}`, payload);
    return res.data?.data || res.data;
  },

  deleteVehicle: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/vehicles/${id}`);
  },

  // Refuelings
  getRefuelings: async (vehicleId?: string): Promise<RefuelingLog[]> => {
    const params = vehicleId ? { vehicle_id: vehicleId } : {};
    const res = await apiClient.get('/api/refuelings', { params });
    return res.data?.data || res.data || [];
  },

  createRefueling: async (payload: CreateRefuelingPayload): Promise<RefuelingLog> => {
    const res = await apiClient.post('/api/refuelings', payload);
    return res.data?.data || res.data;
  },

  updateRefueling: async (id: string, payload: Partial<CreateRefuelingPayload>): Promise<RefuelingLog> => {
    const res = await apiClient.put(`/api/refuelings/${id}`, payload);
    return res.data?.data || res.data;
  },

  deleteRefueling: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/refuelings/${id}`);
  },

  // Analytics
  getAnalytics: async (): Promise<AnalyticsSummary> => {
    const res = await apiClient.get('/api/analytics');
    return res.data?.data || res.data;
  },
};
