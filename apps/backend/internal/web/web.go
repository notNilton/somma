package web

import (
	"fmt"
	"html/template"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/nilbyte/tallyoh/backend/internal/money"
)

// Engine holds the parsed templates and helper functions.
type Engine struct {
	templates *template.Template
}

// NewEngine parses all templates from the templates directory recursively.
func NewEngine(templatesDir string) (*Engine, error) {
	funcMap := template.FuncMap{
		"formatMoney": func(v float64) string {
			return fmt.Sprintf("R$ %.2f", v)
		},
		"formatMoneyCents": func(cents int64) string {
			return fmt.Sprintf("R$ %.2f", money.ToReais(cents))
		},
		"formatDate": func(t time.Time) string {
			return t.Format("02/01/2006")
		},
		"formatDateShort": func(t time.Time) string {
			return t.Format("02/01")
		},
		"formatMonth": func(monthStr string) string {
			// monthStr expected as "2006-01"
			t, err := time.Parse("2006-01", monthStr)
			if err != nil {
				return monthStr
			}
			return strings.ToUpper(t.Format("January 2006"))
		},
		"lower": strings.ToLower,
		"upper": strings.ToUpper,
		"title": strings.Title,
		"eq": func(a, b any) bool {
			return fmt.Sprintf("%v", a) == fmt.Sprintf("%v", b)
		},
		"add": func(a, b int) int {
			return a + b
		},
		"sub": func(a, b int) int {
			return a - b
		},
		"mul": func(a, b int) int {
			return a * b
		},
		"div": func(a, b int) int {
			if b == 0 {
				return 0
			}
			return a / b
		},
		"min": func(a, b int) int {
			if a < b {
				return a
			}
			return b
		},
		"derefString": func(s *string) string {
			if s == nil {
				return ""
			}
			return *s
		},
		"derefBool": func(b *bool) bool {
			if b == nil {
				return false
			}
			return *b
		},
	}

	tmpl := template.New("").Funcs(funcMap)

	err := filepath.WalkDir(templatesDir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() || !strings.HasSuffix(path, ".html") {
			return nil
		}
		content, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		// Use filename without extension as template name
		name := strings.TrimSuffix(filepath.Base(path), ".html")
		_, err = tmpl.New(name).Parse(string(content))
		if err != nil {
			return fmt.Errorf("parse %s: %w", path, err)
		}
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("parse templates: %w", err)
	}

	return &Engine{templates: tmpl}, nil
}

// Render executes a named template and writes to the response.
// If the request is an HTMX request (HX-Request: true), it attempts to render
// the partial template named "{name}-partial" or falls back to the full page.
func (e *Engine) Render(w http.ResponseWriter, r *http.Request, name string, data map[string]any) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")

	isHtmx := r.Header.Get("HX-Request") == "true"
	var tmplName string
	if isHtmx {
		// Try partial first
		partialName := name + "-partial"
		if e.templates.Lookup(partialName) != nil {
			tmplName = partialName
		} else {
			tmplName = name
		}
	} else {
		tmplName = name
	}

	if data == nil {
		data = make(map[string]any)
	}

	// Inject common data
	if _, ok := data["IsHtmx"]; !ok {
		data["IsHtmx"] = isHtmx
	}

	if err := e.templates.ExecuteTemplate(w, tmplName, data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// RenderPartial renders a specific partial template (for hx-target responses).
func (e *Engine) RenderPartial(w http.ResponseWriter, r *http.Request, name string, data map[string]any) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")
	if data == nil {
		data = make(map[string]any)
	}
	data["IsHtmx"] = true
	if err := e.templates.ExecuteTemplate(w, name, data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
