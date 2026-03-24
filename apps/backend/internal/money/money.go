package money

import "math"

// ToCents converte reais (float64) para centavos (int64).
// Ex: 10.50 → 1050
func ToCents(reais float64) int64 {
	return int64(math.Round(reais * 100))
}

// ToReais converte centavos (int64) para reais (float64).
// Ex: 1050 → 10.50
func ToReais(cents int64) float64 {
	return float64(cents) / 100.0
}

// ToCentsPtr converte *float64 para *int64 em centavos. Retorna nil se nil.
func ToCentsPtr(reais *float64) *int64 {
	if reais == nil {
		return nil
	}
	c := ToCents(*reais)
	return &c
}

// ToReaisPtr converte *int64 centavos para *float64 reais. Retorna nil se nil.
func ToReaisPtr(cents *int64) *float64 {
	if cents == nil {
		return nil
	}
	r := ToReais(*cents)
	return &r
}
