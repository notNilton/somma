package handlers

import (
	"net/http"
	"time"

	"github.com/nilbyte/somma/backend/internal/database"
	"github.com/nilbyte/somma/backend/internal/middleware"
	"github.com/nilbyte/somma/backend/internal/models"
)

func (h *Handler) GetDashboard(w http.ResponseWriter, r *http.Request) {
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

	// 1. Contas
	dbAccounts, err := h.queries.ListAccountsByUserID(r.Context(), userUUID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query accounts")
		return
	}

	accountsSummary := make([]models.AccountSummary, len(dbAccounts))
	for i, a := range dbAccounts {
		accountsSummary[i] = models.AccountSummary{
			ID:           a.ID,
			Name:         a.Name,
			BalanceCents: a.BalanceCents,
		}
	}

	// 2. Cartões com limites disponíveis e fatura do mês atual
	dbCards, err := h.queries.ListCardsWithAvailableLimitByUserID(r.Context(), userUUID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query cards")
		return
	}

	now := time.Now()
	currentMonth := int32(now.Month())
	currentYear := int32(now.Year())

	cardsSummary := make([]models.CardSummary, len(dbCards))
	for i, c := range dbCards {
		currInv, err := h.queries.GetCurrentInvoiceByCardID(r.Context(), database.GetCurrentInvoiceByCardIDParams{
			CreditCardID:   c.ID,
			ReferenceMonth: currentMonth,
			ReferenceYear:  currentYear,
		})

		invSummary := models.InvoiceSummary{
			Month:            int(currentMonth),
			Year:             int(currentYear),
			TotalAmountCents: 0,
			Status:           "open",
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

		cardsSummary[i] = models.CardSummary{
			ID:                  uuidToString(c.ID),
			Name:                c.Name,
			TotalLimitCents:     c.TotalLimitCents,
			AvailableLimitCents: c.AvailableLimitCents,
			CurrentInvoice:      invSummary,
		}
	}

	writeJSON(w, http.StatusOK, models.DashboardResponse{
		Accounts: accountsSummary,
		Cards:    cardsSummary,
	})
}
