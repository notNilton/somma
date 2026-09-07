export interface UtmRow {
  utm_value: string;
  sales: number;
  revenue: number;
}

export interface UtmResponse {
  period: { from: string; to: string };
  total_sales: number;
  total_revenue: number;
  data: UtmRow[];
}

export interface MetricsFilters {
  dt_inicial?: string;
  dt_final?: string;
  group_by?: string;
  search?: string;
}
