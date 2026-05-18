package web

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nilbyte/tallyoh/backend/internal/cache"
	"github.com/nilbyte/tallyoh/backend/internal/handlers"
	"github.com/nilbyte/tallyoh/backend/internal/middleware"
	"github.com/nilbyte/tallyoh/backend/internal/money"
	"golang.org/x/crypto/bcrypt"
)

// Handler holds web-specific dependencies.
type Handler struct {
	db           *pgxpool.Pool
	jwtKey       []byte
	engine       *Engine
	cache        *cache.Cache
	isProduction bool
}

// NewHandler creates a new web handler.
func NewHandler(db *pgxpool.Pool, jwtKey []byte, engine *Engine, c *cache.Cache, isProduction bool) *Handler {
	return &Handler{
		db: db, jwtKey: jwtKey, engine: engine,
		cache: c, isProduction: isProduction,
	}
}

// ============================================================
// Auth pages
// ============================================================

func (h *Handler) LoginPage(w http.ResponseWriter, r *http.Request) {
	h.engine.Render(w, r, "login", map[string]any{
		"Title": "Login",
	})
}

func (h *Handler) RegisterPage(w http.ResponseWriter, r *http.Request) {
	h.engine.Render(w, r, "register", map[string]any{
		"Title": "Criar conta",
	})
}

type webLoginDto struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		h.engine.Render(w, r, "login", map[string]any{
			"Title": "Login",
			"Error": "Dados inválidos",
		})
		return
	}

	email := strings.TrimSpace(r.FormValue("email"))
	password := r.FormValue("password")

	var userID, dbEmail, passwordHash string
	err := h.db.QueryRow(r.Context(), `SELECT id, email, password_hash FROM users WHERE email = $1`, email).
		Scan(&userID, &dbEmail, &passwordHash)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password)) != nil {
		h.engine.Render(w, r, "login", map[string]any{
			"Title": "Login",
			"Error": "Email ou senha inválidos",
			"Email": email,
		})
		return
	}

	token, err := h.generateToken(userID, dbEmail)
	if err != nil {
		h.engine.Render(w, r, "login", map[string]any{
			"Title": "Login",
			"Error": "Erro interno",
		})
		return
	}

	h.setSessionCookie(w, r, token)
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

type webRegisterDto struct {
	Email    string
	Password string
	Name     string
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		h.engine.Render(w, r, "register", map[string]any{
			"Title": "Criar conta",
			"Error": "Dados inválidos",
		})
		return
	}

	email := strings.TrimSpace(r.FormValue("email"))
	password := r.FormValue("password")
	name := strings.TrimSpace(r.FormValue("name"))

	if email == "" || !strings.Contains(email, "@") {
		h.engine.Render(w, r, "register", map[string]any{
			"Title": "Criar conta",
			"Error": "Email inválido",
			"Email": email,
			"Name":  name,
		})
		return
	}
	if len(password) < 12 {
		h.engine.Render(w, r, "register", map[string]any{
			"Title": "Criar conta",
			"Error": "Senha deve ter pelo menos 12 caracteres",
			"Email": email,
			"Name":  name,
		})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		h.engine.Render(w, r, "register", map[string]any{
			"Title": "Criar conta",
			"Error": "Erro interno",
		})
		return
	}

	var userID string
	err = h.db.QueryRow(r.Context(), `
		INSERT INTO users (email, password_hash, name)
		VALUES ($1, $2, $3)
		RETURNING id
	`, email, string(hash), strPtrOrNil(name)).Scan(&userID)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			h.engine.Render(w, r, "register", map[string]any{
				"Title": "Criar conta",
				"Error": "Email já está em uso",
				"Email": email,
				"Name":  name,
			})
			return
		}
		h.engine.Render(w, r, "register", map[string]any{
			"Title": "Criar conta",
			"Error": "Erro interno",
		})
		return
	}

	token, err := h.generateToken(userID, email)
	if err != nil {
		h.engine.Render(w, r, "register", map[string]any{
			"Title": "Criar conta",
			"Error": "Erro interno",
		})
		return
	}

	h.setSessionCookie(w, r, token)
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if ok && claims.JTI != "" {
		_, _ = h.db.Exec(r.Context(), `INSERT INTO revoked_tokens (jti) VALUES ($1) ON CONFLICT DO NOTHING`, claims.JTI)
	}
	h.clearSessionCookie(w, r)
	http.Redirect(w, r, "/login", http.StatusSeeOther)
}

// ============================================================
// Dashboard
// ============================================================

