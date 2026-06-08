package handlers

import (
	"encoding/csv"
	"encoding/json"
	"encoding/xml"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/nilbyte/tallyoh/backend/internal/cache"
	"github.com/nilbyte/tallyoh/backend/internal/middleware"
	"github.com/nilbyte/tallyoh/backend/internal/money"
)

type importRowDTO struct {
	Date              string  `json:"date"`
	Description       string  `json:"description"`
	Amount            float64 `json:"amount"`
	Type              string  `json:"type"` // INCOME | EXPENSE
	PotentialDuplicate bool   `json:"potentialDuplicate"`
}

// ── Date parsing ──────────────────────────────────────────────────────────────

func parseDate(s string) (string, bool) {
	s = strings.TrimSpace(s)
	for _, layout := range []string{"2006-01-02", "02/01/2006", "02/01/06", "01/02/2006"} {
		if t, err := time.Parse(layout, s); err == nil {
			return t.Format("2006-01-02"), true
		}
	}
	// OFX date: YYYYMMDDHHMMSS or YYYYMMDD
	if len(s) >= 8 && regexp.MustCompile(`^\d{8}`).MatchString(s) {
		if t, err := time.Parse("20060102", s[:8]); err == nil {
			return t.Format("2006-01-02"), true
		}
	}
	return "", false
}

// ── CSV ───────────────────────────────────────────────────────────────────────

func parseCSV(r io.Reader) ([]importRowDTO, []string) {
	data, err := io.ReadAll(r)
	if err != nil {
		return nil, []string{"failed to read file"}
	}

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

	header := records[0]
	colIdx := map[string]int{"date": -1, "description": -1, "amount": -1, "type": -1, "memo": -1}
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
			desc = get("memo")
		}
		if desc == "" {
			if txType == "INCOME" {
				desc = "Receita"
			} else {
				desc = "Lançamento"
			}
		}

		rows = append(rows, importRowDTO{Date: dateStr, Description: desc, Amount: amt, Type: txType})
	}

	return rows, errs
}

// ── OFX / OFC ─────────────────────────────────────────────────────────────────

// ofxTransaction maps the relevant OFX STMTTRN fields.
type ofxTransaction struct {
	TrnType string `xml:"TRNTYPE"`
	DtPosted string `xml:"DTPOSTED"`
	TrnAmt   string `xml:"TRNAMT"`
	Memo     string `xml:"MEMO"`
	Name     string `xml:"NAME"`
}

// ofxDoc is a minimal struct for the OFX XML tree.
type ofxDoc struct {
	Transactions []ofxTransaction `xml:"BANKMSGSRSV1>STMTTRNRS>STMTRS>BANKTRANLIST>STMTTRN"`
	CreditTxns   []ofxTransaction `xml:"CREDITCARDMSGSRSV1>CCSTMTTRNRS>CCSTMTRS>BANKTRANLIST>STMTTRN"`
}

// ofxTypeToTallyoh converts OFX TRNTYPE to INCOME|EXPENSE.
func ofxTypeToTallyoh(ofxType string, amt float64) string {
	switch strings.ToUpper(ofxType) {
	case "CREDIT", "DEP", "DIRECTDEP", "INT", "DIV":
		return "INCOME"
	case "DEBIT", "ATM", "POS", "PAYMENT", "DIRECTDEBIT", "FEE", "SRVCHG", "CHECK", "CASH":
		return "EXPENSE"
	default:
		if amt >= 0 {
			return "INCOME"
		}
		return "EXPENSE"
	}
}

// stripOFXHeader removes the legacy SGML preamble found in OFX 1.x files
// so that the remainder can be parsed as XML.
func stripOFXHeader(raw string) string {
	// OFX 1.x has a series of HEADER:VALUE lines before the <OFX> tag
	idx := strings.Index(raw, "<OFX>")
	if idx == -1 {
		idx = strings.Index(raw, "<ofx>")
	}
	if idx < 0 {
		return raw
	}
	return raw[idx:]
}

