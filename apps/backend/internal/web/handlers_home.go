package web

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/nilbyte/tallyoh/backend/internal/cache"
	"github.com/nilbyte/tallyoh/backend/internal/middleware"
	"github.com/nilbyte/tallyoh/backend/internal/models"
	"github.com/nilbyte/tallyoh/backend/internal/money"
)

// ============================================================
// Home — Calendar view
// ============================================================

type dayView struct {
	DateStr           string
	DayNum            int
	Weekday           string
	Date              time.Time
	Transactions      []txView
	RunningBalance    float64
	RunningBalanceCents int64
}

type txView struct {
	ID          string
	Description string
	Amount      float64
	Type        string
	DateStr     string
}

func (h *Handler) HomePage(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	month := r.URL.Query().Get("month")
	if month == "" {
		month = time.Now().Format("2006-01")
	}

	monthTime, err := time.Parse("2006-01", month)
	if err != nil {
		monthTime = time.Now()
		month = monthTime.Format("2006-01")
	}

	// First and last day of month
	firstDay := time.Date(monthTime.Year(), monthTime.Month(), 1, 0, 0, 0, 0, time.UTC)
	lastDay := firstDay.AddDate(0, 1, -1)

	// Prev/Next month links
	prevMonth := firstDay.AddDate(0, -1, 0).Format("2006-01")
	nextMonth := firstDay.AddDate(0, 1, 0).Format("2006-01")

	// Calculate running balance from previous months
	var priorBalanceCents int64
	err = h.db.QueryRow(r.Context(), `
		SELECT COALESCE(SUM(CASE WHEN type IN ('INCOME', 'RETURN') THEN amount_cents ELSE -amount_cents END), 0)
		FROM transactions
		WHERE user_id = $1 AND is_active = true AND date < $2
	`, user.ID, firstDay).Scan(&priorBalanceCents)
	if err != nil {
		h.engine.Render(w, r, "home", map[string]any{
			"Title": "Tallyoh",
			"User":  user,
			"Error": "Erro ao carregar saldo anterior",
		})
		return
	}

	// Fetch all transactions for the month
	rows, err := h.db.Query(r.Context(), `
		SELECT id, description, amount_cents, type, date
		FROM transactions
		WHERE user_id = $1
		  AND is_active = true
		  AND date >= $2
		  AND date <= $3
		ORDER BY date ASC, created_at ASC
	`, user.ID, firstDay, lastDay)
	if err != nil {
		h.engine.Render(w, r, "home", map[string]any{
			"Title": "Tallyoh",
			"User":  user,
			"Error": "Erro ao carregar transações",
		})
		return
	}
	defer rows.Close()

	// Map date string -> transactions
	txByDay := make(map[string][]txView)
	var monthBalanceCents int64
	for rows.Next() {
		var id, desc, txType string
		var amountCents int64
		var date time.Time
		rows.Scan(&id, &desc, &amountCents, &txType, &date)
		dateStr := date.Format("2006-01-02")
		txByDay[dateStr] = append(txByDay[dateStr], txView{
			ID: id, Description: desc, Amount: money.ToReais(amountCents), Type: txType, DateStr: dateStr,
		})
		switch txType {
		case "INCOME", "RETURN":
			monthBalanceCents += amountCents
		default:
			monthBalanceCents -= amountCents
		}
	}

	// Build day views
	var days []dayView
	weekdays := []string{"Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"}
	runningBalance := priorBalanceCents
	for d := 1; d <= lastDay.Day(); d++ {
		dayDate := time.Date(monthTime.Year(), monthTime.Month(), d, 0, 0, 0, 0, time.UTC)
		dateStr := dayDate.Format("2006-01-02")
		dayTxs := txByDay[dateStr]
		if dayTxs == nil {
			dayTxs = []txView{}
		}
		for _, tx := range dayTxs {
			switch tx.Type {
			case "INCOME", "RETURN":
				runningBalance += money.ToCents(tx.Amount)
			default:
				runningBalance -= money.ToCents(tx.Amount)
			}
		}
		days = append(days, dayView{
			DateStr:             dateStr,
			DayNum:              d,
			Weekday:             weekdays[int(dayDate.Weekday())],
			Date:                dayDate,
			Transactions:        dayTxs,
			RunningBalance:      money.ToReais(runningBalance),
			RunningBalanceCents: runningBalance,
		})
	}

	monthLabel := firstDay.Format("January 2006")
	monthLabel = fmt.Sprintf("%s/%s", monthLabel[:3], strconv.Itoa(monthTime.Year())[2:])

	totalBalanceCents := priorBalanceCents + monthBalanceCents

	h.cache.DeletePrefix(cache.DashboardPrefix(user.ID))

	h.engine.Render(w, r, "home", map[string]any{
		"Title":       "Tallyoh",
		"User":        user,
		"Month":       month,
		"MonthLabel":  monthLabel,
		"MonthShort":  strconv.Itoa(int(monthTime.Month())),
		"PrevMonth":   prevMonth,
		"NextMonth":   nextMonth,
		"Days":        days,
		"TotalBalance": money.ToReais(totalBalanceCents),
	})
}

func (h *Handler) CreateTransactionHome(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	if err := r.ParseForm(); err != nil {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	dto, err := h.parseTransactionForm(r)
	if err != nil {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	// Ensure valid type
	if !models.ValidTransactionTypes[dto.Type] {
		dto.Type = models.TransactionTypeEXPENSE
	}

	if err := h.insertTransaction(r.Context(), user.ID, dto); err != nil {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}

	h.cache.DeletePrefix(cache.DashboardPrefix(user.ID))
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

// ensure we satisfy unused import
var _ = middleware.ClaimsFromContext
