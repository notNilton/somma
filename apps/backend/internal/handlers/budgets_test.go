package handlers_test

import (
	"net/http"
	"testing"

	"github.com/nilbyte/tallyoh/backend/internal/testutil"
)

func TestCreateBudgetAndList(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "budget@example.com", "secret123")

	rec := testutil.Do(t, mux, "POST", "/api/v1/budgets", map[string]any{
		"name":            "Viagem para Sao Paulo",
		"allocatedAmount": 9000.00,
		"notes":           "Reserva para viagem futura",
	}, tok)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}

	var created map[string]any
	testutil.DecodeJSON(t, rec, &created)
	if created["name"] != "Viagem para Sao Paulo" {
		t.Fatalf("unexpected budget name: %v", created["name"])
	}
	if created["allocatedAmountCents"].(float64) != 900000 {
		t.Fatalf("unexpected allocatedAmountCents: %v", created["allocatedAmountCents"])
	}

	listRec := testutil.Do(t, mux, "GET", "/api/v1/budgets", nil, tok)
	if listRec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", listRec.Code, listRec.Body.String())
	}

	var list []map[string]any
	testutil.DecodeJSON(t, listRec, &list)
	if len(list) != 1 {
		t.Fatalf("expected 1 budget, got %d", len(list))
	}
	if list[0]["remainingCents"].(float64) != 900000 {
		t.Fatalf("unexpected remainingCents: %v", list[0]["remainingCents"])
	}
}

func TestBudgetEvolvesWithTransactions(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "evolve@example.com", "secret123")

	budgetRec := testutil.Do(t, mux, "POST", "/api/v1/budgets", map[string]any{
		"name":            "Orcamento de Teste",
		"allocatedAmount": 1000.00,
	}, tok)
	var budget map[string]any
	testutil.DecodeJSON(t, budgetRec, &budget)
	budgetID := budget["id"].(string)

	// Gasto vinculado ao budget.
	testutil.Do(t, mux, "POST", "/api/v1/transactions", map[string]any{
		"type":        "EXPENSE",
		"kind":        "BUDGET",
		"amount":      300.00,
		"date":        "2026-04-05",
		"description": "Cinema",
		"budgetId":    budgetID,
	}, tok)

	listRec := testutil.Do(t, mux, "GET", "/api/v1/budgets", nil, tok)
	var list []map[string]any
	testutil.DecodeJSON(t, listRec, &list)

	if list[0]["allocatedAmountCents"].(float64) != 100000 {
		t.Fatalf("expected 100000 allocated, got %v", list[0]["allocatedAmountCents"])
	}
	if list[0]["spentCents"].(float64) != 30000 {
		t.Fatalf("expected 30000 spent, got %v", list[0]["spentCents"])
	}
	if list[0]["remainingCents"].(float64) != 70000 {
		t.Fatalf("expected 70000 remaining, got %v", list[0]["remainingCents"])
	}
	if list[0]["progress"].(float64) != 30.0 {
		t.Fatalf("expected 30%% progress, got %v", list[0]["progress"])
	}
}
