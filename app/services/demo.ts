import type { HomeData } from "@/types/home";
import type { UtmResponse } from "@/types/metrics";
import type { Notification } from "@/types/notifications";
import type { Profile, User } from "@/types/auth";
import type { Transaction, WalletBalance } from "@/types/wallet";

export let isDemoMode = false;
export const enableDemoMode = () => { isDemoMode = true; };
export const disableDemoMode = () => { isDemoMode = false; };

export const DEMO_USER: User = {
  id: 0,
  name: "Demo User",
  email: "demo@pagah.com",
  document: "000.000.000-00",
  profile_photo_url: null,
  telefone: "(11) 99999-9999",
  cpf: "000.000.000-00",
  instagram: "@demo",
};

export const DEMO_PROFILE: Profile = {
  first_name: "Demo",
  last_name: "User",
  full_name: "Demo User",
  email: "demo@pagah.com",
  cpf: "000.000.000-00",
  birth_date: null,
  phone: "(11) 99999-9999",
  push_valor_tipo: "comissao",
};

export const DEMO_HOME: HomeData = {
  general: {
    total_revenue: 1254890,
    total_orders: 342,
    average_ticket: 3669,
    commission: 125489,
    payment_methods: { cartao: 65, pix: 28, boleto: 7 },
    chart: [
      { date: "2025-04-30", revenue: 98000 },
      { date: "2025-05-01", revenue: 142000 },
      { date: "2025-05-02", revenue: 87500 },
      { date: "2025-05-03", revenue: 210000 },
      { date: "2025-05-04", revenue: 175000 },
      { date: "2025-05-05", revenue: 230000 },
      { date: "2025-05-06", revenue: 312390 },
    ],
    revenue_sem_juros: 987650,
    orders_sem_juros: 267,
    interest_revenue: 267240,
  },
  available_withdrawal: 48750,
  sales_channels: [
    { key: "site",        label: "Site",          orders: 145, revenue: 532100, percentage: 42, revenue_sem_juros: 418500, orders_sem_juros: 114, percentage_sem_juros: 42 },
    { key: "callcenter",  label: "Callcenter",    orders: 68,  revenue: 231200, percentage: 18, revenue_sem_juros: 177900, orders_sem_juros: 50,  percentage_sem_juros: 18 },
    { key: "orderbump",   label: "Order Bump",    orders: 52,  revenue: 180000, percentage: 14, revenue_sem_juros: 145000, orders_sem_juros: 42,  percentage_sem_juros: 14 },
    { key: "upsell",      label: "Upsell",        orders: 36,  revenue: 131790, percentage: 11, revenue_sem_juros: 104750, orders_sem_juros: 25,  percentage_sem_juros: 11 },
    { key: "afiliados",   label: "Afiliados",     orders: 98,  revenue: 359800, percentage: 0,  revenue_sem_juros: 286500, orders_sem_juros: 78,  percentage_sem_juros: 0  },
  ],
  last_accesses: {
    site: { last_5min: 12, last_30min: 47 },
    checkout: { last_5min: 3, last_30min: 11 },
  },
};

export const DEMO_METRICS: UtmResponse = {
  period: { from: "2025-04-01", to: "2025-05-06" },
  total_sales: 342,
  total_revenue: 1254890,
  data: [
    { utm_value: "google",    sales: 145, revenue: 532100 },
    { utm_value: "instagram", sales: 98,  revenue: 359800 },
    { utm_value: "organico",  sales: 63,  revenue: 231200 },
    { utm_value: "email",     sales: 36,  revenue: 131790 },
  ],
};

export const DEMO_BALANCE: WalletBalance = {
  available_for_withdrawal: 48750,
  available_to_anticipate: 125000,
  non_anticipatable: 8900,
  under_review: 15000,
  chargebacks: { count: 1, total_amount: 4990 },
};

export const DEMO_HISTORY: Transaction[] = [
  { id: "1", type: "withdraw",   value: 25000, date: "05/05/2025", time: "14:32", status: "paid" },
  { id: "2", type: "anticipate", value: 80000, date: "02/05/2025", time: "09:15", status: "paid" },
  { id: "3", type: "withdraw",   value: 15000, date: "28/04/2025", time: "17:48", status: "processing" },
  { id: "4", type: "anticipate", value: 40000, date: "20/04/2025", time: "11:00", status: "paid" },
  { id: "5", type: "withdraw",   value: 8000,  date: "10/04/2025", time: "08:22", status: "refused" },
];

export const DEMO_NOTIFICATIONS: Notification[] = [
  { id: "1", type: "cash",  message: "Você recebeu R$ 487,50 disponíveis para saque!" },
  { id: "2", type: "info",  message: "Seu relatório de métricas de abril está disponível." },
  { id: "3", type: "cash",  message: "Nova venda via Instagram: R$ 97,90." },
];