func (h *Handler) Dashboard(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	month := r.URL.Query().Get("month")
	if month == "" {
		month = time.Now().Format("2006-01")
	}
	monthDate := month + "-01"

	// User name (first name)
	userName := user.Name
	if idx := strings.Index(userName, " "); idx > 0 {
		userName = userName[:idx]
	}

	// Total balance
	var totalBalanceCents int64
	h.db.QueryRow(r.Context(), `
		SELECT COALESCE(SUM(
			CASE
				WHEN type = 'INCOME' AND affects_account = true THEN amount_cents
				WHEN type = 'EXPENSE' AND affects_account = true THEN -amount_cents
				ELSE 0
			END
		), 0)
		FROM transactions
		WHERE user_id = $1 AND is_active = true
	`, user.ID).Scan(&totalBalanceCents)

	// Monthly income/expenses
	var monthlyIncomeCents, monthlyExpensesCents int64
	rows, _ := h.db.Query(r.Context(), `
		SELECT type, COALESCE(SUM(amount_cents), 0)
		FROM transactions
		WHERE user_id = $1
		  AND is_active = true
		  AND affects_account = true
		  AND type IN ('INCOME', 'EXPENSE')
		  AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $2::date)
		GROUP BY type
	`, user.ID, monthDate)
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var txType string
			var cents int64
			rows.Scan(&txType, &cents)
			if txType == "INCOME" {
				monthlyIncomeCents = cents
			} else {
				monthlyExpensesCents = cents
			}
		}
	}

	// Recent transactions
	var recentTxs []map[string]any
	txRows, _ := h.db.Query(r.Context(), `
		SELECT t.id, t.description, t.amount_cents, t.type, t.date,
		       c.name AS category_name, c.color AS category_color
		FROM transactions t
		LEFT JOIN categories c ON c.id = t.category_id
		WHERE t.user_id = $1 AND t.is_active = true
		ORDER BY t.date DESC LIMIT 5
	`, user.ID)
	if txRows != nil {
		defer txRows.Close()
		for txRows.Next() {
			var id, description, txType string
			var categoryName, categoryColor *string
			var amountCents int64
			var date time.Time
			txRows.Scan(&id, &description, &amountCents, &txType, &date, &categoryName, &categoryColor)
			recentTxs = append(recentTxs, map[string]any{
				"ID":          id,
				"Description": description,
				"Amount":      money.ToReais(amountCents),
				"AmountCents": amountCents,
				"Type":        txType,
				"Date":        date,
				"CategoryName": categoryName,
				"CategoryColor": categoryColor,
			})
		}
	}

	// Cash flow last 7 days
	var cashFlow []map[string]any
	cfRows, _ := h.db.Query(r.Context(), `
		SELECT DATE(date) AS day, SUM(
			CASE
				WHEN type = 'INCOME' AND affects_account = true THEN amount_cents
				WHEN type = 'EXPENSE' AND affects_account = true THEN -amount_cents
				ELSE 0
			END
		) AS total
		FROM transactions
		WHERE user_id = $1
		  AND is_active = true
		  AND date >= NOW() - INTERVAL '7 days'
		GROUP BY DATE(date)
		ORDER BY day
	`, user.ID)
	if cfRows != nil {
		defer cfRows.Close()
		for cfRows.Next() {
			var day time.Time
			var totalCents int64
			cfRows.Scan(&day, &totalCents)
			cashFlow = append(cashFlow, map[string]any{
				"Day":   day,
				"Value": money.ToReais(totalCents),
			})
		}
	}

	if recentTxs == nil {
		recentTxs = []map[string]any{}
	}
	if cashFlow == nil {
		cashFlow = []map[string]any{}
	}

	h.engine.Render(w, r, "dashboard", map[string]any{
		"Title":           "Dashboard",
		"User":            user,
		"UserName":        userName,
		"Month":           month,
		"TotalBalance":    money.ToReais(totalBalanceCents),
		"TotalBalanceCents": totalBalanceCents,
		"MonthlyIncome":   money.ToReais(monthlyIncomeCents),
		"MonthlyExpenses": money.ToReais(monthlyExpensesCents),
		"SafeToSpend":     money.ToReais(totalBalanceCents - monthlyExpensesCents),
		"RecentTransactions": recentTxs,
		"CashFlow":        cashFlow,
	})
}

// ============================================================
// Helpers
// ============================================================

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

func (h *Handler) setSessionCookie(w http.ResponseWriter, r *http.Request, token string) {
	secure := h.isProduction || isSecureRequest(r)
	sameSite := http.SameSiteLaxMode
	if h.isProduction {
		sameSite = http.SameSiteStrictMode
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "tallyoh_session",
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: sameSite,
		Secure:   secure,
		MaxAge:   int((7 * 24 * time.Hour).Seconds()),
		Expires:  time.Now().Add(7 * 24 * time.Hour),
	})
}

func (h *Handler) clearSessionCookie(w http.ResponseWriter, r *http.Request) {
	secure := h.isProduction || isSecureRequest(r)
	sameSite := http.SameSiteLaxMode
	if h.isProduction {
		sameSite = http.SameSiteStrictMode
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "tallyoh_session",
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

func strPtrOrNil(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// ensure we satisfy the compiler for unused imports
var _ = handlers.New
var _ = context.Background
