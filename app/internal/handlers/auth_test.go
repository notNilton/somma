package handlers_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/nilbyte/tallyoh/backend/internal/testutil"
)

func TestRegister_Success(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)

	rec := testutil.Do(t, mux, "POST", "/auth/register", map[string]string{
		"email":    "test@example.com",
		"password": "secret123",
	}, "")

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}
	tok := testutil.Token(t, rec)
	if tok == "" {
		t.Fatal("expected sessionToken, got empty")
	}
}

func TestRegister_DuplicateEmail(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)

	testutil.RegisterUser(t, mux, "dup@example.com", "secret123")

	rec := testutil.Do(t, mux, "POST", "/auth/register", map[string]string{
		"email":    "dup@example.com",
		"password": "anotherpass",
	}, "")

	if rec.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestRegister_InvalidEmail(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)

	rec := testutil.Do(t, mux, "POST", "/auth/register", map[string]string{
		"email":    "not-an-email",
		"password": "secret123",
	}, "")

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestRegister_ShortPassword(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)

	rec := testutil.Do(t, mux, "POST", "/auth/register", map[string]string{
		"email":    "test@example.com",
		"password": "123",
	}, "")

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestLogin_Success(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)

	testutil.RegisterUser(t, mux, "login@example.com", "secret123")

	rec := testutil.Do(t, mux, "POST", "/auth/login", map[string]string{
		"email":    "login@example.com",
		"password": "secret123",
	}, "")

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	tok := testutil.Token(t, rec)
	if tok == "" {
		t.Fatal("expected sessionToken, got empty")
	}
}

func TestLogin_SetsSessionCookie(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)

	testutil.RegisterUser(t, mux, "cookie@example.com", "secret123")

	rec := testutil.Do(t, mux, "POST", "/auth/login", map[string]string{
		"email":    "cookie@example.com",
		"password": "secret123",
	}, "")

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	cookieHeader := rec.Header().Values("Set-Cookie")
	found := false
	for _, header := range cookieHeader {
		if strings.Contains(header, "tallyoh_session=") {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected session cookie, got headers: %v", cookieHeader)
	}
}

func TestLogin_WrongPassword(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)

	testutil.RegisterUser(t, mux, "wp@example.com", "secret123")

	rec := testutil.Do(t, mux, "POST", "/auth/login", map[string]string{
		"email":    "wp@example.com",
		"password": "wrongpassword",
	}, "")

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestLogin_NotFound(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)

	rec := testutil.Do(t, mux, "POST", "/auth/login", map[string]string{
		"email":    "nobody@example.com",
		"password": "secret123",
	}, "")

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestProtectedRoute_NoToken(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)

	rec := testutil.Do(t, mux, "GET", "/users/me", nil, "")

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rec.Code)
	}
}

func TestProtectedRoute_WithSessionCookie(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)

	testutil.RegisterUser(t, mux, "session@example.com", "secret123")
	loginRec := testutil.Do(t, mux, "POST", "/auth/login", map[string]string{
		"email":    "session@example.com",
		"password": "secret123",
	}, "")

	var sessionCookie string
	for _, cookie := range loginRec.Result().Cookies() {
		if cookie.Name == "tallyoh_session" {
			sessionCookie = cookie.Value
			break
		}
	}
	if sessionCookie == "" {
		t.Fatal("expected session cookie in login response")
	}

	req := httptest.NewRequest("GET", "/users/me", nil)
	req.AddCookie(&http.Cookie{Name: "tallyoh_session", Value: sessionCookie})
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
}
