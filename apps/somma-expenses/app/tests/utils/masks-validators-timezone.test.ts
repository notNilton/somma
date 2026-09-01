// =========================================================================
// Testes para utilitários: masks, validators, timezone
// =========================================================================

import { applyPhoneMask, applyCpfMask, applyDateMask } from "@/utils/masks";
import { isValidEmail } from "@/utils/validators";
import { todayInBrazil, formatInBrazil, firstDayOfMonthInBrazil } from "@/utils/timezone";

// =========================================================================
// applyPhoneMask
// =========================================================================
describe("applyPhoneMask", () => {
  it("formata telefone com 10 dígitos (fixo)", () => {
    expect(applyPhoneMask("1132345678")).toBe("(11) 3234-5678");
  });

  it("formata telefone com 11 dígitos (celular com 9)", () => {
    expect(applyPhoneMask("11987654321")).toBe("(11) 98765-4321");
  });

  it("remove caracteres não numéricos", () => {
    expect(applyPhoneMask("(11) 98765-4321")).toBe("(11) 98765-4321");
  });

  it("trunca para 11 dígitos", () => {
    const result = applyPhoneMask("11987654321000");
    expect(result).toBe("(11) 98765-4321");
  });

  it("retorna formatação parcial com menos de 10 dígitos", () => {
    expect(applyPhoneMask("119")).toBe("(11) 9");
  });

  it("retorna string vazia para entrada vazia", () => {
    expect(applyPhoneMask("")).toBe("");
  });

  it("lida com entrada só de caracteres especiais", () => {
    expect(applyPhoneMask("() -")).toBe("");
  });
});

// =========================================================================
// applyCpfMask
// =========================================================================
describe("applyCpfMask", () => {
  it("formata CPF corretamente", () => {
    expect(applyCpfMask("12345678901")).toBe("123.456.789-01");
  });

  it("remove caracteres não numéricos", () => {
    expect(applyCpfMask("123.456.789-01")).toBe("123.456.789-01");
  });

  it("trunca para 11 dígitos", () => {
    expect(applyCpfMask("12345678901234")).toBe("123.456.789-01");
  });

  it("retorna formatação parcial com menos de 11 dígitos", () => {
    expect(applyCpfMask("123456")).toBe("123.456");
  });

  it("retorna string vazia para entrada vazia", () => {
    expect(applyCpfMask("")).toBe("");
  });

  it("lida com entrada com espaços", () => {
    expect(applyCpfMask("123 456 789 01")).toBe("123.456.789-01");
  });
});

// =========================================================================
// applyDateMask
// =========================================================================
describe("applyDateMask", () => {
  it("formata data no padrão DD/MM/YYYY", () => {
    expect(applyDateMask("01012025")).toBe("01/01/2025");
  });

  it("remove caracteres não numéricos", () => {
    expect(applyDateMask("01/01/2025")).toBe("01/01/2025");
  });

  it("trunca para 8 dígitos", () => {
    expect(applyDateMask("01012025123456")).toBe("01/01/2025");
  });

  it("retorna formatação parcial com menos de 8 dígitos", () => {
    expect(applyDateMask("0101")).toBe("01/01");
  });

  it("retorna string vazia para entrada vazia", () => {
    expect(applyDateMask("")).toBe("");
  });
});

// =========================================================================
// isValidEmail
// =========================================================================
describe("isValidEmail", () => {
  it("retorna true para email válido", () => {
    expect(isValidEmail("test@example.com")).toBe(true);
  });

  it("retorna true para email com subdomínio", () => {
    expect(isValidEmail("test@sub.example.com")).toBe(true);
  });

  it("retorna false para email sem @", () => {
    expect(isValidEmail("testexample.com")).toBe(false);
  });

  it("retorna false para email sem domínio", () => {
    expect(isValidEmail("test@")).toBe(false);
  });

  it("retorna false para email sem usuário", () => {
    expect(isValidEmail("@example.com")).toBe(false);
  });

  it("retorna false para string vazia", () => {
    expect(isValidEmail("")).toBe(false);
  });

  it("retorna false para email com espaços", () => {
    expect(isValidEmail("test @example.com")).toBe(false);
  });

  it("trim whitespace antes de validar", () => {
    expect(isValidEmail("  test@example.com  ")).toBe(true);
  });
});

// =========================================================================
// todayInBrazil
// =========================================================================
describe("todayInBrazil", () => {
  it("retorna string no formato YYYY-MM-DD", () => {
    const result = todayInBrazil();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("retorna data válida", () => {
    const result = todayInBrazil();
    const date = new Date(result + "T00:00:00-03:00");
    expect(date.toString()).not.toBe("Invalid Date");
  });
});

// =========================================================================
// formatInBrazil
// =========================================================================
describe("formatInBrazil", () => {
  it("retorna string no formato YYYY-MM-DD", () => {
    const result = formatInBrazil(new Date("2025-06-15T10:00:00Z"));
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("converte datas corretamente", () => {
    const result = formatInBrazil(new Date("2025-01-01T00:00:00-03:00"));
    expect(result).toBe("2025-01-01");
  });
});

// =========================================================================
// firstDayOfMonthInBrazil
// =========================================================================
describe("firstDayOfMonthInBrazil", () => {
  it("retorna string no formato YYYY-MM-DD", () => {
    const result = firstDayOfMonthInBrazil();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("o dia é sempre 01", () => {
    const result = firstDayOfMonthInBrazil();
    expect(result.endsWith("-01")).toBe(true);
  });
});
