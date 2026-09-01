import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Category, CreateTransactionPayload, Transaction } from '../types/expenses';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://sommae.nilbyte.com.br';

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

export const expensesApi = {
  // Transactions
  getTransactions: async (from?: string, to?: string): Promise<Transaction[]> => {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const res = await apiClient.get('/api/v1/transactions', { params });
    return res.data?.data || res.data || [];
  },

  createTransaction: async (payload: CreateTransactionPayload): Promise<Transaction> => {
    const res = await apiClient.post('/api/v1/transactions', payload);
    return res.data?.data || res.data;
  },

  deleteTransaction: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/transactions/${id}`);
  },

  // Categories
  getCategories: async (): Promise<Category[]> => {
    const res = await apiClient.get('/api/v1/categories');
    return res.data?.data || res.data || [];
  },

  // Dashboard
  getDashboard: async (month?: string) => {
    const params = month ? { month } : {};
    const res = await apiClient.get('/api/v1/dashboard', { params });
    return res.data?.data || res.data;
  },

  // Budgets
  getBudgets: async (month?: string) => {
    const params = month ? { month } : {};
    const res = await apiClient.get('/api/v1/budgets', { params });
    return res.data?.data || res.data || [];
  },

  // Analytics Trends
  getTrends: async (type = 'EXPENSE') => {
    const res = await apiClient.get('/api/v1/analytics/trends', { params: { type } });
    return res.data?.data || res.data;
  },
};
