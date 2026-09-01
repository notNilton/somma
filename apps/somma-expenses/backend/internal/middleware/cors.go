package middleware

import (
	"net/http"
	"strings"
)

// CORS returns a middleware that restricts allowed origins to the configured webapp URL.
// In production, CORS is not strictly needed (same-origin), but the whitelist is defense-in-depth.
func CORS(webappURL string, isProduction bool) func(http.Handler) http.Handler {
	allowed := map[string]bool{
		webappURL:       true,
		"http://localhost:3400": true,
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin != "" {
				if allowed[origin] || (!isProduction && strings.HasPrefix(origin, "http://localhost:")) {
					w.Header().Set("Access-Control-Allow-Origin", origin)
					w.Header().Set("Access-Control-Allow-Credentials", "true")
					w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS, PUT")
					w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-App-Version")
					if r.Method == "OPTIONS" {
						w.WriteHeader(http.StatusNoContent)
						return
					}
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}
