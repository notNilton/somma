package web

import (
	"context"
	"net/http"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nilbyte/tallyoh/backend/internal/middleware"
)

type contextKey string

const userContextKey contextKey = "webuser"

// WebUser holds minimal user info for templates.
type WebUser struct {
	ID    string
	Name  string
	Email string
}

// RequireAuth validates JWT and injects WebUser into context.
// If unauthenticated, redirects to /login (or returns HX-Redirect for HTMX).
func RequireAuth(jwtKey []byte, db *pgxpool.Pool) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			claims, ok := validateWebToken(r, jwtKey, db)
			if !ok {
				if r.Header.Get("HX-Request") == "true" {
					w.Header().Set("HX-Redirect", "/login")
					w.WriteHeader(http.StatusUnauthorized)
					return
				}
				http.Redirect(w, r, "/login", http.StatusSeeOther)
				return
			}

			var name string
			_ = db.QueryRow(r.Context(), `SELECT COALESCE(name, email) FROM users WHERE id = $1`, claims.UserID).Scan(&name)

			wu := WebUser{
				ID:    claims.UserID,
				Name:  name,
				Email: claims.Email,
			}
			ctx := context.WithValue(r.Context(), userContextKey, wu)
			next(w, r.WithContext(ctx))
		}
	}
}

// UserFromContext extracts WebUser from context.
func UserFromContext(ctx context.Context) (WebUser, bool) {
	u, ok := ctx.Value(userContextKey).(WebUser)
	return u, ok
}

// RedirectIfAuth redirects authenticated users away from auth pages.
func RedirectIfAuth(jwtKey []byte, db *pgxpool.Pool) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			if _, ok := validateWebToken(r, jwtKey, db); ok {
				http.Redirect(w, r, "/", http.StatusSeeOther)
				return
			}
			next(w, r)
		}
	}
}

// validateWebToken extracts and validates a JWT from the request.
// It also checks the revoked_tokens table.
func validateWebToken(r *http.Request, jwtKey []byte, db *pgxpool.Pool) (middleware.AuthClaims, bool) {
	tokenStr, ok := tokenFromRequest(r)
	if !ok {
		return middleware.AuthClaims{}, false
	}

	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return jwtKey, nil
	})
	if err != nil || !token.Valid {
		return middleware.AuthClaims{}, false
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return middleware.AuthClaims{}, false
	}

	userID, ok := claims["sub"].(string)
	if !ok || userID == "" {
		return middleware.AuthClaims{}, false
	}
	email, ok := claims["email"].(string)
	if !ok || email == "" {
		return middleware.AuthClaims{}, false
	}

	jti, _ := claims["jti"].(string)
	if jti == "" {
		return middleware.AuthClaims{}, false
	}

	if db != nil {
		var revoked bool
		err := db.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM revoked_tokens WHERE jti = $1)`, jti).Scan(&revoked)
		if err != nil || revoked {
			return middleware.AuthClaims{}, false
		}
	}

	return middleware.AuthClaims{UserID: userID, Email: email, JTI: jti}, true
}

// tokenFromRequest extracts the session token from cookie or header.
func tokenFromRequest(r *http.Request) (string, bool) {
	header := r.Header.Get("Authorization")
	if len(header) > 7 && header[:7] == "Bearer " {
		return header[7:], true
	}
	c, err := r.Cookie("tallyoh_session")
	if err == nil && c.Value != "" {
		return c.Value, true
	}
	return "", false
}
