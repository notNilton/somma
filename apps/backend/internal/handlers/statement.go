package handlers

import (
	"net/http"
	"time"

	"github.com/nilbyte/mirante/backend/internal/middleware"
	"github.com/nilbyte/mirante/backend/internal/models"
	"github.com/nilbyte/mirante/backend/internal/money"
)

func (h *Handler) GetCardStatement(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	cardID := r.PathValue("id")
	q := r.URL.Query()

	// Verificar que o card pertence ao usuário
	var cardName string
	var closingDay, dueDay *int
	if err := h.db.QueryRow(r.Context(),
		`SELECT name, closing_day, due_day FROM cards WHERE id = $1 AND user_id = $2 AND is_active = true`,
		cardID, claims.UserID,
	).Scan(&cardName, &closingDay, &dueDay); err != nil {
		writeError(w, http.StatusNotFound, "card not found")
		return
	}

	from := q.Get("from")
	to := q.Get("to")

	// Inferir período da fatura se não fornecido
	if from == "" || to == "" {
		now := time.Now()
		cd := 1
		if closingDay != nil {
			cd = *closingDay
		}
		// Período: do dia de fechamento do mês anterior até o dia de fechamento do mês atual
		closingThisMonth := time.Date(now.Year(), now.Month(), cd, 0, 0, 0, 0, time.UTC)
		if now.Day() <= cd {
			// Ainda dentro da fatura atual, retroage 1 mês
			from = time.Date(now.Year(), now.Month()-1, cd+1, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
			to = closingThisMonth.Format("2006-01-02")
		} else {
			from = closingThisMonth.AddDate(0, 0, 1).Format("2006-01-02")
			to = time.Date(now.Year(), now.Month()+1, cd, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
		}
	}

	rows, err := h.db.Query(r.Context(), `
		SELECT t.id, t.account_id, t.user_id, t.category_id, t.card_id,
		       t.type, t.classification, t.payment_method, t.channel, t.status,
		       t.is_recurring, t.amount_cents, t.total_installments, t.paid_installments,
		       t.date, t.description, t.notes, t.currency_code, t.affects_account,
		       t.is_active, t.deleted_at, t.created_at, t.updated_at,
		       c.name AS category_name, c.color AS category_color
		FROM transactions t
		LEFT JOIN categories c ON c.id = t.category_id
		WHERE t.card_id = $1
		  AND t.user_id = $2
		  AND t.is_active = true
		  AND t.date >= $3::date
		  AND t.date <= $4::date
		ORDER BY t.date DESC
	`, cardID, claims.UserID, from, to)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	defer rows.Close()

	var txs []any
	var totalCents, realExpCents, invoicePayCents int64

	for rows.Next() {
		var t models.TransactionWithCategory
		if err := rows.Scan(
			&t.ID, &t.AccountID, &t.UserID, &t.CategoryID, &t.CardID,
			&t.Type, &t.Classification, &t.PaymentMethod, &t.Channel, &t.Status,
			&t.IsRecurring, &t.AmountCents, &t.TotalInstallments, &t.PaidInstallments,
			&t.Date, &t.Description, &t.Notes, &t.CurrencyCode, &t.AffectsAccount,
			&t.IsActive, &t.DeletedAt, &t.CreatedAt, &t.UpdatedAt,
			&t.CategoryName, &t.CategoryColor,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}

		totalCents += t.AmountCents
		if t.Type == "EXPENSE" && t.Classification != "TRANSFER" {
			realExpCents += t.AmountCents
		} else if t.Type == "INCOME" && t.Classification == "TRANSFER" {
			invoicePayCents += t.AmountCents
		}

		txs = append(txs, transactionResponse(t))
	}

	if txs == nil {
		txs = []any{}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"cardId":               cardID,
		"cardName":             cardName,
		"periodFrom":           from,
		"periodTo":             to,
		"totalCents":           totalCents,
		"total":                money.ToReais(totalCents),
		"realExpensesCents":    realExpCents,
		"realExpenses":         money.ToReais(realExpCents),
		"invoicePaymentsCents": invoicePayCents,
		"invoicePayments":      money.ToReais(invoicePayCents),
		"transactions":         txs,
	})
}
