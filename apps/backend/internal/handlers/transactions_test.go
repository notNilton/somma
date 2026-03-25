package handlers_test

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/nilbyte/mirante/backend/internal/testutil"
)

// helperAccount cria uma conta e retorna seu ID.
func helperAccount(t *testing.T, mux *http.ServeMux, tok string) string {
	t.Helper()
	rec := testutil.Do(t, mux, "POST", "/api/v1/accounts", map[string]any{
		"name": "Conta Teste",
		"type": "CHECKING",
	}, tok)
	if rec.Code != http.StatusCreated {
		t.Fatalf("helperAccount: got %d: %s", rec.Code, rec.Body.String())
	}
	var acc map[string]any
	testutil.DecodeJSON(t, rec, &acc)
	return acc["id"].(string)
}

func TestCreateTransaction_Success(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "tx@example.com", "secret123")
	accID := helperAccount(t, mux, tok)

	rec := testutil.Do(t, mux, "POST", "/api/v1/transactions", map[string]any{
		"accountId":   accID,
		"type":        "EXPENSE",
		"amount":      50.00,
		"date":        "2026-03-01",
		"description": "Almoço",
	}, tok)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}

	var tx map[string]any
	testutil.DecodeJSON(t, rec, &tx)
	if tx["description"] != "Almoço" {
		t.Errorf("expected description=Almoço, got %v", tx["description"])
	}
	if tx["amount"].(float64) != 50.00 {
		t.Errorf("expected amount=50.00, got %v", tx["amount"])
	}
}

func TestCreateTransaction_MissingFields(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "txmissing@example.com", "secret123")

	rec := testutil.Do(t, mux, "POST", "/api/v1/transactions", map[string]any{
		"type":   "EXPENSE",
		"amount": 10.00,
		// sem accountId nem description
	}, tok)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestListTransactions_OnlyOwn(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)

	tok1 := testutil.RegisterUser(t, mux, "txu1@example.com", "secret123")
	tok2 := testutil.RegisterUser(t, mux, "txu2@example.com", "secret123")
	accID := helperAccount(t, mux, tok1)

	testutil.Do(t, mux, "POST", "/api/v1/transactions", map[string]any{
		"accountId":   accID,
		"type":        "EXPENSE",
		"amount":      10.00,
		"date":        "2026-03-01",
		"description": "Tx user1",
	}, tok1)

	rec := testutil.Do(t, mux, "GET", "/api/v1/transactions", nil, tok2)
	var list []any
	testutil.DecodeJSON(t, rec, &list)
	if len(list) != 0 {
		t.Errorf("user2 should see 0 transactions, got %d", len(list))
	}
}

func TestDeleteTransaction_SoftDelete(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "txdel@example.com", "secret123")
	accID := helperAccount(t, mux, tok)

	recTx := testutil.Do(t, mux, "POST", "/api/v1/transactions", map[string]any{
		"accountId":   accID,
		"type":        "EXPENSE",
		"amount":      25.00,
		"date":        "2026-03-01",
		"description": "Para deletar",
	}, tok)
	var tx map[string]any
	testutil.DecodeJSON(t, recTx, &tx)
	id := tx["id"].(string)

	recDel := testutil.Do(t, mux, "DELETE", "/api/v1/transactions/"+id, nil, tok)
	if recDel.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", recDel.Code)
	}

	recGet := testutil.Do(t, mux, "GET", "/api/v1/transactions/"+id, nil, tok)
	if recGet.Code != http.StatusNotFound {
		t.Fatalf("expected 404 after delete, got %d", recGet.Code)
	}
}

func TestListFutureTransactions(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "txfuture@example.com", "secret123")
	accID := helperAccount(t, mux, tok)

	// transação passada
	testutil.Do(t, mux, "POST", "/api/v1/transactions", map[string]any{
		"accountId":   accID,
		"type":        "EXPENSE",
		"amount":      10.00,
		"date":        "2020-01-01",
		"description": "Passada",
		"status":      "PAID",
	}, tok)

	// transação futura pendente
	testutil.Do(t, mux, "POST", "/api/v1/transactions", map[string]any{
		"accountId":   accID,
		"type":        "EXPENSE",
		"amount":      20.00,
		"date":        "2030-12-31",
		"description": "Futura",
		"status":      "PENDING",
	}, tok)

	rec := testutil.Do(t, mux, "GET", "/api/v1/transactions/future", nil, tok)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var list []any
	testutil.DecodeJSON(t, rec, &list)
	if len(list) != 1 {
		t.Errorf("expected 1 future transaction, got %d", len(list))
	}
}

func TestImportCSV_Success(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "csvimport@example.com", "secret123")
	accID := helperAccount(t, mux, tok)

	csvContent := "date,description,amount,type\n2026-01-15,Supermercado,150.00,EXPENSE\n2026-01-16,Salário,3000.00,INCOME\n"

	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	_ = w.WriteField("accountId", accID)
	fw, _ := w.CreateFormFile("file", "extrato.csv")
	fw.Write([]byte(csvContent))
	w.Close()

	req := httptest.NewRequest("POST", "/api/v1/transactions/import-csv", &buf)
	req.Header.Set("Content-Type", w.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+tok)

	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK && rec.Code != http.StatusCreated {
		t.Fatalf("expected 200/201, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestImportCSV_Deduplication(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "csvdedup@example.com", "secret123")
	accID := helperAccount(t, mux, tok)

	csvContent := "date,description,amount,type\n2026-01-15,Supermercado,150.00,EXPENSE\n"

	sendCSV := func() *httptest.ResponseRecorder {
		var buf bytes.Buffer
		w := multipart.NewWriter(&buf)
		_ = w.WriteField("accountId", accID)
		fw, _ := w.CreateFormFile("file", "extrato.csv")
		fw.Write([]byte(csvContent))
		w.Close()

		req := httptest.NewRequest("POST", "/api/v1/transactions/import-csv", &buf)
		req.Header.Set("Content-Type", w.FormDataContentType())
		req.Header.Set("Authorization", "Bearer "+tok)
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		return rec
	}

	rec1 := sendCSV()
	if rec1.Code != http.StatusOK && rec1.Code != http.StatusCreated {
		t.Fatalf("first import: expected 200/201, got %d: %s", rec1.Code, rec1.Body.String())
	}

	rec2 := sendCSV()
	if rec2.Code != http.StatusConflict {
		t.Fatalf("second import: expected 409 (duplicate), got %d: %s", rec2.Code, rec2.Body.String())
	}
}
