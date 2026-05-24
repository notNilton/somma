package handlers

import (
	"embed"
	"fmt"
	"html/template"
	"net/http"
	"strings"
	"time"

	"github.com/nilbyte/tallyoh/web/internal/apiclient"
	"github.com/nilbyte/tallyoh/web/internal/config"
)

//go:embed templates
var templateFS embed.FS

type Handler struct {
	cfg   *config.Config
	api   *apiclient.Client
	tmpls *template.Template
}

func New(cfg *config.Config) *Handler {
	fm := template.FuncMap{
		"formatMoney":   formatMoney,
		"formatDate":    formatDate,
		"typeClass":     typeClass,
		"statusClass":   statusClass,
		"typeLabel":     typeLabel,
		"statusLabel":   statusLabel,
		"channelLabel":  channelLabel,
		"signPrefix":    signPrefix,
		"add":           func(a, b int) int { return a + b },
		"sub":           func(a, b int) int { return a - b },
		"derefString":   func(s *string) string {
			if s == nil {
				return ""
			}
			return *s
		},
	}
	tmpls := template.Must(
		template.New("").Funcs(fm).ParseFS(templateFS, "templates/*.html"),
	)
	return &Handler{cfg: cfg, api: apiclient.New(cfg.APIURL), tmpls: tmpls}
}

func (h *Handler) token(r *http.Request) string {
	c, err := r.Cookie("tallyoh_session")
	if err != nil {
		return ""
	}
	return c.Value
}

func (h *Handler) Root(w http.ResponseWriter, r *http.Request) {
	if h.token(r) == "" {
		http.Redirect(w, r, "/login", http.StatusFound)
		return
	}
	http.Redirect(w, r, "/transactions", http.StatusFound)
}

func (h *Handler) render(w http.ResponseWriter, status int, name string, data any) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(status)
	if err := h.tmpls.ExecuteTemplate(w, name, data); err != nil {
		http.Error(w, "render error: "+err.Error(), http.StatusInternalServerError)
	}
}

func (h *Handler) redirectLogin(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("HX-Request") == "true" {
		w.Header().Set("HX-Redirect", "/login")
		w.WriteHeader(http.StatusOK)
		return
	}
	http.Redirect(w, r, "/login", http.StatusFound)
}

// ── Template helpers ──────────────────────────────────────────────────────────

func formatMoney(amount float64) string {
	negative := amount < 0
	if negative {
		amount = -amount
	}
	whole := int64(amount)
	frac := int64((amount-float64(whole))*100 + 0.5)
	s := fmt.Sprintf("R$ %s,%02d", thousands(whole), frac)
	if negative {
		return "-" + s
	}
	return s
}

func thousands(n int64) string {
	s := fmt.Sprintf("%d", n)
	if len(s) <= 3 {
		return s
	}
	var b strings.Builder
	rem := len(s) % 3
	if rem > 0 {
		b.WriteString(s[:rem])
	}
	for i := rem; i < len(s); i += 3 {
		if i > 0 {
			b.WriteByte('.')
		}
		b.WriteString(s[i : i+3])
	}
	return b.String()
}

func formatDate(t time.Time) string {
	return t.Format("02/01/2006")
}

func signPrefix(txType string) string {
	switch txType {
	case "INCOME", "RETURN":
		return "+"
	case "EXPENSE":
		return "-"
	default:
		return ""
	}
}

func typeClass(t string) string {
	return strings.ToLower(t)
}

func statusClass(s string) string {
	return strings.ToLower(s)
}

func typeLabel(t string) string {
	switch t {
	case "INCOME":
		return "Receita"
	case "EXPENSE":
		return "Despesa"
	case "INVESTMENT":
		return "Investimento"
	case "CREDIT":
		return "Crédito"
	case "RETURN":
		return "Estorno"
	default:
		return t
	}
}

func statusLabel(s string) string {
	switch s {
	case "COMPLETED":
		return "Concluído"
	case "PENDING":
		return "Pendente"
	case "CANCELED":
		return "Cancelado"
	default:
		return s
	}
}

func channelLabel(c string) string {
	switch c {
	case "PIX":
		return "Pix"
	case "CARD_CREDIT":
		return "Crédito"
	case "CARD_DEBIT":
		return "Débito"
	case "BANK":
		return "Banco"
	default:
		return c
	}
}
