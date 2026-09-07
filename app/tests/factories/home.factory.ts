import { faker } from "@faker-js/faker";
import type { HomeData, ChartPoint, GeneralData, SalesChannel, PaymentMethods } from "@/types/home";
import type { UtmResponse, UtmRow, MetricsFilters } from "@/types/metrics";

export function createMockChartPoint(overrides: Partial<ChartPoint> = {}): ChartPoint {
  return {
    date: faker.date.recent().toISOString().split("T")[0],
    revenue: faker.number.int({ min: 50000, max: 500000 }),
    ...overrides,
  };
}

export function createMockChartPoints(count: number = 7): ChartPoint[] {
  return Array.from({ length: count }, (_, i) =>
    createMockChartPoint({
      date: new Date(Date.now() - (count - 1 - i) * 86400000).toISOString().split("T")[0],
    }),
  );
}

export function createMockPaymentMethods(overrides: Partial<PaymentMethods> = {}): PaymentMethods {
  return {
    cartao: faker.number.int({ min: 30, max: 80 }),
    pix: faker.number.int({ min: 10, max: 40 }),
    boleto: faker.number.int({ min: 0, max: 15 }),
    ...overrides,
  };
}

export function createMockGeneralData(overrides: Partial<GeneralData> = {}): GeneralData {
  return {
    total_revenue: faker.number.int({ min: 100000, max: 5000000 }),
    total_orders: faker.number.int({ min: 50, max: 1000 }),
    average_ticket: faker.number.int({ min: 1000, max: 10000 }),
    commission: faker.number.int({ min: 5000, max: 500000 }),
    payment_methods: createMockPaymentMethods(),
    chart: createMockChartPoints(),
    ...overrides,
  };
}

export function createMockSalesChannel(overrides: Partial<SalesChannel> = {}): SalesChannel {
  return {
    key: faker.helpers.slugify(faker.company.name()).toLowerCase(),
    label: faker.company.name(),
    orders: faker.number.int({ min: 10, max: 200 }),
    revenue: faker.number.int({ min: 50000, max: 500000 }),
    percentage: faker.number.int({ min: 0, max: 100 }),
    ...overrides,
  };
}

export function createMockSalesChannels(count: number = 4): SalesChannel[] {
  return Array.from({ length: count }, () => createMockSalesChannel());
}

export function createMockHomeData(overrides: Partial<HomeData> = {}): HomeData {
  return {
    general: createMockGeneralData(),
    available_withdrawal: faker.number.int({ min: 0, max: 200000 }),
    sales_channels: createMockSalesChannels(),
    last_accesses: {
      site: { last_5min: faker.number.int({ min: 0, max: 50 }), last_30min: faker.number.int({ min: 0, max: 200 }) },
      checkout: { last_5min: faker.number.int({ min: 0, max: 20 }), last_30min: faker.number.int({ min: 0, max: 80 }) },
    },
    ...overrides,
  };
}

export function createMockUtmRow(overrides: Partial<UtmRow> = {}): UtmRow {
  return {
    utm_value: faker.helpers.arrayElement(["google", "instagram", "organico", "email", "facebook"]),
    sales: faker.number.int({ min: 10, max: 500 }),
    revenue: faker.number.int({ min: 50000, max: 1000000 }),
    ...overrides,
  };
}

export function createMockUtmResponse(overrides: Partial<UtmResponse> = {}): UtmResponse {
  return {
    period: { from: "2025-01-01", to: "2025-12-31" },
    total_sales: faker.number.int({ min: 100, max: 2000 }),
    total_revenue: faker.number.int({ min: 100000, max: 5000000 }),
    data: Array.from({ length: 4 }, () => createMockUtmRow()),
    ...overrides,
  };
}

export function createMockMetricsFilters(overrides: Partial<MetricsFilters> = {}): MetricsFilters {
  return {
    dt_inicial: "2025-01-01",
    dt_final: "2025-12-31",
    group_by: "utm_source",
    ...overrides,
  };
}
