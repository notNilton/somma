package handlers_test

import (
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/nilbyte/mirante/backend/internal/testutil"
)

func helperCategory(t *testing.T, mux *http.ServeMux, tok, name string) string {
	t.Helper()
	rec := testutil.Do(t, mux, "POST", "/api/v1/categories", map[string]any{
		"name": name,
		"type": "EXPENSE",
	}, tok)
	if rec.Code != http.StatusCreated {
		t.Fatalf("helperCategory: got %d: %s", rec.Code, rec.Body.String())
	}
	var cat map[string]any
	testutil.DecodeJSON(t, rec, &cat)
	return cat["id"].(string)
}

func helperBudget(t *testing.T, mux *http.ServeMux, tok, catID string, amount float64, month, year int) string {
	t.Helper()
	rec := testutil.Do(t, mux, "POST", "/api/v1/budgets", map[string]any{
		"categoryId": catID,
		"amount":     amount,
		"month":      month,
		"year":       year,
	}, tok)
	if rec.Code != http.StatusCreated {
		t.Fatalf("helperBudget: got %d: %s", rec.Code, rec.Body.String())
	}
	var b map[string]any
	testutil.DecodeJSON(t, rec, &b)
	return b["id"].(string)
}

func TestBudgetStatus_SpentCalculation(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "budgetstatus@example.com", "secret123")
	accID := helperAccount(t, mux, tok)

	now := time.Now()
	catID := helperCategory(t, mux, tok, "Alimentacao")
	helperBudget(t, mux, tok, catID, 500.00, int(now.Month()), now.Year())

	// 2 despesas na categoria no mês atual
	for _, amt := range []float64{120.00, 80.00} {
		testutil.Do(t, mux, "POST", "/api/v1/transactions", map[string]any{
			"accountId":   accID,
			"type":        "EXPENSE",
			"categoryId":  catID,
			"amount":      amt,
			"date":        now.Format("2006-01-02"),
			"description": "Gasto alimentacao",
		}, tok)
	}

	month := now.Format("2006-01")
	rec := testutil.Do(t, mux, "GET", "/api/v1/budgets/status?month="+month, nil, tok)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var resp map[string]any
	testutil.DecodeJSON(t, rec, &resp)
	items := unwrapBudgetStatusItems(t, resp)

	if len(items) != 1 {
		t.Fatalf("expected 1 budget status item, got %d", len(items))
	}

	item := items[0]
	if item["categoryId"] != catID {
		t.Errorf("unexpected categoryId: %v", item["categoryId"])
	}
	if item["spent"].(float64) != 200.00 {
		t.Errorf("expected spent=200.00, got %v", item["spent"])
	}
	if item["remaining"].(float64) != 300.00 {
		t.Errorf("expected remaining=300.00, got %v", item["remaining"])
	}
	pct := item["percentUsed"].(float64)
	if pct < 39.9 || pct > 40.1 {
		t.Errorf("expected percentUsed≈40, got %v", pct)
	}
	if item["isOverBudget"].(bool) != false {
		t.Error("expected isOverBudget=false")
	}
}

func TestBudgetStatus_OverBudget(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "budgetover@example.com", "secret123")
	accID := helperAccount(t, mux, tok)

	now := time.Now()
	catID := helperCategory(t, mux, tok, "Lazer")
	helperBudget(t, mux, tok, catID, 100.00, int(now.Month()), now.Year())

	testutil.Do(t, mux, "POST", "/api/v1/transactions", map[string]any{
		"accountId":   accID,
		"type":        "EXPENSE",
		"categoryId":  catID,
		"amount":      150.00,
		"date":        now.Format("2006-01-02"),
		"description": "Gasto lazer",
	}, tok)

	rec := testutil.Do(t, mux, "GET", "/api/v1/budgets/status?month="+now.Format("2006-01"), nil, tok)
	var resp map[string]any
	testutil.DecodeJSON(t, rec, &resp)
	items := unwrapBudgetStatusItems(t, resp)

	if len(items) == 0 {
		t.Fatal("expected 1 budget status item")
	}
	if items[0]["isOverBudget"].(bool) != true {
		t.Error("expected isOverBudget=true when spent > amount")
	}
}

func TestBudgetStatus_TransfersNotCounted(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "budgettransfer@example.com", "secret123")

	accA := helperAccount(t, mux, tok)
	recB := testutil.Do(t, mux, "POST", "/api/v1/accounts", map[string]any{"name": "B", "type": "SAVINGS"}, tok)
	var accBMap map[string]any
	testutil.DecodeJSON(t, recB, &accBMap)

	now := time.Now()
	catID := helperCategory(t, mux, tok, "Moradia")
	helperBudget(t, mux, tok, catID, 1000.00, int(now.Month()), now.Year())

	// Criar transferência (não deve contar no budget)
	testutil.Do(t, mux, "POST", "/api/v1/transfers", map[string]any{
		"fromAccountId": accA,
		"toAccountId":   accBMap["id"],
		"amount":        500.00,
		"date":          now.Format("2006-01-02"),
	}, tok)

	rec := testutil.Do(t, mux, "GET", "/api/v1/budgets/status?month="+now.Format("2006-01"), nil, tok)
	var resp map[string]any
	testutil.DecodeJSON(t, rec, &resp)
	items := unwrapBudgetStatusItems(t, resp)

	if len(items) == 0 {
		t.Fatal("expected 1 budget status item")
	}
	if items[0]["spent"].(float64) != 0.00 {
		t.Errorf("transfers should not count towards budget, spent=%v", items[0]["spent"])
	}
}

