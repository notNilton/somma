package models

import (
	"errors"
	"strings"
)

const (
	DocumentCPF  = "CPF"
	DocumentCNPJ = "CNPJ"
)

// NormalizeDocument removes punctuation from a CPF or CNPJ, validates its check
// digits and returns the bare digits with the inferred document type.
func NormalizeDocument(raw string) (digits string, docType string, err error) {
	var b strings.Builder
	for _, r := range raw {
		switch {
		case r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == '.' || r == '-' || r == '/' || r == ' ':
		default:
			return "", "", errors.New("documento deve conter apenas números")
		}
	}
	digits = b.String()

	switch len(digits) {
	case 11:
		if !validCPF(digits) {
			return "", "", errors.New("CPF inválido")
		}
		return digits, DocumentCPF, nil
	case 14:
		if !validCNPJ(digits) {
			return "", "", errors.New("CNPJ inválido")
		}
		return digits, DocumentCNPJ, nil
	default:
		return "", "", errors.New("informe um CPF (11 dígitos) ou CNPJ (14 dígitos)")
	}
}

func allSameDigit(s string) bool {
	return strings.Count(s, s[:1]) == len(s)
}

func validCPF(d string) bool {
	if allSameDigit(d) {
		return false
	}
	for _, n := range []int{9, 10} {
		sum := 0
		for i := 0; i < n; i++ {
			sum += int(d[i]-'0') * (n + 1 - i)
		}
		check := sum * 10 % 11 % 10
		if check != int(d[n]-'0') {
			return false
		}
	}
	return true
}

func validCNPJ(d string) bool {
	if allSameDigit(d) {
		return false
	}
	weights := []int{6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2}
	for _, n := range []int{12, 13} {
		sum := 0
		w := weights[13-n:]
		for i := 0; i < n; i++ {
			sum += int(d[i]-'0') * w[i]
		}
		check := sum % 11
		if check < 2 {
			check = 0
		} else {
			check = 11 - check
		}
		if check != int(d[n]-'0') {
			return false
		}
	}
	return true
}
