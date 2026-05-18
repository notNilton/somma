package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/nilbyte/tallyoh/backend/internal/middleware"
	"golang.org/x/crypto/bcrypt"
)

const sessionCookieName = "tallyoh_session"

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
