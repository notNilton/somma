package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/nilbyte/personalledger/backend/internal/middleware"
	"github.com/nilbyte/personalledger/backend/internal/models"
	"golang.org/x/crypto/bcrypt"
)

type changePasswordDto struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

func (d *changePasswordDto) validate() error {
	if d.CurrentPassword == "" {
		return errors.New("currentPassword is required")
	}
	if len(d.NewPassword) < 12 {
		return errors.New("newPassword min 12 chars")
	}
	return nil
}

func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var u models.User
	err := h.db.QueryRow(r.Context(), `
		SELECT id, email, name, phone, cpf, cnpj, avatar_url, privacy_mode_enabled, created_at, updated_at
		FROM users WHERE id = $1
	`, claims.UserID).Scan(
		&u.ID, &u.Email, &u.Name, &u.Phone, &u.Cpf, &u.Cnpj,
		&u.AvatarUrl, &u.PrivacyModeEnabled, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}

	writeJSON(w, http.StatusOK, userResponse(u))
}

func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var dto updateUserDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := dto.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	var u models.User
	err := h.db.QueryRow(r.Context(), `
		UPDATE users SET
			email                = COALESCE($1, email),
			name                 = COALESCE($2, name),
			avatar_url           = COALESCE($3, avatar_url),
			privacy_mode_enabled = COALESCE($4, privacy_mode_enabled),
			updated_at           = NOW()
		WHERE id = $5
		RETURNING id, email, name, phone, cpf, cnpj, avatar_url, privacy_mode_enabled, created_at, updated_at
	`, dto.Email, dto.Name, dto.AvatarUrl, dto.PrivacyModeEnabled, claims.UserID).Scan(
		&u.ID, &u.Email, &u.Name, &u.Phone, &u.Cpf, &u.Cnpj,
		&u.AvatarUrl, &u.PrivacyModeEnabled, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	writeJSON(w, http.StatusOK, userResponse(u))
}

func (h *Handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var dto changePasswordDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := dto.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	var passwordHash string
	err := h.db.QueryRow(r.Context(), `SELECT password_hash FROM users WHERE id = $1`, claims.UserID).Scan(&passwordHash)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(dto.CurrentPassword)); err != nil {
		writeError(w, http.StatusBadRequest, "incorrect current password")
		return
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(dto.NewPassword), 12)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	h.db.Exec(r.Context(), `
		UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2
	`, string(newHash), claims.UserID)

	log.Printf("[AUDIT] password changed: %s", claims.Email)
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) DeleteMyAccount(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var req struct {
		CurrentPassword string `json:"currentPassword"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.CurrentPassword == "" {
		writeError(w, http.StatusBadRequest, "currentPassword required")
		return
	}

	var passwordHash string
	err := h.db.QueryRow(r.Context(), `SELECT password_hash FROM users WHERE id = $1`, claims.UserID).Scan(&passwordHash)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.CurrentPassword)); err != nil {
		writeError(w, http.StatusForbidden, "incorrect password")
		return
	}

	h.db.Exec(r.Context(), `DELETE FROM users WHERE id = $1`, claims.UserID)
	log.Printf("[AUDIT] account deleted: %s", claims.Email)
	w.WriteHeader(http.StatusNoContent)
}
