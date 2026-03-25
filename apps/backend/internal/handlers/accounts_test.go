package handlers_test

import (
	"net/http"
	"testing"

	"github.com/nilbyte/mirante/backend/internal/testutil"
)

func TestCreateAccount_Success(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "acc@example.com", "secret123")

	rec := testutil.Do(t, mux, "POST", "/api/v1/accounts", map[string]any{
		"name": "Conta Corrente",
		"type": "CHECKING",
	}, tok)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}

	var resp map[string]any
	testutil.DecodeJSON(t, rec, &resp)
	if resp["name"] != "Conta Corrente" {
		t.Errorf("expected name=Conta Corrente, got %v", resp["name"])
	}
	if resp["type"] != "CHECKING" {
		t.Errorf("expected type=CHECKING, got %v", resp["type"])
	}
}

func TestCreateAccount_InvalidType(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "acc2@example.com", "secret123")

	rec := testutil.Do(t, mux, "POST", "/api/v1/accounts", map[string]any{
		"name": "Conta",
		"type": "CREDIT_CARD",
	}, tok)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestListAccounts_OnlyOwn(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)

	tok1 := testutil.RegisterUser(t, mux, "user1@example.com", "secret123")
	tok2 := testutil.RegisterUser(t, mux, "user2@example.com", "secret123")

	testutil.Do(t, mux, "POST", "/api/v1/accounts", map[string]any{
		"name": "Conta User 1",
		"type": "CHECKING",
	}, tok1)

	rec := testutil.Do(t, mux, "GET", "/api/v1/accounts", nil, tok2)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var list []any
	testutil.DecodeJSON(t, rec, &list)
	if len(list) != 0 {
		t.Errorf("user2 should see 0 accounts, got %d", len(list))
	}
}

func TestGetAccount_NotFound(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "acc3@example.com", "secret123")

	rec := testutil.Do(t, mux, "GET", "/api/v1/accounts/nonexistent-id", nil, tok)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", rec.Code)
	}
}

func TestGetAccount_OtherUserReturns404(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)

	tok1 := testutil.RegisterUser(t, mux, "own@example.com", "secret123")
	tok2 := testutil.RegisterUser(t, mux, "other@example.com", "secret123")

	rec := testutil.Do(t, mux, "POST", "/api/v1/accounts", map[string]any{
		"name": "Minha Conta",
		"type": "SAVINGS",
	}, tok1)
	var created map[string]any
	testutil.DecodeJSON(t, rec, &created)
	id := created["id"].(string)

	rec2 := testutil.Do(t, mux, "GET", "/api/v1/accounts/"+id, nil, tok2)
	if rec2.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", rec2.Code)
	}
}

func TestUpdateAccount(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "upd@example.com", "secret123")

	rec := testutil.Do(t, mux, "POST", "/api/v1/accounts", map[string]any{
		"name": "Original",
		"type": "CASH",
	}, tok)
	var created map[string]any
	testutil.DecodeJSON(t, rec, &created)
	id := created["id"].(string)

	rec2 := testutil.Do(t, mux, "PATCH", "/api/v1/accounts/"+id, map[string]any{
		"name": "Updated",
	}, tok)
	if rec2.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec2.Code, rec2.Body.String())
	}

	var updated map[string]any
	testutil.DecodeJSON(t, rec2, &updated)
	if updated["name"] != "Updated" {
		t.Errorf("expected name=Updated, got %v", updated["name"])
	}
}

func TestDeleteAccount_SoftDelete(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "del@example.com", "secret123")

	rec := testutil.Do(t, mux, "POST", "/api/v1/accounts", map[string]any{
		"name": "Para Deletar",
		"type": "WALLET",
	}, tok)
	var created map[string]any
	testutil.DecodeJSON(t, rec, &created)
	id := created["id"].(string)

	recDel := testutil.Do(t, mux, "DELETE", "/api/v1/accounts/"+id, nil, tok)
	if recDel.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", recDel.Code)
	}

	recGet := testutil.Do(t, mux, "GET", "/api/v1/accounts/"+id, nil, tok)
	if recGet.Code != http.StatusNotFound {
		t.Fatalf("expected 404 after delete, got %d", recGet.Code)
	}

	recList := testutil.Do(t, mux, "GET", "/api/v1/accounts", nil, tok)
	var list []any
	testutil.DecodeJSON(t, recList, &list)
	if len(list) != 0 {
		t.Errorf("expected 0 accounts after delete, got %d", len(list))
	}
}

func TestListAccounts_Empty(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "empty@example.com", "secret123")

	rec := testutil.Do(t, mux, "GET", "/api/v1/accounts", nil, tok)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var list []any
	testutil.DecodeJSON(t, rec, &list)
	if list == nil {
		t.Error("expected empty array, got nil")
	}
	if len(list) != 0 {
		t.Errorf("expected 0 accounts, got %d", len(list))
	}
}
