package importer

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/nilbyte/mirante/backend/internal/models"
)

type fakeDB struct {
	accounts     map[string]string
	cards        map[string]fakeCard
	fingerprints map[string]bool
	inserted     []insertedTransaction
	failInsert   map[string]bool
}

type fakeCard struct {
	accountID string
	userID    string
	cardType  string
}

type insertedTransaction struct {
	accountID      string
	userID         string
	cardID         *string
	txType         string
	paymentMethod  string
	channel        string
	amountCents    int64
	date           time.Time
	description    string
	currency       string
	affectsAccount bool
}

func newFakeDB() *fakeDB {
	return &fakeDB{
		accounts:     map[string]string{"acc-1": "user-1"},
		cards:        map[string]fakeCard{},
		fingerprints: map[string]bool{},
		failInsert:   map[string]bool{},
	}
}

func (db *fakeDB) Exec(_ context.Context, sql string, args ...any) (pgconn.CommandTag, error) {
	switch {
	case strings.Contains(sql, "import_fingerprints"):
		hash := args[0].(string)
		if db.fingerprints[hash] {
			return pgconn.NewCommandTag("INSERT 0 0"), nil
		}
		db.fingerprints[hash] = true
		return pgconn.NewCommandTag("INSERT 0 1"), nil

	case strings.Contains(sql, "INSERT INTO transactions"):
		description := args[8].(string)
		if db.failInsert[description] {
			return pgconn.CommandTag{}, errors.New("insert failed")
		}
		db.inserted = append(db.inserted, insertedTransaction{
			accountID:      args[0].(string),
			userID:         args[1].(string),
			cardID:         args[2].(*string),
			txType:         args[3].(string),
			paymentMethod:  args[4].(string),
			channel:        args[5].(string),
			amountCents:    args[6].(int64),
			date:           args[7].(time.Time),
			description:    description,
			currency:       args[9].(string),
			affectsAccount: args[10].(bool),
		})
		return pgconn.NewCommandTag("INSERT 0 1"), nil

	default:
		return pgconn.CommandTag{}, errors.New("unexpected exec")
	}
}

func (db *fakeDB) QueryRow(_ context.Context, sql string, args ...any) pgx.Row {
	if strings.Contains(sql, "FROM cards") {
		cardID := args[0].(string)
		userID := args[1].(string)
		card, ok := db.cards[cardID]
		if !ok || card.userID != userID {
			return fakeRow{err: pgx.ErrNoRows}
		}
		return fakeRow{values: []any{card.accountID, card.cardType}}
	}

	if strings.Contains(sql, "FROM accounts") {
		accountID := args[0].(string)
		userID := args[1].(string)
		if db.accounts[accountID] != userID {
			return fakeRow{err: pgx.ErrNoRows}
		}
		return fakeRow{values: []any{accountID}}
	}

	return fakeRow{err: errors.New("unexpected query")}
}

type fakeRow struct {
	values []any
	err    error
}

func (r fakeRow) Scan(dest ...any) error {
	if r.err != nil {
		return r.err
	}
	for i := range dest {
		switch d := dest[i].(type) {
		case *string:
			*d = r.values[i].(string)
		default:
			return errors.New("unsupported scan destination")
		}
	}
	return nil
}

func TestParserForDetectsSupportedFormats(t *testing.T) {
	tests := []struct {
		name        string
		format      string
		filename    string
		contentType string
		wantType    any
	}{
		{name: "format csv overrides filename", format: "csv", filename: "x.json", wantType: DelimitedParser{}},
		{name: "extension csv", filename: "statement.csv", wantType: DelimitedParser{}},
		{name: "extension tsv", filename: "statement.tsv", wantType: DelimitedParser{}},
		{name: "extension json", filename: "statement.json", wantType: JSONParser{}},
		{name: "content type csv", contentType: "text/csv; charset=utf-8", wantType: DelimitedParser{}},
		{name: "content type tsv", contentType: "text/tab-separated-values", wantType: DelimitedParser{}},
		{name: "content type json", contentType: "application/json", wantType: JSONParser{}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			parser, err := ParserFor(tt.format, tt.filename, tt.contentType)
			if err != nil {
				t.Fatalf("ParserFor returned error: %v", err)
			}
			switch tt.wantType.(type) {
			case DelimitedParser:
				if _, ok := parser.(DelimitedParser); !ok {
					t.Fatalf("expected DelimitedParser, got %T", parser)
				}
			case JSONParser:
				if _, ok := parser.(JSONParser); !ok {
					t.Fatalf("expected JSONParser, got %T", parser)
				}
			}
		})
	}
}

