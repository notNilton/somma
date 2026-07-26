package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type contextKey string

const claimsKey contextKey = "claims"
const sessionCookieName = "somma_session"
const DevUserID = "d290f1ee-6c54-4b01-90e6-d701748f0851"

type AuthClaims struct {
	UserID string
	Email  string
	JTI    string
}

func Auth(jwtKey []byte, db *pgxpool.Pool, isDev bool) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			tokenStr, ok := tokenFromRequest(r)
			if !ok {
				if isDev {
					// Fallback to default seed user for easy local testing
					ctx := context.WithValue(r.Context(), claimsKey, AuthClaims{
						UserID: DevUserID,
						Email:  "nilton.naab@gmail.com",
						JTI:    "dev-jti",
					})
					next(w, r.WithContext(ctx))
					return
				}
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
				if isDev {
					ctx := context.WithValue(r.Context(), claimsKey, AuthClaims{
						UserID: DevUserID,
						Email:  "nilton.naab@gmail.com",
						JTI:    "dev-jti",
					})
					next(w, r.WithContext(ctx))
					return
				}
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
			email, _ := claims["email"].(string)
			jti, _ := claims["jti"].(string)

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
