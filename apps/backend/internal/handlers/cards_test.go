package handlers_test

import (
	"net/http"
	"testing"

	"github.com/nilbyte/mirante/backend/internal/testutil"
)

func createTestAccount(t *testing.T, mux interface{ ServeHTTP(http.ResponseWriter, *http.Request) }, tok string) string {
	t.Helper()
	// reuse testutil.Do via the mux ServeMux
	return ""
}

func TestCreateCard_Success(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "card@example.com", "secret123")

	// cria conta primeiro
	recAcc := testutil.Do(t, mux, "POST", "/api/v1/accounts", map[string]any{
		"name": "Conta Cartão",
		"type": "CHECKING",
	}, tok)
	var acc map[string]any
	testutil.DecodeJSON(t, recAcc, &acc)
	accID := acc["id"].(string)

	rec := testutil.Do(t, mux, "POST", "/api/v1/cards", map[string]any{
		"accountId": accID,
		"name":      "Meu Cartão",
		"brand":     "VISA",
		"last4":     "1234",
		"type":      "CREDIT",
	}, tok)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}

	var card map[string]any
	testutil.DecodeJSON(t, rec, &card)
	if card["name"] != "Meu Cartão" {
		t.Errorf("expected name=Meu Cartão, got %v", card["name"])
	}
	if card["accountId"] != accID {
		t.Errorf("expected accountId=%s, got %v", accID, card["accountId"])
	}
}

func TestListCards_Empty(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "cardlist@example.com", "secret123")

	rec := testutil.Do(t, mux, "GET", "/api/v1/cards", nil, tok)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var list []any
	testutil.DecodeJSON(t, rec, &list)
	if len(list) != 0 {
		t.Errorf("expected 0 cards, got %d", len(list))
	}
}

func TestDeleteCard_SoftDelete(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "carddel@example.com", "secret123")

	recAcc := testutil.Do(t, mux, "POST", "/api/v1/accounts", map[string]any{
		"name": "Conta",
		"type": "CHECKING",
	}, tok)
	var acc map[string]any
	testutil.DecodeJSON(t, recAcc, &acc)
	accID := acc["id"].(string)

	recCard := testutil.Do(t, mux, "POST", "/api/v1/cards", map[string]any{
		"accountId": accID,
		"name":      "Card Del",
		"type":      "DEBIT",
	}, tok)
	var card map[string]any
	testutil.DecodeJSON(t, recCard, &card)
	cardID := card["id"].(string)

	recDel := testutil.Do(t, mux, "DELETE", "/api/v1/cards/"+cardID, nil, tok)
	if recDel.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", recDel.Code)
	}

	recGet := testutil.Do(t, mux, "GET", "/api/v1/cards/"+cardID, nil, tok)
	if recGet.Code != http.StatusNotFound {
		t.Fatalf("expected 404 after delete, got %d", recGet.Code)
	}
}

func TestGetCard_OtherUserReturns404(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)

	tok1 := testutil.RegisterUser(t, mux, "cardowner@example.com", "secret123")
	tok2 := testutil.RegisterUser(t, mux, "cardother@example.com", "secret123")

	recAcc := testutil.Do(t, mux, "POST", "/api/v1/accounts", map[string]any{
		"name": "Conta",
		"type": "CHECKING",
	}, tok1)
	var acc map[string]any
	testutil.DecodeJSON(t, recAcc, &acc)

	recCard := testutil.Do(t, mux, "POST", "/api/v1/cards", map[string]any{
		"accountId": acc["id"].(string),
		"name":      "Card",
		"type":      "CREDIT",
	}, tok1)
	var card map[string]any
	testutil.DecodeJSON(t, recCard, &card)

	rec := testutil.Do(t, mux, "GET", "/api/v1/cards/"+card["id"].(string), nil, tok2)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", rec.Code)
	}
}
