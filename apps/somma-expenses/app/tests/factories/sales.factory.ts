import { faker } from "@faker-js/faker";
import type { SaleRequest, SaleResponse } from "@/types/sales";

export function createMockSaleRequest(overrides: Partial<SaleRequest> = {}): SaleRequest {
  return {
    customer_name: faker.person.fullName(),
    amount: faker.number.int({ min: 1000, max: 500000 }),
    channel: faker.helpers.arrayElement(["Site", "Instagram", "Google", "Email"]),
    payment_method: faker.helpers.arrayElement(["Cartão de crédito", "Pix", "Boleto"]),
    ...overrides,
  };
}

export function createMockSaleResponse(overrides: Partial<SaleResponse> = {}): SaleResponse {
  return {
    id: faker.string.uuid(),
    ...overrides,
  };
}
