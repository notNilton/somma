package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/nilbyte/personalledger/backend/internal/middleware"
	"github.com/nilbyte/personalledger/backend/internal/models"
)

type updateUserDto struct {
	Email              *string `json:"email"`
	Name               *string `json:"name"`
	AvatarUrl          *string `json:"avatarUrl"`
	PrivacyModeEnabled *bool   `json:"privacyModeEnabled"`
}

func (d *updateUserDto) validate() error {
	if d.Email != nil && !strings.Contains(*d.Email, "@") {
		return errors.New("invalid email")
	}
	return nil
}

func (h *Handler) GetMe(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())

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

func (h *Handler) UpdateMe(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())

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
			email               = COALESCE($1, email),
			name                = COALESCE($2, name),
			avatar_url          = COALESCE($3, avatar_url),
			privacy_mode_enabled = COALESCE($4, privacy_mode_enabled),
			updated_at          = NOW()
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

func userResponse(u models.User) map[string]any {
	return map[string]any{
		"id":                 u.ID,
		"email":              u.Email,
		"name":               u.Name,
		"phone":              u.Phone,
		"cpf":                u.Cpf,
		"cnpj":               u.Cnpj,
		"avatarUrl":          u.AvatarUrl,
		"privacyModeEnabled": u.PrivacyModeEnabled,
		"createdAt":          u.CreatedAt,
		"updatedAt":          u.UpdatedAt,
	}
}
