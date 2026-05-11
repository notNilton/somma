package middleware

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// RateLimiter provides per-IP rate limiting.
type RateLimiter struct {
	limiters map[string]*rate.Limiter
	mu       sync.RWMutex
	rate     rate.Limit
	burst    int
}

// NewRateLimiter creates a rate limiter with the given requests per second and burst size.
func NewRateLimiter(r rate.Limit, burst int) *RateLimiter {
	rl := &RateLimiter{
		limiters: make(map[string]*rate.Limiter),
		rate:     r,
		burst:    burst,
	}
	// Clean up old entries every 5 minutes
	go rl.cleanup()
	return rl
}

func (rl *RateLimiter) getLimiter(ip string) *rate.Limiter {
	rl.mu.RLock()
	lim, ok := rl.limiters[ip]
	rl.mu.RUnlock()
	if ok {
		return lim
	}

	rl.mu.Lock()
	defer rl.mu.Unlock()
	lim, ok = rl.limiters[ip]
	if ok {
		return lim
	}
	lim = rate.NewLimiter(rl.rate, rl.burst)
	rl.limiters[ip] = lim
	return lim
}

func (rl *RateLimiter) cleanup() {
	// Simple cleanup: create a fresh map every 5 minutes.
	// In production with high traffic, consider an LRU or TTL map.
	for {
		time.Sleep(5 * time.Minute)
		rl.mu.Lock()
		rl.limiters = make(map[string]*rate.Limiter)
		rl.mu.Unlock()
	}
}

// extractIP returns the client IP from the request.
// It respects X-Forwarded-For when behind a trusted proxy.
func extractIP(r *http.Request) string {
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		parts := strings.Split(xff, ",")
		ip := strings.TrimSpace(parts[0])
		if ip != "" {
			return ip
		}
	}
	xri := r.Header.Get("X-Real-Ip")
	if xri != "" {
		return strings.TrimSpace(xri)
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// Limit returns middleware that rate-limits requests per IP.
func (rl *RateLimiter) Limit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := extractIP(r)
		lim := rl.getLimiter(ip)
		if !lim.Allow() {
			http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}
