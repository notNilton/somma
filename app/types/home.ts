export interface ChartPoint {
  date: string;
  revenue: number;
}

export interface PaymentMethods {
  cartao: number;
  pix: number;
  boleto: number;
}

export interface GeneralData {
  total_revenue: number;
  total_orders: number;
  average_ticket: number;
  /** Comissão total (campo pode vir como "commission" ou "comissao" da API) */
  commission: number;
  comissao?: number;
  payment_methods: PaymentMethods;
  chart: ChartPoint[];
  /** Receita total SEM juros (base para cálculos de comissão) */
  revenue_sem_juros?: number;
  /** Quantidade de pedidos SEM juros */
  orders_sem_juros?: number;
  /** Valor total de juros cobrados */
  interest_revenue?: number;
}

export interface SalesChannel {
  key: string;
  label: string;
  orders: number;
  revenue: number;
  percentage: number;
  /** Receita SEM juros deste canal */
  revenue_sem_juros?: number;
  /** Pedidos SEM juros deste canal */
  orders_sem_juros?: number;
  /** Percentual sobre a base SEM juros */
  percentage_sem_juros?: number;
}

export interface LastAccesses {
  site: { last_5min: number; last_30min: number };
  checkout: { last_5min: number; last_30min: number };
}

export interface HomeData {
  general: GeneralData;
  available_withdrawal: number;
  sales_channels: SalesChannel[];
  last_accesses: LastAccesses;
}

export interface HomeFilters {
  dt_inicial?: string;
  dt_final?: string;
}
