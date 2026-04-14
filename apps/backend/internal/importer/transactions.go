package importer

import (
	"context"
	"crypto/sha256"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/nilbyte/mirante/backend/internal/models"
	"github.com/nilbyte/mirante/backend/internal/money"
)

const MaxUploadBytes int64 = 10 << 20

var ErrUnsupportedFormat = errors.New("unsupported import format")

type DB interface {
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

type TransactionImportOptions struct {
	UserID      string
	AccountID   string
	CardID      string
	Filename    string
	ContentType string
	Format      string
	Reader      io.Reader
}

type ImportResult struct {
	Created          int      `json:"created"`
	Skipped          int      `json:"skipped"`
	SkippedInvalid   int      `json:"skippedInvalid"`
	SkippedDuplicate int      `json:"skippedDuplicate"`
	Errors           []string `json:"errors"`
}

type transactionTarget struct {
	AccountID      string
	CardID         *string
	PaymentMethod  string
	Channel        string
	AffectsAccount bool
}

type TransactionDraft struct {
	Row         int
	Date        time.Time
	Description string
	Amount      float64
	Type        string
	Currency    string
	Raw         string
}

type Parser interface {
	Parse(r io.Reader) ([]TransactionDraft, error)
}

func ImportTransactions(ctx context.Context, db DB, opts TransactionImportOptions) (ImportResult, error) {
	var result ImportResult
	if opts.UserID == "" {
		return result, errors.New("user id is required")
	}
	if opts.Reader == nil {
		return result, errors.New("reader is required")
	}

	target, err := resolveTarget(ctx, db, opts)
	if err != nil {
		return result, err
	}

	parser, err := ParserFor(opts.Format, opts.Filename, opts.ContentType)
	if err != nil {
		return result, err
	}

	drafts, err := parser.Parse(io.LimitReader(opts.Reader, MaxUploadBytes+1))
	if err != nil {
		return result, err
	}

	for _, draft := range drafts {
		if err := draft.validate(); err != nil {
			result.SkippedInvalid++
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: %s", draft.Row, err.Error()))
			continue
		}

		hash := fingerprint(target, draft)
		tag, err := db.Exec(ctx, `
			INSERT INTO import_fingerprints (hash, account_id) VALUES ($1, $2) ON CONFLICT DO NOTHING
		`, hash, target.AccountID)
		if err != nil {
			result.SkippedInvalid++
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: duplicate check failed", draft.Row))
			continue
		}
		if tag.RowsAffected() == 0 {
			result.SkippedDuplicate++
			continue
		}

		txDate := time.Date(draft.Date.Year(), draft.Date.Month(), draft.Date.Day(), 12, 0, 0, 0, time.UTC)
		currency := draft.Currency
		if currency == "" {
			currency = "BRL"
		}

		_, err = db.Exec(ctx, `
			INSERT INTO transactions (
				account_id, user_id, card_id, type, payment_method, channel,
				amount_cents, date, description, currency_code, affects_account
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		`,
			target.AccountID, opts.UserID, target.CardID, draft.Type, target.PaymentMethod, target.Channel,
			money.ToCents(draft.Amount), txDate, draft.Description, currency, target.AffectsAccount,
		)
		if err != nil {
			result.Skipped++
			result.Errors = append(result.Errors, fmt.Sprintf("row %d: %s", draft.Row, err.Error()))
			continue
		}

		result.Created++
	}

	return result, nil
}

func resolveTarget(ctx context.Context, db DB, opts TransactionImportOptions) (transactionTarget, error) {
	if opts.CardID == "" && opts.AccountID == "" {
		return transactionTarget{}, errors.New("accountId or cardId is required")
	}
	if opts.CardID != "" {
		var accountID, cardType string
		err := db.QueryRow(ctx, `
			SELECT account_id, type
			FROM cards
			WHERE id = $1 AND user_id = $2 AND is_active = true
		`, opts.CardID, opts.UserID).Scan(&accountID, &cardType)
		if err != nil {
			return transactionTarget{}, errors.New("card not found")
		}

		channel := models.ChannelCARD_DEBIT
		paymentMethod := models.PaymentMethodDEBIT
		affectsAccount := true
		if cardType == models.CardTypeCREDIT {
			channel = models.ChannelCARD_CREDIT
			paymentMethod = models.PaymentMethodCREDIT
			affectsAccount = false
		}

		return transactionTarget{
			AccountID:      accountID,
			CardID:         &opts.CardID,
			PaymentMethod:  paymentMethod,
			Channel:        channel,
			AffectsAccount: affectsAccount,
		}, nil
	}

	var accountID string
	err := db.QueryRow(ctx, `
		SELECT id
		FROM accounts
		WHERE id = $1 AND user_id = $2 AND is_active = true
	`, opts.AccountID, opts.UserID).Scan(&accountID)
	if err != nil {
		return transactionTarget{}, errors.New("account not found")
	}

	return transactionTarget{
		AccountID:      accountID,
		PaymentMethod:  models.PaymentMethodDEBIT,
		Channel:        models.ChannelBANK,
		AffectsAccount: true,
	}, nil
}

func ParserFor(format, filename, contentType string) (Parser, error) {
	switch normalizedFormat(format, filename, contentType) {
	case "csv":
		return DelimitedParser{Comma: ','}, nil
	case "tsv":
		return DelimitedParser{Comma: '\t'}, nil
	case "json":
		return JSONParser{}, nil
	default:
		return nil, ErrUnsupportedFormat
	}
}

func normalizedFormat(format, filename, contentType string) string {
	if format = strings.ToLower(strings.TrimSpace(format)); format != "" {
		return strings.TrimPrefix(format, ".")
	}
	if filename != "" {
		switch strings.ToLower(strings.TrimPrefix(filepath.Ext(filename), ".")) {
		case "csv":
			return "csv"
		case "tsv", "tab":
			return "tsv"
		case "json":
			return "json"
		}
	}
	if contentType != "" {
		mediaType, _, err := mime.ParseMediaType(contentType)
		if err == nil {
			switch strings.ToLower(mediaType) {
			case "text/csv", "application/csv":
				return "csv"
			case "text/tab-separated-values":
				return "tsv"
			case "application/json", "text/json":
				return "json"
			}
		}
	}
	return ""
}

type DelimitedParser struct {
	Comma rune
}

func (p DelimitedParser) Parse(r io.Reader) ([]TransactionDraft, error) {
	reader := csv.NewReader(r)
	reader.Comma = p.Comma
	reader.FieldsPerRecord = -1
	reader.TrimLeadingSpace = true

	records, err := reader.ReadAll()
	if err != nil {
		return nil, errors.New("invalid delimited file")
	}
	if len(records) == 0 {
		return nil, errors.New("empty file")
	}

	header := buildHeader(records[0])
	start := 1
	if header.date < 0 || header.description < 0 || header.amount < 0 {
		header = defaultHeader()
		start = 0
	}

	var drafts []TransactionDraft
	for i := start; i < len(records); i++ {
		record := records[i]
		if emptyRecord(record) {
			continue
		}
		draft, err := header.draftFromRecord(i+1, record)
		if err != nil {
			drafts = append(drafts, TransactionDraft{Row: i + 1, Raw: strings.Join(record, string(p.Comma))})
			continue
		}
		drafts = append(drafts, draft)
	}

	return drafts, nil
}

type JSONParser struct{}

func (JSONParser) Parse(r io.Reader) ([]TransactionDraft, error) {
	var payload any
	decoder := json.NewDecoder(r)
	decoder.UseNumber()
	if err := decoder.Decode(&payload); err != nil {
		return nil, errors.New("invalid json file")
	}

	var items []any
	switch v := payload.(type) {
	case []any:
		items = v
	case map[string]any:
		switch transactions := v["transactions"].(type) {
		case []any:
			items = transactions
		default:
			items = []any{v}
		}
	default:
		return nil, errors.New("json must be an object or array")
	}

	drafts := make([]TransactionDraft, 0, len(items))
	for i, item := range items {
		obj, ok := item.(map[string]any)
		if !ok {
			drafts = append(drafts, TransactionDraft{Row: i + 1})
			continue
		}
		draft := TransactionDraft{
			Row:         i + 1,
			Description: firstString(obj, "description", "descricao", "memo", "title"),
			Type:        normalizeType(firstString(obj, "type", "tipo")),
			Currency:    strings.ToUpper(firstString(obj, "currency", "currencyCode", "moeda")),
		}
		if date, err := parseDate(firstString(obj, "date", "data", "postedAt")); err == nil {
			draft.Date = date
		}
		if amount, err := amountFromAny(firstValue(obj, "amount", "valor", "value")); err == nil {
			draft.Amount = amount
		}
		draft.Type, draft.Amount = inferTypeAndAmount(draft.Type, draft.Amount)
		draft.Raw = canonicalJSON(obj)
		drafts = append(drafts, draft)
	}

	return drafts, nil
}

type headerMap struct {
	date        int
	description int
	amount      int
	txType      int
	currency    int
}

func buildHeader(record []string) headerMap {
	header := headerMap{date: -1, description: -1, amount: -1, txType: -1, currency: -1}
	for i, column := range record {
		switch normalizeColumn(column) {
		case "date", "data", "postedat", "transactiondate":
			header.date = i
		case "description", "descricao", "descrição", "memo", "historico", "histórico", "title":
			header.description = i
		case "amount", "valor", "value":
			header.amount = i
		case "type", "tipo":
			header.txType = i
		case "currency", "currencycode", "moeda":
			header.currency = i
		}
	}
	return header
}

func defaultHeader() headerMap {
	return headerMap{date: 0, description: 1, amount: 2, txType: 3, currency: 4}
}

func (h headerMap) draftFromRecord(row int, record []string) (TransactionDraft, error) {
	draft := TransactionDraft{Row: row, Raw: strings.Join(record, ",")}
	date, err := parseDate(valueAt(record, h.date))
	if err != nil {
		return draft, err
	}
	amount, err := parseAmount(valueAt(record, h.amount))
	if err != nil {
		return draft, err
	}
	draft.Date = date
	draft.Description = strings.TrimSpace(valueAt(record, h.description))
	draft.Type = normalizeType(valueAt(record, h.txType))
	draft.Currency = strings.ToUpper(strings.TrimSpace(valueAt(record, h.currency)))
	draft.Type, draft.Amount = inferTypeAndAmount(draft.Type, amount)
	return draft, nil
}

func (d TransactionDraft) validate() error {
	if d.Date.IsZero() {
		return errors.New("invalid date")
	}
	if strings.TrimSpace(d.Description) == "" {
		return errors.New("description is required")
	}
	if len(d.Description) > 255 {
		return errors.New("description max 255 chars")
	}
	if d.Amount <= 0 {
		return errors.New("amount must be > 0")
	}
	if !models.ValidTransactionTypes[d.Type] || d.Type == models.TransactionTypeTRANSFER {
		return errors.New("invalid transaction type")
	}
	return nil
}

func fingerprint(target transactionTarget, draft TransactionDraft) string {
	raw := strings.Join([]string{
		target.AccountID,
		stringPtrValue(target.CardID),
		draft.Date.Format("2006-01-02"),
		strings.ToLower(strings.TrimSpace(draft.Description)),
		fmt.Sprintf("%.2f", draft.Amount),
		draft.Type,
		draft.Currency,
	}, "|")
	return fmt.Sprintf("%x", sha256.Sum256([]byte(raw)))
}

func inferTypeAndAmount(txType string, amount float64) (string, float64) {
	if txType == "" {
		if amount > 0 {
			txType = models.TransactionTypeINCOME
		} else {
			txType = models.TransactionTypeEXPENSE
		}
	}
	if amount < 0 {
		amount = -amount
	}
	return txType, amount
}

func normalizeType(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "", "auto":
		return ""
	case "income", "entrada", "receita", "credito", "crédito", "credit":
		return models.TransactionTypeINCOME
	case "expense", "saida", "saída", "despesa", "debito", "débito", "debit":
		return models.TransactionTypeEXPENSE
	case "adjustment", "ajuste":
		return models.TransactionTypeADJUSTMENT
	default:
		return strings.ToUpper(strings.TrimSpace(value))
	}
}

