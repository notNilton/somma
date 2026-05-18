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
		"name":       "Viagem para São Paulo",
		"targetDate": "2026-07-15",
		"notes":      "Reserva para viagem futura",
		"items": []map[string]any{
			{"name": "Hospedagem", "sortOrder": 0},
			{"name": "Alimentação", "sortOrder": 1},
		},
	}, tok)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}

	var created map[string]any
	testutil.DecodeJSON(t, rec, &created)
	if created["name"] != "Viagem para São Paulo" {
		t.Fatalf("unexpected budget name: %v", created["name"])
	}
	items, ok := created["items"].([]any)
	if !ok || len(items) != 2 {
		t.Fatalf("expected 2 items, got %#v", created["items"])
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
	if list[0]["targetDate"] != "2026-07-15" {
		t.Fatalf("unexpected targetDate: %v", list[0]["targetDate"])
	}
}

func TestBudgetEvolvesWithTransactions(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "evolve@example.com", "secret123")

	budgetRec := testutil.Do(t, mux, "POST", "/api/v1/budgets", map[string]any{
		"name":       "Orçamento de Teste",
		"targetDate": "2026-04-30",
		"items": []map[string]any{
			{"name": "Lazer", "sortOrder": 0},
		},
	}, tok)
	var budget map[string]any
	testutil.DecodeJSON(t, budgetRec, &budget)
	items := budget["items"].([]any)
	itemID := items[0].(map[string]any)["id"].(string)

	// 1. Alocar valor (INCOME para o budget)
	testutil.Do(t, mux, "POST", "/api/v1/transactions", map[string]any{
		"type":         "INCOME",
		"amount":       1000.00,
		"date":         "2026-04-01",
		"description":  "Aporte Lazer",
		"budgetItemId": itemID,
	}, tok)

	// 2. Gastar valor (EXPENSE para o budget)
	testutil.Do(t, mux, "POST", "/api/v1/transactions", map[string]any{
		"type":         "EXPENSE",
		"amount":       300.00,
		"date":         "2026-04-05",
		"description":  "Cinema",
		"budgetItemId": itemID,
	}, tok)

	// 3. Verificar status
	listRec := testutil.Do(t, mux, "GET", "/api/v1/budgets", nil, tok)
	var list []map[string]any
	testutil.DecodeJSON(t, listRec, &list)

	item := list[0]["items"].([]any)[0].(map[string]any)
	if item["amountCents"].(float64) != 100000 {
		t.Fatalf("expected 100000 budgeted, got %v", item["amountCents"])
	}
	if item["spentCents"].(float64) != 30000 {
		t.Fatalf("expected 30000 spent, got %v", item["spentCents"])
	}
	if item["remainingCents"].(float64) != 70000 {
		t.Fatalf("expected 70000 remaining, got %v", item["remainingCents"])
	}
	if item["progress"].(float64) != 30.0 {
		t.Fatalf("expected 30%% progress, got %v", item["progress"])
	}
}
