package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type contextKey string

const claimsKey contextKey = "claims"
const sessionCookieName = "tallyoh_session"

type AuthClaims struct {
	UserID string
	Email  string
	JTI    string
}

func Auth(jwtKey []byte, db *pgxpool.Pool) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			tokenStr, ok := tokenFromRequest(r)
			if !ok {
				http.Error(w, `{"error":"missing session"}`, http.StatusUnauthorized)
				return
			}

			token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return jwtKey, nil
			})
			if err != nil || !token.Valid {
				http.Error(w, `{"error":"invalid session"}`, http.StatusUnauthorized)
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				http.Error(w, `{"error":"invalid session claims"}`, http.StatusUnauthorized)
				return
			}

			userID, ok := claims["sub"].(string)
			if !ok || userID == "" {
				http.Error(w, `{"error":"invalid session claims"}`, http.StatusUnauthorized)
				return
			}
			email, ok := claims["email"].(string)
			if !ok || email == "" {
				http.Error(w, `{"error":"invalid session claims"}`, http.StatusUnauthorized)
				return
			}

			jti, _ := claims["jti"].(string)
			if jti == "" {
				http.Error(w, `{"error":"invalid session claims"}`, http.StatusUnauthorized)
				return
			}

			// Verify token has not been revoked
			if db != nil {
				var revoked bool
				err := db.QueryRow(r.Context(), `
					SELECT EXISTS(SELECT 1 FROM revoked_tokens WHERE jti = $1)
				`, jti).Scan(&revoked)
				if err != nil || revoked {
					http.Error(w, `{"error":"session revoked"}`, http.StatusUnauthorized)
					return
				}
			}

			ac := AuthClaims{
				UserID: userID,
				Email:  email,
				JTI:    jti,
			}

			ctx := context.WithValue(r.Context(), claimsKey, ac)
			next(w, r.WithContext(ctx))
		}
	}
}

func ClaimsFromContext(ctx context.Context) (AuthClaims, bool) {
	claims, ok := ctx.Value(claimsKey).(AuthClaims)
	return claims, ok
}

func tokenFromRequest(r *http.Request) (string, bool) {
	header := r.Header.Get("Authorization")
	if strings.HasPrefix(header, "Bearer ") {
		tokenStr := strings.TrimPrefix(header, "Bearer ")
		if tokenStr != "" {
			return tokenStr, true
		}
	}

	cookie, err := r.Cookie(sessionCookieName)
	if err == nil && cookie.Value != "" {
		return cookie.Value, true
	}

	return "", false
}

// GenerateJTI returns a new UUID to be used as a JWT ID.
func GenerateJTI() (string, error) {
	id, err := uuid.NewRandom()
	if err != nil {
		return "", err
	}
	return id.String(), nil
}