func TestBudgetStatus_DifferentMonthsIsolated(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "budgetmonth@example.com", "secret123")
	accID := helperAccount(t, mux, tok)

	catID := helperCategory(t, mux, tok, "Transporte")
	helperBudget(t, mux, tok, catID, 300.00, 3, 2026)

	// Despesa em março
	testutil.Do(t, mux, "POST", "/api/v1/transactions", map[string]any{
		"accountId":   accID,
		"type":        "EXPENSE",
		"categoryId":  catID,
		"amount":      90.00,
		"date":        "2026-03-15",
		"description": "Uber marco",
	}, tok)

	// Consultar status de março — deve mostrar 90
	rec := testutil.Do(t, mux, "GET", "/api/v1/budgets/status?month=2026-03", nil, tok)
	var resp map[string]any
	testutil.DecodeJSON(t, rec, &resp)
	items := unwrapBudgetStatusItems(t, resp)

	if len(items) != 1 {
		t.Fatalf("expected 1 budget in march, got %d", len(items))
	}
	if items[0]["spent"].(float64) != 90.00 {
		t.Errorf("expected spent=90.00 in march, got %v", items[0]["spent"])
	}

	// Consultar status de abril — deve mostrar 0 gasto (sem orçamento cadastrado)
	recApr := testutil.Do(t, mux, "GET", "/api/v1/budgets/status?month=2026-04", nil, tok)
	var respApr map[string]any
	testutil.DecodeJSON(t, recApr, &respApr)
	itemsApr := unwrapBudgetStatusItems(t, respApr)

	if len(itemsApr) != 0 {
		t.Errorf("expected 0 budgets in april, got %d", len(itemsApr))
	}
}

func TestBudgetCRUD(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "budgetcrud@example.com", "secret123")

	catID := helperCategory(t, mux, tok, "Saude")

	// Create
	recCreate := testutil.Do(t, mux, "POST", "/api/v1/budgets", map[string]any{
		"categoryId": catID,
		"amount":     400.00,
		"month":      5,
		"year":       2026,
	}, tok)
	if recCreate.Code != http.StatusCreated {
		t.Fatalf("create: expected 201, got %d: %s", recCreate.Code, recCreate.Body.String())
	}
	var created map[string]any
	testutil.DecodeJSON(t, recCreate, &created)
	id := created["id"].(string)

	// Update
	recUpd := testutil.Do(t, mux, "PATCH", "/api/v1/budgets/"+id, map[string]any{
		"amount": 600.00,
	}, tok)
	if recUpd.Code != http.StatusOK {
		t.Fatalf("update: expected 200, got %d", recUpd.Code)
	}
	var updated map[string]any
	testutil.DecodeJSON(t, recUpd, &updated)
	if updated["limitAmount"].(float64) != 600.00 && updated["amount"].(float64) != 600.00 {
		t.Errorf("expected updated amount=600, got %v", updated)
	}

	// Delete
	recDel := testutil.Do(t, mux, "DELETE", "/api/v1/budgets/"+id, nil, tok)
	if recDel.Code != http.StatusNoContent {
		t.Fatalf("delete: expected 204, got %d", recDel.Code)
	}

	// Verify deleted
	var count int
	pool.QueryRow(t.Context(), `SELECT COUNT(*) FROM budgets WHERE id=$1 AND is_active=true`, id).Scan(&count)
	if count != 0 {
		t.Errorf("expected soft-deleted budget, but is_active=true still")
	}
}

func TestBudget_IsolationBetweenUsers(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)

	tok1 := testutil.RegisterUser(t, mux, "budgetiso1@example.com", "secret123")
	tok2 := testutil.RegisterUser(t, mux, "budgetiso2@example.com", "secret123")

	now := time.Now()
	catID := helperCategory(t, mux, tok1, "Educacao")
	helperBudget(t, mux, tok1, catID, 200.00, int(now.Month()), now.Year())

	rec := testutil.Do(t, mux, "GET",
		fmt.Sprintf("/api/v1/budgets?month=%s", now.Format("2006-01")), nil, tok2)
	var list []any
	testutil.DecodeJSON(t, rec, &list)
	if len(list) != 0 {
		t.Errorf("user2 should see 0 budgets, got %d", len(list))
	}
}

// unwrapBudgetStatusItems extrai o slice de items de qualquer forma de resposta do status endpoint.
func unwrapBudgetStatusItems(t *testing.T, resp map[string]any) []map[string]any {
	t.Helper()
	var raw []any
	if v, ok := resp["budgets"]; ok {
		raw, _ = v.([]any)
	} else if v, ok := resp["data"]; ok {
		raw, _ = v.([]any)
	}
	items := make([]map[string]any, 0, len(raw))
	for _, r := range raw {
		if m, ok := r.(map[string]any); ok {
			items = append(items, m)
		}
	}
	return items
}
