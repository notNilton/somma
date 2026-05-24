package handlers_test

import (
	"net/http"
	"testing"

	"github.com/nilbyte/tallyoh/backend/internal/testutil"
)

func TestCreateCategory_Success(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "cat@example.com", "secret123")

	rec := testutil.Do(t, mux, "POST", "/api/v1/categories", map[string]any{
		"name":  "Alimentação",
		"type":  "EXPENSE",
		"color": "#FF5733",
	}, tok)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}

	var cat map[string]any
	testutil.DecodeJSON(t, rec, &cat)
	if cat["name"] != "Alimentação" {
		t.Errorf("expected name=Alimentação, got %v", cat["name"])
	}
}

func TestCreateCategory_WithParent(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "catparent@example.com", "secret123")

	recParent := testutil.Do(t, mux, "POST", "/api/v1/categories", map[string]any{
		"name": "Alimentação",
		"type": "EXPENSE",
	}, tok)
	var parent map[string]any
	testutil.DecodeJSON(t, recParent, &parent)
	parentID := parent["id"].(string)

	rec := testutil.Do(t, mux, "POST", "/api/v1/categories", map[string]any{
		"name":     "Restaurantes",
		"type":     "EXPENSE",
		"parentId": parentID,
	}, tok)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}

	var child map[string]any
	testutil.DecodeJSON(t, rec, &child)
	if child["parentId"] != parentID {
		t.Errorf("expected parentId=%s, got %v", parentID, child["parentId"])
	}
}

func TestListCategories_OnlyOwn(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)

	tok1 := testutil.RegisterUser(t, mux, "catu1@example.com", "secret123")
	tok2 := testutil.RegisterUser(t, mux, "catu2@example.com", "secret123")

	testutil.Do(t, mux, "POST", "/api/v1/categories", map[string]any{
		"name": "User1 Cat",
		"type": "EXPENSE",
	}, tok1)

	rec := testutil.Do(t, mux, "GET", "/api/v1/categories", nil, tok2)
	var list []any
	testutil.DecodeJSON(t, rec, &list)
	if len(list) != 0 {
		t.Errorf("user2 should see 0 categories, got %d", len(list))
	}
}

func TestDeleteCategory_SoftDelete(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "catdel@example.com", "secret123")

	rec := testutil.Do(t, mux, "POST", "/api/v1/categories", map[string]any{
		"name": "Para Deletar",
		"type": "INCOME",
	}, tok)
	var cat map[string]any
	testutil.DecodeJSON(t, rec, &cat)
	id := cat["id"].(string)

	recDel := testutil.Do(t, mux, "DELETE", "/api/v1/categories/"+id, nil, tok)
	if recDel.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", recDel.Code)
	}

	recGet := testutil.Do(t, mux, "GET", "/api/v1/categories/"+id, nil, tok)
	if recGet.Code != http.StatusNotFound {
		t.Fatalf("expected 404 after delete, got %d", recGet.Code)
	}
}

func TestUpdateCategory(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "catupd@example.com", "secret123")

	rec := testutil.Do(t, mux, "POST", "/api/v1/categories", map[string]any{
		"name": "Original",
		"type": "EXPENSE",
	}, tok)
	var cat map[string]any
	testutil.DecodeJSON(t, rec, &cat)
	id := cat["id"].(string)

	rec2 := testutil.Do(t, mux, "PATCH", "/api/v1/categories/"+id, map[string]any{
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
