package handlers

import (
	"encoding/csv"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/nilbyte/tallyoh/backend/internal/cache"
	"github.com/nilbyte/tallyoh/backend/internal/middleware"
	"github.com/nilbyte/tallyoh/backend/internal/money"
)

type importRowDTO struct {
	Date        string  `json:"date"`
	Description string  `json:"description"`
	Amount      float64 `json:"amount"`
	Type        string  `json:"type"` // INCOME | EXPENSE
}

func parseDate(s string) (string, bool) {
	s = strings.TrimSpace(s)
	// YYYY-MM-DD
	if _, err := time.Parse("2006-01-02", s); err == nil {
		return s, true
	}
	// DD/MM/YYYY
	if t, err := time.Parse("02/01/2006", s); err == nil {
		return t.Format("2006-01-02"), true
	}
	// DD/MM/YY
	if t, err := time.Parse("02/01/06", s); err == nil {
		return t.Format("2006-01-02"), true
	}
	return "", false
}

func parseCSV(r io.Reader) ([]importRowDTO, []string) {
	data, err := io.ReadAll(r)
	if err != nil {
		return nil, []string{"failed to read file"}
	}

	// Detect delimiter: try comma, fall back to semicolon
	raw := string(data)
	delimiter := ','
	if strings.Count(raw, ";") > strings.Count(raw, ",") {
		delimiter = ';'
	}

	cr := csv.NewReader(strings.NewReader(raw))
	cr.Comma = delimiter
	cr.TrimLeadingSpace = true

	records, err := cr.ReadAll()
	if err != nil {
		return nil, []string{"invalid CSV format: " + err.Error()}
	}
	if len(records) < 2 {
		return nil, []string{"file must have a header row and at least one data row"}
	}

	// Detect header columns (case-insensitive)
	header := records[0]
	colIdx := map[string]int{"date": -1, "description": -1, "amount": -1, "type": -1}
	for i, h := range header {
		key := strings.ToLower(strings.TrimSpace(h))
		if _, ok := colIdx[key]; ok {
			colIdx[key] = i
		}
	}
	if colIdx["date"] < 0 || colIdx["amount"] < 0 {
		return nil, []string{"CSV must have at least 'date' and 'amount' columns"}
	}

	var rows []importRowDTO
	var errs []string

	for i, rec := range records[1:] {
		lineNum := i + 2
		if len(rec) == 0 {
			continue
		}

		get := func(key string) string {
			idx := colIdx[key]
			if idx < 0 || idx >= len(rec) {
				return ""
			}
			return strings.TrimSpace(rec[idx])
		}

		dateStr, ok := parseDate(get("date"))
		if !ok {
			errs = append(errs, "line "+strconv.Itoa(lineNum)+": invalid date '"+get("date")+"'")
			continue
		}

		amtStr := strings.ReplaceAll(get("amount"), ",", ".")
		amt, err := strconv.ParseFloat(amtStr, 64)
		if err != nil || amt == 0 {
			errs = append(errs, "line "+strconv.Itoa(lineNum)+": invalid amount '"+get("amount")+"'")
			continue
		}

		// Determine type
		txType := strings.ToUpper(get("type"))
		if txType != "INCOME" && txType != "EXPENSE" {
			if amt < 0 {
				txType = "EXPENSE"
			} else {
				txType = "INCOME"
			}
		}
		if amt < 0 {
			amt = -amt
		}

		desc := get("description")
		if desc == "" {
			if txType == "INCOME" {
				desc = "Receita"
			} else {
				desc = "Lançamento"
			}
		}

		rows = append(rows, importRowDTO{
			Date:        dateStr,
			Description: desc,
			Amount:      amt,
			Type:        txType,
		})
	}

	return rows, errs
}

func (h *Handler) PreviewImport(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	if err := r.ParseMultipartForm(5 << 20); err != nil { // 5 MB limit
		writeError(w, http.StatusBadRequest, "file too large or invalid multipart form")
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "missing 'file' field")
		return
	}
	defer file.Close()

	rows, errs := parseCSV(file)
	writeJSON(w, http.StatusOK, map[string]any{
		"rows":   rows,
		"errors": errs,
	})
}

func (h *Handler) ConfirmImport(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var rows []importRowDTO
	if err := json.NewDecoder(r.Body).Decode(&rows); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if len(rows) == 0 {
		writeError(w, http.StatusBadRequest, "no rows to import")
		return
	}
	if len(rows) > 2000 {
		writeError(w, http.StatusBadRequest, "too many rows (max 2000)")
		return
	}

	imported := 0
	for _, row := range rows {
		txDate, err := parseTransactionDate(row.Date)
		if err != nil {
			continue
		}
		kind := "EXPENSE"
		if row.Type == "INCOME" {
			kind = "INCOME"
		}
		_, err = h.db.Exec(r.Context(), `
			INSERT INTO transactions (
				user_id, type, kind, status, amount_cents, date, description, currency_code
			) VALUES ($1,$2,$3,'COMPLETED',$4,$5,$6,'BRL')
		`, claims.UserID, row.Type, kind, money.ToCents(row.Amount), txDate, row.Description)
		if err == nil {
			imported++
		}
	}

	h.cache.DeletePrefix(cache.DashboardPrefix(claims.UserID))
	writeJSON(w, http.StatusOK, map[string]any{"imported": imported})
}
