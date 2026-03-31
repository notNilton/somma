package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/nilbyte/mirante/backend/internal/middleware"
	"github.com/nilbyte/mirante/backend/internal/models"
)

type inviteMemberDto struct {
	Email string `json:"email"`
	Role  string `json:"role"`
}

func (d *inviteMemberDto) validate() error {
	if d.Email == "" {
		return errors.New("email is required")
	}
	if d.Role != "EDITOR" && d.Role != "VIEWER" {
		return errors.New("role must be EDITOR or VIEWER")
	}
	return nil
}

func (h *Handler) ListAccountMembers(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	accountID := r.PathValue("id")

	// Verificar que o caller tem acesso à conta (owner ou membro)
	var ownerID string
	if err := h.db.QueryRow(r.Context(),
		`SELECT user_id FROM accounts WHERE id = $1 AND is_active = true`, accountID,
	).Scan(&ownerID); err != nil {
		writeError(w, http.StatusNotFound, "account not found")
		return
	}

	var hasAccess bool
	if ownerID == claims.UserID {
		hasAccess = true
	} else {
		h.db.QueryRow(r.Context(),
			`SELECT EXISTS(SELECT 1 FROM account_access WHERE account_id = $1 AND user_id = $2)`,
			accountID, claims.UserID,
		).Scan(&hasAccess)
	}
	if !hasAccess {
		writeError(w, http.StatusForbidden, "access denied")
		return
	}

	rows, err := h.db.Query(r.Context(), `
		SELECT aa.id, aa.account_id, aa.user_id, aa.role, aa.created_at,
		       u.name, u.email
		FROM account_access aa
		JOIN users u ON u.id = aa.user_id
		WHERE aa.account_id = $1
		ORDER BY aa.created_at ASC
	`, accountID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	var members []any
	for rows.Next() {
		var m models.AccountAccessWithUser
		if err := rows.Scan(&m.ID, &m.AccountID, &m.UserID, &m.Role, &m.CreatedAt, &m.UserName, &m.UserEmail); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		members = append(members, map[string]any{
			"id":        m.ID,
			"accountId": m.AccountID,
			"userId":    m.UserID,
			"role":      m.Role,
			"createdAt": m.CreatedAt,
			"user": map[string]any{
				"name":  m.UserName,
				"email": m.UserEmail,
			},
		})
	}

	if members == nil {
		members = []any{}
	}
	writeJSON(w, http.StatusOK, members)
}

func (h *Handler) InviteMember(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	accountID := r.PathValue("id")

	var dto inviteMemberDto
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if err := dto.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Verificar que caller é owner
	var ownerID string
	if err := h.db.QueryRow(r.Context(),
		`SELECT user_id FROM accounts WHERE id = $1 AND is_active = true`, accountID,
	).Scan(&ownerID); err != nil {
		writeError(w, http.StatusNotFound, "account not found")
		return
	}
	if ownerID != claims.UserID {
		writeError(w, http.StatusForbidden, "only the account owner can invite members")
		return
	}

	// Buscar target user por email
	var targetID string
	if err := h.db.QueryRow(r.Context(),
		`SELECT id FROM users WHERE email = $1`, dto.Email,
	).Scan(&targetID); err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	if targetID == claims.UserID {
		writeError(w, http.StatusBadRequest, "cannot invite yourself")
		return
	}

	var m models.AccountAccess
	if err := h.db.QueryRow(r.Context(), `
		INSERT INTO account_access (account_id, user_id, role)
		VALUES ($1, $2, $3)
		ON CONFLICT (account_id, user_id) DO UPDATE SET role = EXCLUDED.role
		RETURNING id, account_id, user_id, role, created_at
	`, accountID, targetID, dto.Role).Scan(&m.ID, &m.AccountID, &m.UserID, &m.Role, &m.CreatedAt); err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"id":        m.ID,
		"accountId": m.AccountID,
		"userId":    m.UserID,
		"role":      m.Role,
		"createdAt": m.CreatedAt,
	})
}

func (h *Handler) UpdateMemberRole(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	accountID := r.PathValue("id")
	targetUserID := r.PathValue("userId")

	var dto struct {
		Role string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if dto.Role != "EDITOR" && dto.Role != "VIEWER" {
		writeError(w, http.StatusBadRequest, "role must be EDITOR or VIEWER")
		return
	}

	// Verificar ownership
	var ownerID string
	if err := h.db.QueryRow(r.Context(),
		`SELECT user_id FROM accounts WHERE id = $1 AND is_active = true`, accountID,
	).Scan(&ownerID); err != nil {
		writeError(w, http.StatusNotFound, "account not found")
		return
	}
	if ownerID != claims.UserID {
		writeError(w, http.StatusForbidden, "only the account owner can manage members")
		return
	}

	var m models.AccountAccess
	if err := h.db.QueryRow(r.Context(), `
		UPDATE account_access SET role = $1
		WHERE account_id = $2 AND user_id = $3
		RETURNING id, account_id, user_id, role, created_at
	`, dto.Role, accountID, targetUserID).Scan(&m.ID, &m.AccountID, &m.UserID, &m.Role, &m.CreatedAt); err != nil {
		writeError(w, http.StatusNotFound, "member not found")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"id":        m.ID,
		"accountId": m.AccountID,
		"userId":    m.UserID,
		"role":      m.Role,
		"createdAt": m.CreatedAt,
	})
}

func (h *Handler) RevokeMember(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	accountID := r.PathValue("id")
	targetUserID := r.PathValue("userId")

	// Verificar ownership
	var ownerID string
	if err := h.db.QueryRow(r.Context(),
		`SELECT user_id FROM accounts WHERE id = $1 AND is_active = true`, accountID,
	).Scan(&ownerID); err != nil {
		writeError(w, http.StatusNotFound, "account not found")
		return
	}
	if ownerID != claims.UserID {
		writeError(w, http.StatusForbidden, "only the account owner can revoke members")
		return
	}

	tag, err := h.db.Exec(r.Context(),
		`DELETE FROM account_access WHERE account_id = $1 AND user_id = $2`,
		accountID, targetUserID,
	)
	if err != nil || tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "member not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
