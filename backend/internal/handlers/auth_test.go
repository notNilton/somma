package handlers_test

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/nilbyte/somma/backend/internal/testutil"
)

func TestRegister_Success(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)

	rec := testutil.Do(t, mux, "POST", "/auth/register", map[string]string{
		"email":    "test@example.com",
		"password": "secret123456",
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

	testutil.RegisterUser(t, mux, "dup@example.com", "secret123456")

	rec := testutil.Do(t, mux, "POST", "/auth/register", map[string]string{
		"email":    "dup@example.com",
		"password": "anotherpass123",
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
		"password": "secret123456",
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

	testutil.RegisterUser(t, mux, "login@example.com", "secret123456")

	rec := testutil.Do(t, mux, "POST", "/auth/login", map[string]string{
		"email":    "login@example.com",
		"password": "secret123456",
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

	testutil.RegisterUser(t, mux, "cookie@example.com", "secret123456")

	rec := testutil.Do(t, mux, "POST", "/auth/login", map[string]string{
		"email":    "cookie@example.com",
		"password": "secret123456",
	}, "")

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	cookieHeader := rec.Header().Values("Set-Cookie")
	found := false
	for _, header := range cookieHeader {
		if strings.Contains(header, "somma_session=") {
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

	testutil.RegisterUser(t, mux, "wp@example.com", "secret123456")

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
		"password": "secret123456",
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

	testutil.RegisterUser(t, mux, "session@example.com", "secret123456")
	loginRec := testutil.Do(t, mux, "POST", "/auth/login", map[string]string{
		"email":    "session@example.com",
		"password": "secret123456",
	}, "")

	var sessionCookie string
	for _, cookie := range loginRec.Result().Cookies() {
		if cookie.Name == "somma_session" {
			sessionCookie = cookie.Value
			break
		}
	}
	if sessionCookie == "" {
		t.Fatal("expected session cookie in login response")
	}

	req := httptest.NewRequest("GET", "/api/users/me", nil)
	req.AddCookie(&http.Cookie{Name: "somma_session", Value: sessionCookie})
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestForgotPassword_GenericResponse(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)

	// User does not exist
	rec := testutil.Do(t, mux, "POST", "/auth/forgot-password", map[string]string{
		"email": "notfound@example.com",
	}, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	// User exists
	testutil.RegisterUser(t, mux, "existing@example.com", "secret123456")
	rec2 := testutil.Do(t, mux, "POST", "/auth/forgot-password", map[string]string{
		"email": "existing@example.com",
	}, "")
	if rec2.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec2.Code, rec2.Body.String())
	}

	// Token must have been created in database
	var count int
	err := pool.QueryRow(context.Background(), `
		SELECT COUNT(*) FROM password_reset_tokens
	`).Scan(&count)
	if err != nil || count != 1 {
		t.Fatalf("expected 1 reset token in db, got %d (err: %v)", count, err)
	}
}

func TestResetPassword_Success(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)

	testutil.RegisterUser(t, mux, "resetme@example.com", "oldsecret123456")

	var userID string
	err := pool.QueryRow(context.Background(), `SELECT id FROM users WHERE email = $1`, "resetme@example.com").Scan(&userID)
	if err != nil {
		t.Fatalf("failed to find user: %v", err)
	}

	rawToken := "sample-test-token-12345"
	hash := sha256.Sum256([]byte(rawToken))
	tokenHash := hex.EncodeToString(hash[:])
	expiresAt := time.Now().Add(15 * time.Minute)

	_, err = pool.Exec(context.Background(), `
		INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
	`, userID, tokenHash, expiresAt)
	if err != nil {
		t.Fatalf("failed to insert reset token: %v", err)
	}

	// Reset password
	rec := testutil.Do(t, mux, "POST", "/auth/reset-password", map[string]string{
		"token":        rawToken,
		"new_password": "newsecret123456",
	}, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	// Verify token is used
	var usedAt *time.Time
	err = pool.QueryRow(context.Background(), `
		SELECT used_at FROM password_reset_tokens WHERE token_hash = $1
	`, tokenHash).Scan(&usedAt)
	if err != nil || usedAt == nil {
		t.Fatalf("expected token to be marked used, got used_at: %v", usedAt)
	}

	// Verify old password no longer works
	loginOld := testutil.Do(t, mux, "POST", "/auth/login", map[string]string{
		"email":    "resetme@example.com",
		"password": "oldsecret123456",
	}, "")
	if loginOld.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 with old password, got %d", loginOld.Code)
	}

	// Verify new password works
	loginNew := testutil.Do(t, mux, "POST", "/auth/login", map[string]string{
		"email":    "resetme@example.com",
		"password": "newsecret123456",
	}, "")
	if loginNew.Code != http.StatusOK {
		t.Fatalf("expected 200 with new password, got %d", loginNew.Code)
	}

	// Trying to use same token again must fail
	recReuse := testutil.Do(t, mux, "POST", "/auth/reset-password", map[string]string{
		"token":        rawToken,
		"new_password": "anothersecret123",
	}, "")
	if recReuse.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 when reusing token, got %d", recReuse.Code)
	}
}

func TestResetPassword_ExpiredToken(t *testing.T) {
	pool, mux := testutil.Setup(t)
	testutil.CleanTables(t, pool)

	testutil.RegisterUser(t, mux, "expired@example.com", "oldsecret123456")

	var userID string
	err := pool.QueryRow(context.Background(), `SELECT id FROM users WHERE email = $1`, "expired@example.com").Scan(&userID)
	if err != nil {
		t.Fatalf("failed to find user: %v", err)
	}

	rawToken := "expired-token-12345"
	hash := sha256.Sum256([]byte(rawToken))
	tokenHash := hex.EncodeToString(hash[:])
	expiredAt := time.Now().Add(-5 * time.Minute)

	_, err = pool.Exec(context.Background(), `
		INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
	`, userID, tokenHash, expiredAt)
	if err != nil {
		t.Fatalf("failed to insert expired reset token: %v", err)
	}

	rec := testutil.Do(t, mux, "POST", "/auth/reset-password", map[string]string{
		"token":        rawToken,
		"new_password": "newsecret123456",
	}, "")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for expired token, got %d: %s", rec.Code, rec.Body.String())
	}
}

