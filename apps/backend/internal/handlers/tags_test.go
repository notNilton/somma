package handlers_test

import (
	"net/http"
	"testing"

	"github.com/nilbyte/tallyoh/backend/internal/testutil"
)

func TestCreateTag_Success(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "tag@example.com", "secret123")

	rec := testutil.Do(t, mux, "POST", "/api/v1/tags", map[string]any{
		"name":  "Urgente",
		"color": "#FF0000",
	}, tok)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}

	var tag map[string]any
	testutil.DecodeJSON(t, rec, &tag)
	if tag["name"] != "Urgente" {
		t.Errorf("expected name=Urgente, got %v", tag["name"])
	}
}

func TestListTags_Empty(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "taglist@example.com", "secret123")

	rec := testutil.Do(t, mux, "GET", "/api/v1/tags", nil, tok)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var list []any
	testutil.DecodeJSON(t, rec, &list)
	if len(list) != 0 {
		t.Errorf("expected 0 tags, got %d", len(list))
	}
}

func TestUpdateTag(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "tagupd@example.com", "secret123")

	rec := testutil.Do(t, mux, "POST", "/api/v1/tags", map[string]any{
		"name": "Original",
	}, tok)
	var tag map[string]any
	testutil.DecodeJSON(t, rec, &tag)
	id := tag["id"].(string)

	rec2 := testutil.Do(t, mux, "PATCH", "/api/v1/tags/"+id, map[string]any{
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

func TestDeleteTag(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "tagdel@example.com", "secret123")

	rec := testutil.Do(t, mux, "POST", "/api/v1/tags", map[string]any{
		"name": "Para Deletar",
	}, tok)
	var tag map[string]any
	testutil.DecodeJSON(t, rec, &tag)
	id := tag["id"].(string)

	recDel := testutil.Do(t, mux, "DELETE", "/api/v1/tags/"+id, nil, tok)
	if recDel.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", recDel.Code)
	}

	recGet := testutil.Do(t, mux, "GET", "/api/v1/tags/"+id, nil, tok)
	if recGet.Code != http.StatusNotFound {
		t.Fatalf("expected 404 after delete, got %d", recGet.Code)
	}
}

func TestGetTag_NotFound(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "tagnf@example.com", "secret123")

	rec := testutil.Do(t, mux, "GET", "/api/v1/tags/nonexistent", nil, tok)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", rec.Code)
	}
}
