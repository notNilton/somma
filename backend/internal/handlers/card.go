package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/nilbyte/somma/backend/internal/database"
	"github.com/nilbyte/somma/backend/internal/middleware"
	"github.com/nilbyte/somma/backend/internal/models"
	"github.com/nilbyte/somma/backend/internal/services"
)

func (h *Handler) CreateCard(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	userUUID, err := stringToUUID(claims.UserID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id in claims")
		return
	}

	var req models.CreateCardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		writeError(w, http.StatusBadRequest, "card name is required")
		return
	}
	if req.TotalLimitCents < 0 {
		writeError(w, http.StatusBadRequest, "total limit must be non-negative")
		return
	}
	if req.ClosingDay < 1 || req.ClosingDay > 31 {
		writeError(w, http.StatusBadRequest, "closing day must be between 1 and 31")
		return
	}
	if req.DueDay < 1 || req.DueDay > 31 {
		writeError(w, http.StatusBadRequest, "due day must be between 1 and 31")
		return
	}

	card, err := h.queries.CreateCard(r.Context(), database.CreateCardParams{
		UserID:          userUUID,
		Name:            name,
		TotalLimitCents: req.TotalLimitCents,
		ClosingDay:      int32(req.ClosingDay),
		DueDay:          int32(req.DueDay),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create card")
		return
	}

	writeJSON(w, http.StatusCreated, models.CardSummary{
		ID:                  uuidToString(card.ID),
		Name:                card.Name,
		TotalLimitCents:     card.TotalLimitCents,
		AvailableLimitCents: card.TotalLimitCents,
		CurrentInvoice: models.InvoiceSummary{
			Month:            int(time.Now().Month()),
			Year:             time.Now().Year(),
			TotalAmountCents: 0,
			Status:           "open",
		},
	})
}

func (h *Handler) ListCards(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	userUUID, err := stringToUUID(claims.UserID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id in claims")
		return
	}

	cards, err := h.queries.ListCardsWithAvailableLimitByUserID(r.Context(), userUUID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list cards")
		return
	}

	now := time.Now()
	currentMonth := int32(now.Month())
	currentYear := int32(now.Year())

	resp := make([]models.CardSummary, len(cards))
	for i, c := range cards {
		currInv, err := h.queries.GetCurrentInvoiceByCardID(r.Context(), database.GetCurrentInvoiceByCardIDParams{
			CreditCardID:   c.ID,
			ReferenceMonth: currentMonth,
			ReferenceYear:  currentYear,
		})

		invSummary := models.InvoiceSummary{
			Month:  int(currentMonth),
			Year:   int(currentYear),
			Status: "open",
		}
		if err == nil {
			invSummary.ID = uuidToString(currInv.ID)
			invSummary.Month = int(currInv.ReferenceMonth)
			invSummary.Year = int(currInv.ReferenceYear)
			if currInv.ClosingDate.Valid {
				invSummary.ClosingDate = currInv.ClosingDate.Time.Format("2006-01-02")
			}
			if currInv.DueDate.Valid {
				invSummary.DueDate = currInv.DueDate.Time.Format("2006-01-02")
			}
			invSummary.TotalAmountCents = currInv.TotalAmountCents
			invSummary.Status = string(currInv.Status)
		}

		resp[i] = models.CardSummary{
			ID:                  uuidToString(c.ID),
			Name:                c.Name,
			TotalLimitCents:     c.TotalLimitCents,
			AvailableLimitCents: c.AvailableLimitCents,
			CurrentInvoice:      invSummary,
		}
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) CreatePurchase(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	cardIDStr := r.PathValue("id")
	cardUUID, err := stringToUUID(cardIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid card id")
		return
	}

	card, err := h.queries.GetCardByID(r.Context(), cardUUID)
	if err != nil {
		writeError(w, http.StatusNotFound, "card not found")
		return
	}
	if uuidToString(card.UserID) != claims.UserID {
		writeError(w, http.StatusForbidden, "card belongs to another user")
		return
	}

	var req models.CreatePurchaseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.TotalAmountCents <= 0 {
		writeError(w, http.StatusBadRequest, "total amount must be greater than zero")
		return
	}
	if req.InstallmentsCount < 1 {
		req.InstallmentsCount = 1
	}

	purchaseDate := time.Now()
	if req.PurchaseDate != "" {
		if t, err := time.Parse("2006-01-02", req.PurchaseDate); err == nil {
			purchaseDate = t
		} else if t, err := time.Parse(time.RFC3339, req.PurchaseDate); err == nil {
			purchaseDate = t
		}
	}

	tx, err := h.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to start transaction")
		return
	}
	defer tx.Rollback(r.Context())

	purchaseID, err := h.cardService.RegisterPurchase(r.Context(), tx, services.PurchaseInput{
		UserID:       claims.UserID,
		CardID:       cardIDStr,
		Description:  req.Description,
		TotalCents:   req.TotalAmountCents,
		Installments: req.InstallmentsCount,
		PurchaseDate: purchaseDate,
		ClosingDay:   int(card.ClosingDay),
		DueDay:       int(card.DueDay),
	})
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit transaction")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"purchaseId":        purchaseID,
		"cardId":            cardIDStr,
		"description":       req.Description,
		"totalAmountCents":  req.TotalAmountCents,
		"installmentsCount": req.InstallmentsCount,
	})
}

func (h *Handler) ListCardInvoices(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	cardIDStr := r.PathValue("id")
	cardUUID, err := stringToUUID(cardIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid card id")
		return
	}

	card, err := h.queries.GetCardByID(r.Context(), cardUUID)
	if err != nil {
		writeError(w, http.StatusNotFound, "card not found")
		return
	}
	if uuidToString(card.UserID) != claims.UserID {
		writeError(w, http.StatusForbidden, "card belongs to another user")
		return
	}

	invoices, err := h.queries.ListInvoicesByCardID(r.Context(), cardUUID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list invoices")
		return
	}

	resp := make([]models.InvoiceDetailResponse, len(invoices))
	for i, inv := range invoices {
		var paidAtStr *string
		if inv.PaidAt.Valid {
			s := inv.PaidAt.Time.Format(time.RFC3339)
			paidAtStr = &s
		}

		installments, _ := h.queries.ListInstallmentsByInvoiceID(r.Context(), inv.ID)
		instResp := make([]models.InstallmentResponse, len(installments))
		for j, inst := range installments {
			instResp[j] = models.InstallmentResponse{
				ID:                  uuidToString(inst.ID),
				PurchaseID:          uuidToString(inst.PurchaseID),
				InstallmentNumber:   int(inst.InstallmentNumber),
				AmountCents:         inst.AmountCents,
				PurchaseDescription: inst.PurchaseDescription,
				InstallmentsCount:   int(inst.InstallmentsCount),
				PurchaseDate:        inst.PurchaseDate.Time.Format("2006-01-02"),
			}
		}

		resp[i] = models.InvoiceDetailResponse{
			ID:               uuidToString(inv.ID),
			CreditCardID:     uuidToString(inv.CreditCardID),
			Month:            int(inv.ReferenceMonth),
			Year:             int(inv.ReferenceYear),
			ClosingDate:      inv.ClosingDate.Time.Format("2006-01-02"),
			DueDate:          inv.DueDate.Time.Format("2006-01-02"),
			Status:           string(inv.Status),
			PaidAt:           paidAtStr,
			TotalAmountCents: inv.TotalAmountCents,
			Installments:     instResp,
		}
	}

	writeJSON(w, http.StatusOK, resp)
}