func TestParserForUnsupportedFormat(t *testing.T) {
	_, err := ParserFor("", "statement.ofx", "application/octet-stream")
	if !errors.Is(err, ErrUnsupportedFormat) {
		t.Fatalf("expected ErrUnsupportedFormat, got %v", err)
	}
}

func TestDelimitedParserParsesHeadersFallbackAndInvalidRows(t *testing.T) {
	t.Run("english header with negative amount inference", func(t *testing.T) {
		parser := DelimitedParser{Comma: ','}
		drafts, err := parser.Parse(strings.NewReader("date,description,amount,type,currency\n2026-01-15,Market,-150.00,,USD\n"))
		if err != nil {
			t.Fatalf("parse: %v", err)
		}
		if len(drafts) != 1 {
			t.Fatalf("expected 1 draft, got %d", len(drafts))
		}
		got := drafts[0]
		if got.Type != models.TransactionTypeEXPENSE || got.Amount != 150 || got.Currency != "USD" {
			t.Fatalf("unexpected draft: %#v", got)
		}
	})

	t.Run("portuguese header and brl amount", func(t *testing.T) {
		parser := DelimitedParser{Comma: ','}
		drafts, err := parser.Parse(strings.NewReader("data,descrição,valor,tipo\n02/01/2026,Mercado,\"R$ 1.234,56\",despesa\n"))
		if err != nil {
			t.Fatalf("parse: %v", err)
		}
		if len(drafts) != 1 {
			t.Fatalf("expected 1 draft, got %d", len(drafts))
		}
		got := drafts[0]
		if got.Type != models.TransactionTypeEXPENSE || got.Amount != 1234.56 || got.Description != "Mercado" {
			t.Fatalf("unexpected draft: %#v", got)
		}
	})

	t.Run("no header falls back to date description amount type", func(t *testing.T) {
		parser := DelimitedParser{Comma: ','}
		drafts, err := parser.Parse(strings.NewReader("2026-01-15,Freela,300.00,INCOME\n"))
		if err != nil {
			t.Fatalf("parse: %v", err)
		}
		if len(drafts) != 1 {
			t.Fatalf("expected 1 draft, got %d", len(drafts))
		}
		if drafts[0].Type != models.TransactionTypeINCOME || drafts[0].Description != "Freela" {
			t.Fatalf("unexpected draft: %#v", drafts[0])
		}
	})

	t.Run("tsv parser", func(t *testing.T) {
		parser := DelimitedParser{Comma: '\t'}
		drafts, err := parser.Parse(strings.NewReader("date\tdescription\tamount\ttype\n2026-01-15\tTaxi\t42.30\tEXPENSE\n"))
		if err != nil {
			t.Fatalf("parse: %v", err)
		}
		if len(drafts) != 1 || drafts[0].Description != "Taxi" || drafts[0].Amount != 42.30 {
			t.Fatalf("unexpected drafts: %#v", drafts)
		}
	})

	t.Run("invalid row becomes invalid draft", func(t *testing.T) {
		parser := DelimitedParser{Comma: ','}
		drafts, err := parser.Parse(strings.NewReader("date,description,amount\nnot-a-date,Bad,10\n2026-01-15,Good,20\n"))
		if err != nil {
			t.Fatalf("parse: %v", err)
		}
		if len(drafts) != 2 {
			t.Fatalf("expected 2 drafts, got %d", len(drafts))
		}
		if err := drafts[0].validate(); err == nil {
			t.Fatalf("expected first draft to be invalid")
		}
		if err := drafts[1].validate(); err != nil {
			t.Fatalf("expected second draft to be valid: %v", err)
		}
	})
}

