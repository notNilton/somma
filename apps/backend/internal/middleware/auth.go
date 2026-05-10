package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const claimsKey contextKey = "claims"
const sessionCookieName = "personalledger_session"

type AuthClaims struct {
	UserID string
	Email  string
}

func Auth(jwtKey []byte) func(http.HandlerFunc) http.HandlerFunc {
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

			ac := AuthClaims{
				UserID: userID,
				Email:  email,
			}

			ctx := context.WithValue(r.Context(), claimsKey, ac)
			next(w, r.WithContext(ctx))
		}
	}
}

func ClaimsFromContext(ctx context.Context) AuthClaims {
	return ctx.Value(claimsKey).(AuthClaims)
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
