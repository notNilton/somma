package handlers_test

import (
	"net/http"
	"testing"

	"github.com/nilbyte/mirante/backend/internal/testutil"
)

func TestGetDashboard_EmptyUser(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "dash@example.com", "secret123")

	rec := testutil.Do(t, mux, "GET", "/api/v1/dashboard", nil, tok)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var resp map[string]any
	testutil.DecodeJSON(t, rec, &resp)

	// com zero dados, balanço total deve ser 0
	if bal, ok := resp["totalBalance"]; ok {
		if bal.(float64) != 0 {
			t.Errorf("expected totalBalance=0, got %v", bal)
		}
	}
}

func TestGetDashboard_WithTransactions(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "dashdata@example.com", "secret123")
	accID := helperAccount(t, mux, tok)

	// income
	testutil.Do(t, mux, "POST", "/api/v1/transactions", map[string]any{
		"accountId":   accID,
		"type":        "INCOME",
		"amount":      1000.00,
		"date":        "2026-03-01",
		"description": "Salário",
		"status":      "PAID",
	}, tok)

	// expense
	testutil.Do(t, mux, "POST", "/api/v1/transactions", map[string]any{
		"accountId":   accID,
		"type":        "EXPENSE",
		"amount":      300.00,
		"date":        "2026-03-10",
		"description": "Aluguel",
		"status":      "PAID",
	}, tok)

	rec := testutil.Do(t, mux, "GET", "/api/v1/dashboard", nil, tok)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var resp map[string]any
	testutil.DecodeJSON(t, rec, &resp)

	// verifica que campos existem na resposta
	fields := []string{"totalBalance", "monthIncome", "monthExpenses"}
	for _, f := range fields {
		if _, ok := resp[f]; !ok {
			t.Errorf("missing field %s in dashboard response", f)
		}
	}
}

func TestGetDashboard_Unauthorized(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)

	rec := testutil.Do(t, mux, "GET", "/api/v1/dashboard", nil, "")
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}
