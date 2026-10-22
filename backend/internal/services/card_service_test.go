package services

import (
	"testing"
	"time"
)

func TestInstallmentCalculationWithoutLosingCents(t *testing.T) {
	tests := []struct {
		name         string
		totalCents   int64
		installments int
		expectedP1   int64
		expectedRest int64
	}{
		{
			name:         "Divisão exata: 1600 em 2x",
			totalCents:   160000,
			installments: 2,
			expectedP1:   80000,
			expectedRest: 80000,
		},
		{
			name:         "Divisão com resto: 100 em 3x",
			totalCents:   10000,
			installments: 3,
			expectedP1:   3334, // 3333 + 1 (resto)
			expectedRest: 3333,
		},
		{
			name:         "Divisão com resto: 1000 em 7x",
			totalCents:   100000,
			installments: 7,
			expectedP1:   14285 + (100000 % 7), // 14285 + 5 = 14290
			expectedRest: 14285,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			baseAmount := tt.totalCents / int64(tt.installments)
			remainder := tt.totalCents % int64(tt.installments)

			p1 := baseAmount + remainder
			if p1 != tt.expectedP1 {
				t.Errorf("Parcela 1 = %d, esperado %d", p1, tt.expectedP1)
			}

			totalSum := p1
			for i := 2; i <= tt.installments; i++ {
				if baseAmount != tt.expectedRest {
					t.Errorf("Parcela %d = %d, esperado %d", i, baseAmount, tt.expectedRest)
				}
				totalSum += baseAmount
			}

			if totalSum != tt.totalCents {
				t.Fatalf("Soma das parcelas (%d) != Total Cents (%d)", totalSum, tt.totalCents)
			}
		})
	}
}

func TestInvoiceCycleDetermination(t *testing.T) {
	closingDay := 10

	// Caso 1: Compra feita dia 05/10 (antes do fechamento 10) -> ciclo de Outubro (10)
	purchaseBefore := time.Date(2026, 10, 5, 14, 0, 0, 0, time.UTC)
	startMonth := purchaseBefore.Month()
	startYear := purchaseBefore.Year()
	if purchaseBefore.Day() > closingDay {
		startMonth++
		if startMonth > 12 {
			startMonth = 1
			startYear++
		}
	}
	if startMonth != time.October || startYear != 2026 {
		t.Errorf("Esperado Outubro/2026, obtido %s/%d", startMonth, startYear)
	}

	// Caso 2: Compra feita dia 15/10 (depois do fechamento 10) -> ciclo de Novembro (11)
	purchaseAfter := time.Date(2026, 10, 15, 14, 0, 0, 0, time.UTC)
	startMonth = purchaseAfter.Month()
	startYear = purchaseAfter.Year()
	if purchaseAfter.Day() > closingDay {
		startMonth++
		if startMonth > 12 {
			startMonth = 1
			startYear++
		}
	}
	if startMonth != time.November || startYear != 2026 {
		t.Errorf("Esperado Novembro/2026, obtido %s/%d", startMonth, startYear)
	}

	// Caso 3: Compra feita dia 25/12 (depois do fechamento 10) -> virada de ano para Janeiro/2027
	purchaseEndOfYear := time.Date(2026, 12, 25, 14, 0, 0, 0, time.UTC)
	startMonth = purchaseEndOfYear.Month()
	startYear = purchaseEndOfYear.Year()
	if purchaseEndOfYear.Day() > closingDay {
		startMonth++
		if startMonth > 12 {
			startMonth = 1
			startYear++
		}
	}
	if startMonth != time.January || startYear != 2027 {
		t.Errorf("Esperado Janeiro/2027, obtido %s/%d", startMonth, startYear)
	}
}