func parseOFX(r io.Reader) ([]importRowDTO, []string) {
	data, err := io.ReadAll(r)
	if err != nil {
		return nil, []string{"failed to read file"}
	}

	xmlData := stripOFXHeader(string(data))

	var doc ofxDoc
	if err := xml.Unmarshal([]byte(xmlData), &doc); err != nil {
		return nil, []string{"invalid OFX format: " + err.Error()}
	}

	all := append(doc.Transactions, doc.CreditTxns...)
	if len(all) == 0 {
		return nil, []string{"no transactions found in OFX file"}
	}

	var rows []importRowDTO
	var errs []string

	for i, tx := range all {
		dateStr, ok := parseDate(tx.DtPosted)
		if !ok {
			errs = append(errs, "transaction "+strconv.Itoa(i+1)+": invalid date '"+tx.DtPosted+"'")
			continue
		}

		amtStr := strings.ReplaceAll(strings.TrimSpace(tx.TrnAmt), ",", ".")
		amt, err := strconv.ParseFloat(amtStr, 64)
		if err != nil {
			errs = append(errs, "transaction "+strconv.Itoa(i+1)+": invalid amount '"+tx.TrnAmt+"'")
			continue
		}

		txType := ofxTypeToTallyoh(tx.TrnType, amt)
		if amt < 0 {
			amt = -amt
		}

		desc := strings.TrimSpace(tx.Memo)
		if desc == "" {
			desc = strings.TrimSpace(tx.Name)
		}
		if desc == "" {
			if txType == "INCOME" {
				desc = "Receita"
			} else {
				desc = "Lançamento"
			}
		}

		rows = append(rows, importRowDTO{Date: dateStr, Description: desc, Amount: amt, Type: txType})
	}

	return rows, errs
}

// ── Duplicate detection ───────────────────────────────────────────────────────

func (h *Handler) markDuplicates(r *http.Request, userID string, rows []importRowDTO) {
	if len(rows) == 0 {
		return
	}

	// Build date range from the rows being imported
	minDate, maxDate := rows[0].Date, rows[0].Date
	for _, row := range rows[1:] {
		if row.Date < minDate {
			minDate = row.Date
		}
		if row.Date > maxDate {
			maxDate = row.Date
		}
	}

	type existingKey struct {
		date   string
		cents  int64
		txType string
	}
	existing := map[existingKey]bool{}

	dbRows, err := h.db.Query(r.Context(), `
		SELECT DATE(date)::text, amount_cents, type
		FROM transactions
		WHERE user_id = $1
		  AND is_active = true
		  AND date >= ($2::date - INTERVAL '2 days')
		  AND date <= ($3::date + INTERVAL '2 days')
	`, userID, minDate, maxDate)
	if err != nil {
		return
	}
	defer dbRows.Close()

	for dbRows.Next() {
		var d, t string
		var c int64
		if err := dbRows.Scan(&d, &c, &t); err == nil {
			existing[existingKey{d, c, t}] = true
		}
	}

	for i := range rows {
		c := money.ToCents(rows[i].Amount)
		if existing[existingKey{rows[i].Date, c, rows[i].Type}] {
			rows[i].PotentialDuplicate = true
		}
	}
}

// ── Handlers ──────────────────────────────────────────────────────────────────

func (h *Handler) PreviewImport(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "file too large or invalid multipart form")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "missing 'file' field")
		return
	}
	defer file.Close()

	filename := strings.ToLower(header.Filename)
	var rows []importRowDTO
	var errs []string

	if strings.HasSuffix(filename, ".ofx") || strings.HasSuffix(filename, ".ofc") {
		rows, errs = parseOFX(file)
	} else {
		rows, errs = parseCSV(file)
	}

	h.markDuplicates(r, claims.UserID, rows)

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
