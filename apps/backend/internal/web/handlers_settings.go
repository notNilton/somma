package web

import (
	"net/http"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

func (h *Handler) SettingsPage(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	var name, email string
	var privacyMode bool
	_ = h.db.QueryRow(r.Context(), `
		SELECT COALESCE(name, ''), email, privacy_mode_enabled FROM users WHERE id = $1
	`, user.ID).Scan(&name, &email, &privacyMode)

	h.engine.Render(w, r, "settings-profile", map[string]any{
		"Title":       "Configurações",
		"User":        user,
		"ProfileName": name,
		"ProfileEmail": email,
		"PrivacyMode": privacyMode,
	})
}

func (h *Handler) UpdateProfileWeb(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	if err := r.ParseForm(); err != nil {
		http.Redirect(w, r, "/settings", http.StatusSeeOther)
		return
	}

	name := strings.TrimSpace(r.FormValue("name"))
	email := strings.TrimSpace(r.FormValue("email"))

	_, _ = h.db.Exec(r.Context(), `
		UPDATE users SET name = COALESCE(NULLIF($1,''), name), email = COALESCE(NULLIF($2,''), email), updated_at = NOW()
		WHERE id = $3
	`, name, email, user.ID)

	http.Redirect(w, r, "/settings", http.StatusSeeOther)
}

func (h *Handler) ChangePasswordWeb(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	if err := r.ParseForm(); err != nil {
		http.Redirect(w, r, "/settings", http.StatusSeeOther)
		return
	}

	current := r.FormValue("currentPassword")
	newPass := r.FormValue("newPassword")

	if len(newPass) < 12 {
		http.Redirect(w, r, "/settings", http.StatusSeeOther)
		return
	}

	var hash string
	err := h.db.QueryRow(r.Context(), `SELECT password_hash FROM users WHERE id = $1`, user.ID).Scan(&hash)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(hash), []byte(current)) != nil {
		http.Redirect(w, r, "/settings", http.StatusSeeOther)
		return
	}

	newHash, _ := bcrypt.GenerateFromPassword([]byte(newPass), 12)
	_, _ = h.db.Exec(r.Context(), `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, string(newHash), user.ID)

	http.Redirect(w, r, "/settings", http.StatusSeeOther)
}

func (h *Handler) DeleteAccountWeb(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	if err := r.ParseForm(); err != nil {
		http.Redirect(w, r, "/settings", http.StatusSeeOther)
		return
	}

	current := r.FormValue("currentPassword")
	var hash string
	err := h.db.QueryRow(r.Context(), `SELECT password_hash FROM users WHERE id = $1`, user.ID).Scan(&hash)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(hash), []byte(current)) != nil {
		http.Redirect(w, r, "/settings", http.StatusSeeOther)
		return
	}

	_, _ = h.db.Exec(r.Context(), `DELETE FROM users WHERE id = $1`, user.ID)
	h.clearSessionCookie(w, r)
	http.Redirect(w, r, "/login", http.StatusSeeOther)
}
