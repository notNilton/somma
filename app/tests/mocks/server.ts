/**
 * MSW (Mock Service Worker) server setup for API mocking in tests.
 *
 * Usage in test file:
 *   import { server } from "@/tests/mocks/server";
 *   beforeAll(() => server.listen());
 *   afterEach(() => server.resetHandlers());
 *   afterAll(() => server.close());
 */
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

export const handlers = [
  // Auth endpoints
  http.post("*/api/app/login", () => {
    return HttpResponse.json({
      token: "msw-jwt-token",
      token_type: "Bearer",
      expires_in: 3600,
      user: {
        id: 1,
        name: "MSW Test User",
        email: "test@pagah.com",
        document: null,
        profile_photo_url: null,
        telefone: null,
        cpf: null,
        instagram: null,
      },
    });
  }),

  http.post("*/api/app/refresh", () => {
    return HttpResponse.json({
      token: "msw-refreshed-token",
      token_type: "Bearer",
      expires_in: 3600,
      user: {
        id: 1,
        name: "MSW Test User",
        email: "test@pagah.com",
        document: null,
        profile_photo_url: null,
        telefone: null,
        cpf: null,
        instagram: null,
      },
    });
  }),

  http.get("*/api/app/me", () => {
    return HttpResponse.json({
      id: 1,
      name: "MSW Test User",
      email: "test@pagah.com",
      document: null,
      profile_photo_url: null,
      telefone: null,
      cpf: null,
      instagram: null,
    });
  }),

  // Home endpoint
  http.get("*/api/app/home", () => {
    return HttpResponse.json({
      general: {
        total_revenue: 1254890,
        total_orders: 342,
        average_ticket: 3669,
        commission: 125489,
        payment_methods: { cartao: 65, pix: 28, boleto: 7 },
        chart: [],
      },
      available_withdrawal: 48750,
      sales_channels: [],
      last_accesses: {
        site: { last_5min: 12, last_30min: 47 },
        checkout: { last_5min: 3, last_30min: 11 },
      },
    });
  }),

  // Wallet endpoints
  http.get("*/api/app/saldo", () => {
    return HttpResponse.json({
      available_for_withdrawal: 48750,
      available_to_anticipate: 125000,
      non_anticipatable: 8900,
      under_review: 15000,
      chargebacks: { count: 1, total_amount: 4990 },
    });
  }),

  http.get("*/api/app/saques", () => {
    return HttpResponse.json({
      data: [],
    });
  }),

  // Notifications
  http.get("*/api/app/notificacoes", () => {
    return HttpResponse.json([]);
  }),

  // Push token
  http.post("*/api/app/salvar-token", () => {
    return HttpResponse.json({ status: "success" });
  }),

  http.delete("*/api/app/salvar-token", () => {
    return HttpResponse.json({ status: "success" });
  }),

  // Metrics
  http.get("*/api/app/utm", () => {
    return HttpResponse.json({
      period: { from: "2025-01-01", to: "2025-12-31" },
      total_sales: 0,
      total_revenue: 0,
      data: [],
    });
  }),

  // Sales
  http.post("*/api/app/vendas", () => {
    return HttpResponse.json({ id: "msw-order-123" });
  }),

  // Profile
  http.get("*/api/app/perfil", () => {
    return HttpResponse.json({
      first_name: "Test",
      last_name: "User",
      full_name: "Test User",
      email: "test@pagah.com",
      cpf: null,
      birth_date: null,
      phone: null,
    });
  }),

  http.put("*/api/app/perfil", async ({ request }) => {
    const body = await request.json() as Record<string, string>;
    return HttpResponse.json({
      first_name: body.first_name,
      last_name: body.last_name,
      full_name: `${body.first_name} ${body.last_name ?? ""}`,
      email: "test@pagah.com",
      cpf: null,
      birth_date: null,
      phone: null,
    });
  }),
];

export const server = setupServer(...handlers);