func TestJSONParserParsesObjectArrayAndInvalidItems(t *testing.T) {
	t.Run("transactions wrapper", func(t *testing.T) {
		payload := `{"transactions":[
			{"date":"2026-02-01","description":"Freela","amount":1200.50,"type":"INCOME","currencyCode":"USD"},
			{"data":"02/02/2026","descricao":"Mercado","valor":"R$ 180,35","tipo":"despesa"}
		]}`
		drafts, err := (JSONParser{}).Parse(strings.NewReader(payload))
		if err != nil {
			t.Fatalf("parse: %v", err)
		}
		if len(drafts) != 2 {
			t.Fatalf("expected 2 drafts, got %d", len(drafts))
		}
		if drafts[0].Type != models.TransactionTypeINCOME || drafts[0].Currency != "USD" {
			t.Fatalf("unexpected first draft: %#v", drafts[0])
		}
		if drafts[1].Type != models.TransactionTypeEXPENSE || drafts[1].Amount != 180.35 {
			t.Fatalf("unexpected second draft: %#v", drafts[1])
		}
	})

	t.Run("single object", func(t *testing.T) {
		payload := `{"postedAt":"2026-02-03T12:30:00Z","title":"Ajuste","value":5,"type":"adjustment"}`
		drafts, err := (JSONParser{}).Parse(strings.NewReader(payload))
		if err != nil {
			t.Fatalf("parse: %v", err)
		}
		if len(drafts) != 1 || drafts[0].Type != models.TransactionTypeADJUSTMENT || drafts[0].Description != "Ajuste" {
			t.Fatalf("unexpected drafts: %#v", drafts)
		}
	})

	t.Run("array with invalid item is returned as invalid draft", func(t *testing.T) {
		drafts, err := (JSONParser{}).Parse(strings.NewReader(`[{"date":"2026-01-01","description":"Ok","amount":10}, "bad"]`))
		if err != nil {
			t.Fatalf("parse: %v", err)
		}
		if len(drafts) != 2 {
			t.Fatalf("expected 2 drafts, got %d", len(drafts))
		}
		if err := drafts[1].validate(); err == nil {
			t.Fatalf("expected non-object item to become invalid draft")
		}
	})
}

func TestImportTransactionsAccountTargetDedupAndInvalidRows(t *testing.T) {
	db := newFakeDB()
	body := `date,description,amount,type
2026-01-15,Market,150.00,EXPENSE
bad-date,Broken,10.00,EXPENSE
2026-01-16,Salary,3000.00,INCOME
2026-01-17,Market,0,EXPENSE
`

	result, err := ImportTransactions(context.Background(), db, TransactionImportOptions{
		UserID:    "user-1",
		AccountID: "acc-1",
		Filename:  "statement.csv",
		Reader:    strings.NewReader(body),
	})
	if err != nil {
		t.Fatalf("import: %v", err)
	}
	if result.Created != 2 || result.SkippedInvalid != 2 || result.SkippedDuplicate != 0 || result.Skipped != 0 {
		t.Fatalf("unexpected result: %#v", result)
	}
	if len(db.inserted) != 2 {
		t.Fatalf("expected 2 inserts, got %d", len(db.inserted))
	}
	if db.inserted[0].accountID != "acc-1" || db.inserted[0].paymentMethod != models.PaymentMethodDEBIT || db.inserted[0].channel != models.ChannelBANK || !db.inserted[0].affectsAccount {
		t.Fatalf("unexpected account mapping: %#v", db.inserted[0])
	}

	result, err = ImportTransactions(context.Background(), db, TransactionImportOptions{
		UserID:    "user-1",
		AccountID: "acc-1",
		Filename:  "statement.csv",
		Reader:    strings.NewReader("date,description,amount,type\n2026-01-15,Market,150.00,EXPENSE\n"),
	})
	if err != nil {
		t.Fatalf("second import: %v", err)
	}
	if result.Created != 0 || result.SkippedDuplicate != 1 {
		t.Fatalf("expected duplicate-only result, got %#v", result)
	}
}

func TestImportTransactionsCardTargets(t *testing.T) {
	tests := []struct {
		name           string
		cardType       string
		wantPayment    string
		wantChannel    string
		wantAffectsAcc bool
	}{
		{name: "credit card", cardType: models.CardTypeCREDIT, wantPayment: models.PaymentMethodCREDIT, wantChannel: models.ChannelCARD_CREDIT, wantAffectsAcc: false},
		{name: "debit card", cardType: models.CardTypeDEBIT, wantPayment: models.PaymentMethodDEBIT, wantChannel: models.ChannelCARD_DEBIT, wantAffectsAcc: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db := newFakeDB()
			db.cards["card-1"] = fakeCard{accountID: "acc-1", userID: "user-1", cardType: tt.cardType}

			result, err := ImportTransactions(context.Background(), db, TransactionImportOptions{
				UserID:   "user-1",
				CardID:   "card-1",
				Filename: "statement.json",
				Reader:   strings.NewReader(`{"date":"2026-01-15","description":"Subscription","amount":49.9,"type":"EXPENSE"}`),
			})
			if err != nil {
				t.Fatalf("import: %v", err)
			}
			if result.Created != 1 || len(db.inserted) != 1 {
				t.Fatalf("unexpected import result: %#v inserts=%d", result, len(db.inserted))
			}
			got := db.inserted[0]
			if got.cardID == nil || *got.cardID != "card-1" {
				t.Fatalf("expected card id to be set, got %#v", got.cardID)
			}
			if got.paymentMethod != tt.wantPayment || got.channel != tt.wantChannel || got.affectsAccount != tt.wantAffectsAcc {
				t.Fatalf("unexpected card mapping: %#v", got)
			}
		})
	}
}

