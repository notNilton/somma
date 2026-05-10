package handlers_test

import (
	"net/http"
	"testing"

	"github.com/nilbyte/personalledger/backend/internal/testutil"
)

func TestGetProfile(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "profile@example.com", "secret123")

	rec := testutil.Do(t, mux, "GET", "/api/v1/settings/profile", nil, tok)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var resp map[string]any
	testutil.DecodeJSON(t, rec, &resp)
	if resp["email"] != "profile@example.com" {
		t.Errorf("expected email=profile@example.com, got %v", resp["email"])
	}
}

func TestUpdateProfile(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "updprofile@example.com", "secret123")

	rec := testutil.Do(t, mux, "PATCH", "/api/v1/settings/profile", map[string]any{
		"name":  "Novo Nome",
		"phone": "11999999999",
	}, tok)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var resp map[string]any
	testutil.DecodeJSON(t, rec, &resp)
	if resp["name"] != "Novo Nome" {
		t.Errorf("expected name=Novo Nome, got %v", resp["name"])
	}
}

func TestChangePassword_Success(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "chpwd@example.com", "oldpassword")

	rec := testutil.Do(t, mux, "PATCH", "/api/v1/settings/change-password", map[string]any{
		"currentPassword": "oldpassword",
		"newPassword":     "newpassword123",
	}, tok)

	if rec.Code != http.StatusNoContent && rec.Code != http.StatusOK {
		t.Fatalf("expected 204/200, got %d: %s", rec.Code, rec.Body.String())
	}

	// confirma que o novo password funciona no login
	recLogin := testutil.Do(t, mux, "POST", "/auth/login", map[string]string{
		"email":    "chpwd@example.com",
		"password": "newpassword123",
	}, "")
	if recLogin.Code != http.StatusOK {
		t.Fatalf("login with new password: expected 200, got %d", recLogin.Code)
	}
}

func TestChangePassword_WrongCurrent(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "wrongpwd@example.com", "correctpassword")

	rec := testutil.Do(t, mux, "PATCH", "/api/v1/settings/change-password", map[string]any{
		"currentPassword": "wrongpassword",
		"newPassword":     "newpassword123",
	}, tok)

	if rec.Code != http.StatusUnauthorized && rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 401/400, got %d", rec.Code)
	}
}

func TestDeleteMyAccount(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)
	tok := testutil.RegisterUser(t, mux, "deleteacc@example.com", "secret123")

	rec := testutil.Do(t, mux, "DELETE", "/api/v1/settings/account", nil, tok)
	if rec.Code != http.StatusNoContent && rec.Code != http.StatusOK {
		t.Fatalf("expected 204/200, got %d: %s", rec.Code, rec.Body.String())
	}

	// após deletar, token não deve mais funcionar
	recMe := testutil.Do(t, mux, "GET", "/api/v1/settings/profile", nil, tok)
	if recMe.Code == http.StatusOK {
		t.Error("deleted user should not be accessible")
	}
}

func TestGetProfile_Unauthorized(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)

	rec := testutil.Do(t, mux, "GET", "/api/v1/settings/profile", nil, "")
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}
