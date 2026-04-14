package handlers_test

import (
	"net/http"
	"testing"

	"github.com/nilbyte/mirante/backend/internal/testutil"
)

func TestCreateTransfer_Atomic(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "tr@example.com", "secret123")

	recFrom := testutil.Do(t, mux, "POST", "/api/v1/accounts", map[string]any{
		"name": "Conta Origem",
		"type": "CHECKING",
	}, tok)
	recTo := testutil.Do(t, mux, "POST", "/api/v1/accounts", map[string]any{
		"name": "Conta Destino",
		"type": "SAVINGS",
	}, tok)

	var from, to map[string]any
	testutil.DecodeJSON(t, recFrom, &from)
	testutil.DecodeJSON(t, recTo, &to)
	fromID := from["id"].(string)
	toID := to["id"].(string)

	rec := testutil.Do(t, mux, "POST", "/api/v1/transfers", map[string]any{
		"fromAccountId": fromID,
		"toAccountId":   toID,
		"amount":        200.00,
		"date":          "2026-03-15",
	}, tok)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}

	var transfer map[string]any
	testutil.DecodeJSON(t, rec, &transfer)
	if transfer["id"] == nil {
		t.Fatal("transfer id is nil")
	}
	if transfer["sourceTxId"] == nil || transfer["destinationTxId"] == nil {
		t.Fatal("transfer must have sourceTxId and destinationTxId")
	}

	var txCount int
	pool.QueryRow(t.Context(), `
		SELECT COUNT(*) FROM transactions
		WHERE id IN ($1, $2) AND is_active = true
	`, transfer["sourceTxId"], transfer["destinationTxId"]).Scan(&txCount)
	if txCount != 2 {
		t.Errorf("expected 2 linked transactions in DB, got %d", txCount)
	}

	var srcType, dstType string
	pool.QueryRow(t.Context(), `SELECT type FROM transactions WHERE id = $1`, transfer["sourceTxId"]).Scan(&srcType)
	pool.QueryRow(t.Context(), `SELECT type FROM transactions WHERE id = $1`, transfer["destinationTxId"]).Scan(&dstType)

	if srcType != "EXPENSE" {
		t.Errorf("source transaction type should be EXPENSE, got %s", srcType)
	}
	if dstType != "INCOME" {
		t.Errorf("destination transaction type should be INCOME, got %s", dstType)
	}
}

func TestCreateTransfer_ValidationErrors(t *testing.T) {
	_, mux := testutil.Setup(t)
	tok := testutil.RegisterUser(t, mux, "trval@example.com", "secret123")

	cases := []struct {
		name string
		body map[string]any
	}{
		{"sem fromAccountId", map[string]any{"toAccountId": "x", "amount": 10.0, "date": "2026-01-01"}},
		{"sem toAccountId", map[string]any{"fromAccountId": "x", "amount": 10.0, "date": "2026-01-01"}},
		{"mesma conta", map[string]any{"fromAccountId": "x", "toAccountId": "x", "amount": 10.0, "date": "2026-01-01"}},
		{"amount zero", map[string]any{"fromAccountId": "a", "toAccountId": "b", "amount": 0.0, "date": "2026-01-01"}},
		{"sem data", map[string]any{"fromAccountId": "a", "toAccountId": "b", "amount": 10.0}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := testutil.Do(t, mux, "POST", "/api/v1/transfers", tc.body, tok)
			if rec.Code != http.StatusBadRequest {
				t.Errorf("expected 400, got %d", rec.Code)
			}
		})
	}
}

func TestCreateTransfer_SameTxLinked(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "trlink@example.com", "secret123")

	recA := testutil.Do(t, mux, "POST", "/api/v1/accounts", map[string]any{"name": "A", "type": "CHECKING"}, tok)
	recB := testutil.Do(t, mux, "POST", "/api/v1/accounts", map[string]any{"name": "B", "type": "CHECKING"}, tok)
	var accA, accB map[string]any
	testutil.DecodeJSON(t, recA, &accA)
	testutil.DecodeJSON(t, recB, &accB)

	rec := testutil.Do(t, mux, "POST", "/api/v1/transfers", map[string]any{
		"fromAccountId": accA["id"],
		"toAccountId":   accB["id"],
		"amount":        50.00,
		"date":          "2026-04-01",
	}, tok)
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}

	var transfer map[string]any
	testutil.DecodeJSON(t, rec, &transfer)
	srcID := transfer["sourceTxId"].(string)
	dstID := transfer["destinationTxId"].(string)

	var linkSrcID, linkDstID string
	pool.QueryRow(t.Context(), `
		SELECT source_transaction_id, destination_transaction_id FROM transfers WHERE id = $1
	`, transfer["id"]).Scan(&linkSrcID, &linkDstID)

	if linkSrcID != srcID || linkDstID != dstID {
		t.Errorf("transfers table link mismatch: got src=%s dst=%s, want src=%s dst=%s",
			linkSrcID, linkDstID, srcID, dstID)
	}
}

func TestDeleteTransfer_SoftDeletesBothTxs(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "trdel@example.com", "secret123")

	recA := testutil.Do(t, mux, "POST", "/api/v1/accounts", map[string]any{"name": "A", "type": "CHECKING"}, tok)
	recB := testutil.Do(t, mux, "POST", "/api/v1/accounts", map[string]any{"name": "B", "type": "CHECKING"}, tok)
	var accA, accB map[string]any
	testutil.DecodeJSON(t, recA, &accA)
	testutil.DecodeJSON(t, recB, &accB)

	recTr := testutil.Do(t, mux, "POST", "/api/v1/transfers", map[string]any{
		"fromAccountId": accA["id"],
		"toAccountId":   accB["id"],
		"amount":        75.00,
		"date":          "2026-04-01",
	}, tok)
	var transfer map[string]any
	testutil.DecodeJSON(t, recTr, &transfer)

	recDel := testutil.Do(t, mux, "DELETE", "/api/v1/transfers/"+transfer["id"].(string), nil, tok)
	if recDel.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", recDel.Code)
	}

	var activeCount int
	pool.QueryRow(t.Context(), `
		SELECT COUNT(*) FROM transactions
		WHERE id IN ($1, $2) AND is_active = true
	`, transfer["sourceTxId"], transfer["destinationTxId"]).Scan(&activeCount)

	if activeCount != 0 {
		t.Errorf("expected both transactions soft-deleted (is_active=false), but %d still active", activeCount)
	}
}

func TestListTransfers_OnlyOwn(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)

	tok1 := testutil.RegisterUser(t, mux, "trown1@example.com", "secret123")
	tok2 := testutil.RegisterUser(t, mux, "trown2@example.com", "secret123")

	recA := testutil.Do(t, mux, "POST", "/api/v1/accounts", map[string]any{"name": "A1", "type": "CHECKING"}, tok1)
	recB := testutil.Do(t, mux, "POST", "/api/v1/accounts", map[string]any{"name": "B1", "type": "CHECKING"}, tok1)
	var accA, accB map[string]any
	testutil.DecodeJSON(t, recA, &accA)
	testutil.DecodeJSON(t, recB, &accB)

	testutil.Do(t, mux, "POST", "/api/v1/transfers", map[string]any{
		"fromAccountId": accA["id"],
		"toAccountId":   accB["id"],
		"amount":        30.00,
		"date":          "2026-04-01",
	}, tok1)

	rec := testutil.Do(t, mux, "GET", "/api/v1/transfers", nil, tok2)
	var list []any
	testutil.DecodeJSON(t, rec, &list)

	if len(list) != 0 {
		t.Errorf("user2 should see 0 transfers, got %d", len(list))
	}
}
