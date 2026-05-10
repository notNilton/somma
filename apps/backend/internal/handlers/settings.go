package handlers

import (
	"encoding/json"
	"errors"
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
	if len(d.NewPassword) < 6 {
		return errors.New("newPassword min 6 chars")
	}
	return nil
}

func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
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

func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
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
	claims := middleware.ClaimsFromContext(r.Context())

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

	newHash, err := bcrypt.GenerateFromPassword([]byte(dto.NewPassword), 10)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	h.db.Exec(r.Context(), `
		UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2
	`, string(newHash), claims.UserID)

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) DeleteMyAccount(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())

	h.db.Exec(r.Context(), `DELETE FROM users WHERE id = $1`, claims.UserID)

	w.WriteHeader(http.StatusNoContent)
}