func parseDate(value string) (time.Time, error) {
	value = strings.TrimSpace(value)
	for _, layout := range []string{"2006-01-02", "02/01/2006", "02-01-2006", time.RFC3339} {
		if t, err := time.Parse(layout, value); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("invalid date %q", value)
}

func parseAmount(value string) (float64, error) {
	value = strings.TrimSpace(value)
	value = strings.ReplaceAll(value, "R$", "")
	value = strings.ReplaceAll(value, " ", "")
	if strings.Contains(value, ",") {
		value = strings.ReplaceAll(value, ".", "")
		value = strings.ReplaceAll(value, ",", ".")
	}
	return strconv.ParseFloat(value, 64)
}

func amountFromAny(value any) (float64, error) {
	switch v := value.(type) {
	case json.Number:
		return v.Float64()
	case float64:
		return v, nil
	case string:
		return parseAmount(v)
	default:
		return 0, errors.New("invalid amount")
	}
}

func firstString(obj map[string]any, keys ...string) string {
	value := firstValue(obj, keys...)
	switch v := value.(type) {
	case string:
		return strings.TrimSpace(v)
	case json.Number:
		return v.String()
	default:
		if v == nil {
			return ""
		}
		return strings.TrimSpace(fmt.Sprint(v))
	}
}

func firstValue(obj map[string]any, keys ...string) any {
	for _, key := range keys {
		for k, v := range obj {
			if strings.EqualFold(k, key) {
				return v
			}
		}
	}
	return nil
}

func canonicalJSON(obj map[string]any) string {
	data, err := json.Marshal(obj)
	if err != nil {
		return fmt.Sprint(obj)
	}
	return string(data)
}

func normalizeColumn(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.ReplaceAll(value, "_", "")
	value = strings.ReplaceAll(value, "-", "")
	value = strings.ReplaceAll(value, " ", "")
	return value
}

func valueAt(record []string, index int) string {
	if index < 0 || index >= len(record) {
		return ""
	}
	return strings.TrimSpace(record[index])
}

func emptyRecord(record []string) bool {
	for _, value := range record {
		if strings.TrimSpace(value) != "" {
			return false
		}
	}
	return true
}

func stringPtrValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
