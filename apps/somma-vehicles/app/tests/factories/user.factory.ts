import { faker } from "@faker-js/faker";
import type { User, Profile } from "@/types/auth";

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.number.int({ min: 1, max: 9999 }),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    document: faker.string.numeric(11),
    profile_photo_url: faker.image.avatar(),
    telefone: "(11) 99999-9999",
    cpf: "000.000.000-00",
    instagram: `@${faker.internet.username()}`,
    ...overrides,
  };
}

export function createMockProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    full_name: faker.person.fullName(),
    email: faker.internet.email(),
    cpf: "000.000.000-00",
    birth_date: faker.date.birthdate().toISOString().split("T")[0],
    phone: "(11) 99999-9999",
    push_valor_tipo: "comissao",
    ...overrides,
  };
}

export function createMockLoginRequest(overrides: { email?: string; password?: string } = {}) {
  return {
    email: overrides.email ?? faker.internet.email(),
    password: overrides.password ?? faker.internet.password(),
  };
}

export function createMockLoginResponse(overrides: Partial<{ token: string; user: User; expires_in: number }> = {}) {
  return {
    token: overrides.token ?? faker.string.alphanumeric(64),
    token_type: "Bearer",
    expires_in: overrides.expires_in ?? 3600,
    user: overrides.user ?? createMockUser(),
  };
}
