package handlers

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/nilbyte/somma/backend/internal/middleware"
	"golang.org/x/crypto/bcrypt"
)

const sessionCookieName = "somma_session"

type registerDto struct {
	Email    string  `json:"email"`
	Password string  `json:"password"`
	Name     *string `json:"name"`
	Phone    *string `json:"phone"`
	Cpf      *string `json:"cpf"`
	Cnpj     *string `json:"cnpj"`
}

func (d *registerDto) validate() error {
	if d.Email == "" || !strings.Contains(d.Email, "@") {
		return errors.New("valid email required")
	}
	if len(d.Password) < 12 {
		return errors.New("password min 12 chars")
	}
	return nil
}

type loginDto struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var dto registerDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := dto.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(dto.Password), 12)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	var userID string
	err = h.db.QueryRow(r.Context(), `
		INSERT INTO users (email, password_hash, name, phone, cpf, cnpj)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`, dto.Email, string(hash), dto.Name, dto.Phone, dto.Cpf, dto.Cnpj).Scan(&userID)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			writeError(w, http.StatusConflict, "email already in use")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	token, err := h.generateToken(userID, dto.Email)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	setSessionCookie(w, r, token, h.isProduction)
	log.Printf("[AUDIT] user registered: %s", dto.Email)
	writeJSON(w, http.StatusCreated, map[string]bool{"ok": true})
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var dto loginDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if dto.Email == "" || dto.Password == "" {
		writeError(w, http.StatusBadRequest, "email and password required")
		return
	}

	var userID, email, passwordHash string
	err := h.db.QueryRow(r.Context(), `
		SELECT id, email, password_hash FROM users WHERE email = $1
	`, dto.Email).Scan(&userID, &email, &passwordHash)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(dto.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	token, err := h.generateToken(userID, email)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	setSessionCookie(w, r, token, h.isProduction)
	log.Printf("[AUDIT] user logged in: %s", email)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *Handler) generateToken(userID, email string) (string, error) {
	jti, err := middleware.GenerateJTI()
	if err != nil {
		return "", err
	}
	claims := jwt.MapClaims{
		"sub":   userID,
		"email": email,
		"jti":   jti,
		"exp":   time.Now().Add(7 * 24 * time.Hour).Unix(),
		"iat":   time.Now().Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(h.jwtKey)
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if ok && claims.JTI != "" {
		_, _ = h.db.Exec(r.Context(), `
			INSERT INTO revoked_tokens (jti) VALUES ($1) ON CONFLICT DO NOTHING
		`, claims.JTI)
		log.Printf("[AUDIT] token revoked: %s", claims.JTI)
	}
	clearSessionCookie(w, r, h.isProduction)
	w.WriteHeader(http.StatusNoContent)
}

type forgotPasswordDto struct {
	Email string `json:"email"`
}

type resetPasswordDto struct {
	Token       string `json:"token"`
	NewPassword string `json:"new_password"`
}

func (h *Handler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var dto forgotPasswordDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	email := strings.TrimSpace(strings.ToLower(dto.Email))
	if email == "" || !strings.Contains(email, "@") {
		// Return generic 200 to avoid user enumeration
		writeJSON(w, http.StatusOK, map[string]string{
			"message": "Se o email estiver cadastrado, as instruções para redefinição foram enviadas.",
		})
		return
	}

	var userID string
	err := h.db.QueryRow(r.Context(), `SELECT id FROM users WHERE LOWER(email) = $1`, email).Scan(&userID)
	if err == nil {
		// User exists, generate random 32-byte secure token
		b := make([]byte, 32)
		if _, err := rand.Read(b); err == nil {
			rawToken := hex.EncodeToString(b)
			hash := sha256.Sum256([]byte(rawToken))
			tokenHash := hex.EncodeToString(hash[:])
			expiresAt := time.Now().Add(30 * time.Minute)

			_, insertErr := h.db.Exec(r.Context(), `
				INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
				VALUES ($1, $2, $3)
			`, userID, tokenHash, expiresAt)

			if insertErr != nil {
				log.Printf("[ERROR] Failed to save password reset token: %v", insertErr)
			} else if h.mailer != nil {
				resetURL := fmt.Sprintf("%s/reset-password?token=%s", strings.TrimRight(h.webappURL, "/"), rawToken)
				go func(to, url string) {
					if err := h.mailer.SendPasswordResetEmail(to, url); err != nil {
						log.Printf("[ERROR] Failed to send password reset email to %s: %v", to, err)
					}
				}(email, resetURL)
			}
		}
	}

	log.Printf("[AUDIT] password reset requested for: %s", email)
	writeJSON(w, http.StatusOK, map[string]string{
		"message": "Se o email estiver cadastrado, as instruções para redefinição foram enviadas.",
	})
}

func (h *Handler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var dto resetPasswordDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	token := strings.TrimSpace(dto.Token)
	if token == "" {
		writeError(w, http.StatusBadRequest, "token é obrigatório")
		return
	}

	if len(dto.NewPassword) < 12 {
		writeError(w, http.StatusBadRequest, "senha deve ter no mínimo 12 caracteres")
		return
	}

	hash := sha256.Sum256([]byte(token))
	tokenHash := hex.EncodeToString(hash[:])

	var resetID, userID string
	var expiresAt time.Time
	var usedAt *time.Time

	err := h.db.QueryRow(r.Context(), `
		SELECT id, user_id, expires_at, used_at
		FROM password_reset_tokens
		WHERE token_hash = $1
	`, tokenHash).Scan(&resetID, &userID, &expiresAt, &usedAt)

	if err != nil || usedAt != nil || time.Now().After(expiresAt) {
		writeError(w, http.StatusBadRequest, "token inválido ou expirado")
		return
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(dto.NewPassword), 12)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	tx, err := h.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer tx.Rollback(r.Context())

	// Update password
	_, err = tx.Exec(r.Context(), `
		UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2
	`, string(newHash), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Mark token as used
	_, err = tx.Exec(r.Context(), `
		UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1
	`, resetID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	log.Printf("[AUDIT] password successfully reset for user: %s", userID)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}


func setSessionCookie(w http.ResponseWriter, r *http.Request, token string, isProduction bool) {
	secure := isProduction || isSecureRequest(r)
	sameSite := http.SameSiteLaxMode
	if isProduction {
		sameSite = http.SameSiteStrictMode
	}
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: sameSite,
		Secure:   secure,
		MaxAge:   int((7 * 24 * time.Hour).Seconds()),
		Expires:  time.Now().Add(7 * 24 * time.Hour),
	})
}

func clearSessionCookie(w http.ResponseWriter, r *http.Request, isProduction bool) {
	secure := isProduction || isSecureRequest(r)
	sameSite := http.SameSiteLaxMode
	if isProduction {
		sameSite = http.SameSiteStrictMode
	}
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: sameSite,
		Secure:   secure,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
	})
}

func isSecureRequest(r *http.Request) bool {
	if r.TLS != nil {
		return true
	}
	return strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https")
}