func TestImportTransactionsErrorsAndPartialFailures(t *testing.T) {
	t.Run("requires user id", func(t *testing.T) {
		_, err := ImportTransactions(context.Background(), newFakeDB(), TransactionImportOptions{
			AccountID: "acc-1",
			Filename:  "statement.csv",
			Reader:    strings.NewReader("date,description,amount\n2026-01-01,Ok,10\n"),
		})
		if err == nil || !strings.Contains(err.Error(), "user id") {
			t.Fatalf("expected user id error, got %v", err)
		}
	})

	t.Run("requires reader", func(t *testing.T) {
		_, err := ImportTransactions(context.Background(), newFakeDB(), TransactionImportOptions{
			UserID:    "user-1",
			AccountID: "acc-1",
			Filename:  "statement.csv",
		})
		if err == nil || !strings.Contains(err.Error(), "reader") {
			t.Fatalf("expected reader error, got %v", err)
		}
	})

	t.Run("requires account or card", func(t *testing.T) {
		_, err := ImportTransactions(context.Background(), newFakeDB(), TransactionImportOptions{
			UserID:   "user-1",
			Filename: "statement.csv",
			Reader:   strings.NewReader("date,description,amount\n2026-01-01,Ok,10\n"),
		})
		if err == nil || !strings.Contains(err.Error(), "accountId or cardId") {
			t.Fatalf("expected target error, got %v", err)
		}
	})

	t.Run("account not found", func(t *testing.T) {
		_, err := ImportTransactions(context.Background(), newFakeDB(), TransactionImportOptions{
			UserID:    "user-1",
			AccountID: "missing",
			Filename:  "statement.csv",
			Reader:    strings.NewReader("date,description,amount\n2026-01-01,Ok,10\n"),
		})
		if err == nil || !strings.Contains(err.Error(), "account not found") {
			t.Fatalf("expected account error, got %v", err)
		}
	})

	t.Run("card not found", func(t *testing.T) {
		_, err := ImportTransactions(context.Background(), newFakeDB(), TransactionImportOptions{
			UserID:   "user-1",
			CardID:   "missing",
			Filename: "statement.csv",
			Reader:   strings.NewReader("date,description,amount\n2026-01-01,Ok,10\n"),
		})
		if err == nil || !strings.Contains(err.Error(), "card not found") {
			t.Fatalf("expected card error, got %v", err)
		}
	})

	t.Run("unsupported format", func(t *testing.T) {
		_, err := ImportTransactions(context.Background(), newFakeDB(), TransactionImportOptions{
			UserID:    "user-1",
			AccountID: "acc-1",
			Filename:  "statement.ofx",
			Reader:    strings.NewReader("whatever"),
		})
		if !errors.Is(err, ErrUnsupportedFormat) {
			t.Fatalf("expected unsupported format, got %v", err)
		}
	})

	t.Run("insert failure is reported as skipped", func(t *testing.T) {
		db := newFakeDB()
		db.failInsert["Boom"] = true
		result, err := ImportTransactions(context.Background(), db, TransactionImportOptions{
			UserID:    "user-1",
			AccountID: "acc-1",
			Filename:  "statement.csv",
			Reader:    strings.NewReader("date,description,amount\n2026-01-01,Boom,10\n2026-01-02,Ok,20\n"),
		})
		if err != nil {
			t.Fatalf("import: %v", err)
		}
		if result.Created != 1 || result.Skipped != 1 || len(result.Errors) != 1 {
			t.Fatalf("unexpected result: %#v", result)
		}
	})
}
