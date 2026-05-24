package handlers

import (
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/nilbyte/tallyoh/web/internal/apiclient"
)

// DayGroup holds all transactions for a single calendar day.
type DayGroup struct {
	Date         time.Time
	Label        string  // "Hoje", "Ontem", "Ter, 20/05"
	DateStr      string  // "2006-01-02" for form date pre-fill and DOM IDs
	Transactions []apiclient.Transaction
	NetAmount    float64 // INCOME/RETURN positive, EXPENSE/INVESTMENT negative
}

var ptWeekdays = [7]string{"Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"}

func groupByDay(txs []apiclient.Transaction, now time.Time) []DayGroup {
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	yesterday := today.AddDate(0, 0, -1)

	grouped := map[string]*DayGroup{}
	order := []string{}

	ensure := func(day time.Time) string {
		key := day.Format("2006-01-02")
		if _, ok := grouped[key]; !ok {
			var label string
			switch {
			case day.Equal(today):
				label = "Hoje"
			case day.Equal(yesterday):
				label = "Ontem"
			default:
				label = ptWeekdays[day.Weekday()] + ", " + day.Format("02/01")
			}
			grouped[key] = &DayGroup{Date: day, DateStr: key, Label: label}
			order = append(order, key)
		}
		return key
	}

	// Always show all days of the current month
	year, month, _ := now.Date()
	daysInMonth := time.Date(year, month+1, 0, 0, 0, 0, 0, time.UTC).Day()
	for i := 1; i <= daysInMonth; i++ {
		ensure(time.Date(year, month, i, 0, 0, 0, 0, time.UTC))
	}

	for _, tx := range txs {
		d := tx.Date.UTC()
		day := time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, time.UTC)
		key := ensure(day)
		g := grouped[key]
		g.Transactions = append(g.Transactions, tx)
		switch tx.Type {
		case "INCOME", "RETURN":
			g.NetAmount += tx.Amount
		case "EXPENSE", "INVESTMENT":
			g.NetAmount -= tx.Amount
		}
	}

	sort.Slice(order, func(i, j int) bool { return order[i] > order[j] })

	result := make([]DayGroup, 0, len(order))
	for _, key := range order {
		result = append(result, *grouped[key])
	}
	return result
}

type txPageData struct {
	Groups []DayGroup
}

type formData struct {
	Categories []apiclient.FlatCategory
	Date       string
	Type       string
	Error      string
}

func (h *Handler) TransactionsPage(w http.ResponseWriter, r *http.Request) {
	token := h.token(r)
	if token == "" {
		http.Redirect(w, r, "/login", http.StatusFound)
		return
	}
	now := time.Now()
	year, month, _ := now.Date()
	from := time.Date(year, month, 1, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
	to := time.Date(year, month+1, 0, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
	txs, err := h.api.ListTransactions(token, apiclient.ListParams{
		Limit: 500,
		From:  from,
		To:    to,
	})
	if err == apiclient.ErrUnauthorized {
		http.Redirect(w, r, "/login", http.StatusFound)
		return
	}
	if err != nil || txs == nil {
		txs = []apiclient.Transaction{}
	}
	h.render(w, http.StatusOK, "transactions", txPageData{Groups: groupByDay(txs, now)})
}

func (h *Handler) NewTransactionForm(w http.ResponseWriter, r *http.Request) {
	token := h.token(r)
	if token == "" {
		h.redirectLogin(w, r)
		return
	}
	date := r.URL.Query().Get("date")
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	txType := r.URL.Query().Get("type")
	cats, _ := h.api.ListCategories(token)
	h.render(w, http.StatusOK, "transaction_form", formData{
		Categories: apiclient.FlattenCategories(cats),
		Date:       date,
		Type:       txType,
	})
}

func (h *Handler) CreateTransaction(w http.ResponseWriter, r *http.Request) {
	token := h.token(r)
	if token == "" {
		h.redirectLogin(w, r)
		return
	}
	if err := r.ParseForm(); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	amount, _ := strconv.ParseFloat(r.FormValue("amount"), 64)
	catID := r.FormValue("categoryId")
	var catIDPtr *string
	if catID != "" {
		catIDPtr = &catID
	}

	channel := r.FormValue("channel")
	paymentMethod := "DEBIT"
	if channel == "CARD_CREDIT" {
		paymentMethod = "CREDIT"
	}

	status := "COMPLETED"
	if r.FormValue("pending") == "1" {
		status = "PENDING"
	}

	_, err := h.api.CreateTransaction(token, apiclient.CreateInput{
		Description:   r.FormValue("description"),
		Amount:        amount,
		Date:          r.FormValue("date"),
		Type:          r.FormValue("type"),
		Status:        status,
		PaymentMethod: paymentMethod,
		Channel:       channel,
		CategoryID:    catIDPtr,
	})

	if err == apiclient.ErrUnauthorized {
		h.redirectLogin(w, r)
		return
	}
	if err != nil {
		cats, _ := h.api.ListCategories(token)
		h.render(w, http.StatusOK, "transaction_form", formData{
			Categories: apiclient.FlattenCategories(cats),
			Date:       r.FormValue("date"),
			Type:       r.FormValue("type"),
			Error:      err.Error(),
		})
		return
	}

	w.Header().Set("HX-Refresh", "true")
	w.WriteHeader(http.StatusOK)
}

func (h *Handler) DeleteTransaction(w http.ResponseWriter, r *http.Request) {
	token := h.token(r)
	if token == "" {
		h.redirectLogin(w, r)
		return
	}
	id := r.PathValue("id")
	err := h.api.DeleteTransaction(token, id)
	if err == apiclient.ErrUnauthorized {
		h.redirectLogin(w, r)
		return
	}
	w.WriteHeader(http.StatusOK)
}
