package apiclient

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

const cookieName = "tallyoh_session"

var ErrUnauthorized = errors.New("unauthorized")

type Client struct {
	base string
	http *http.Client
}

func New(base string) *Client {
	return &Client{base: base, http: &http.Client{Timeout: 10 * time.Second}}
}

func (c *Client) req(method, path, token string, body []byte) (*http.Request, error) {
	var r *http.Request
	var err error
	if body != nil {
		r, err = http.NewRequest(method, c.base+path, bytes.NewReader(body))
	} else {
		r, err = http.NewRequest(method, c.base+path, nil)
	}
	if err != nil {
		return nil, err
	}
	if body != nil {
		r.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		r.AddCookie(&http.Cookie{Name: cookieName, Value: token})
	}
	return r, nil
}

func checkStatus(resp *http.Response) error {
	if resp.StatusCode == http.StatusUnauthorized {
		return ErrUnauthorized
	}
	return nil
}

// Login calls the backend and returns the raw response so the caller can forward cookies.
func (c *Client) Login(email, password string) (*http.Response, error) {
	body, _ := json.Marshal(map[string]string{"email": email, "password": password})
	r, err := http.NewRequest("POST", c.base+"/api/auth/login", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	r.Header.Set("Content-Type", "application/json")
	return c.http.Do(r)
}

func (c *Client) Logout(token string) {
	r, err := c.req("POST", "/api/auth/logout", token, nil)
	if err != nil {
		return
	}
	resp, err := c.http.Do(r)
	if err == nil {
		resp.Body.Close()
	}
}

// Transaction is the API transaction response shape.
type Transaction struct {
	ID            string       `json:"id"`
	Type          string       `json:"type"`
	Status        string       `json:"status"`
	Classification string      `json:"classification"`
	PaymentMethod string       `json:"paymentMethod"`
	Channel       string       `json:"channel"`
	Amount        float64      `json:"amount"`
	Description   string       `json:"description"`
	Date          time.Time    `json:"date"`
	IsRecurring   bool         `json:"isRecurring"`
	Category      *CategoryRef `json:"category"`
}

type CategoryRef struct {
	Name  *string `json:"name"`
	Color *string `json:"color"`
}

type ListParams struct {
	Page   int
	Limit  int
	Search string
	Type   string
	Status string
	From   string
	To     string
}

func (c *Client) ListTransactions(token string, p ListParams) ([]Transaction, error) {
	q := url.Values{}
	if p.Page > 1 {
		q.Set("page", strconv.Itoa(p.Page))
	}
	limit := p.Limit
	if limit == 0 {
		limit = 25
	}
	q.Set("limit", strconv.Itoa(limit))
	if p.Search != "" {
		q.Set("search", p.Search)
	}
	if p.Type != "" {
		q.Set("type", p.Type)
	}
	if p.Status != "" {
		q.Set("status", p.Status)
	}
	if p.From != "" {
		q.Set("from", p.From)
	}
	if p.To != "" {
		q.Set("to", p.To)
	}

	r, err := c.req("GET", "/api/v1/transactions?"+q.Encode(), token, nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.http.Do(r)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if err := checkStatus(resp); err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API %d", resp.StatusCode)
	}

	var txs []Transaction
	if err := json.NewDecoder(resp.Body).Decode(&txs); err != nil {
		return nil, err
	}
	return txs, nil
}

type CreateInput struct {
	Description   string  `json:"description"`
	Amount        float64 `json:"amount"`
	Date          string  `json:"date"`
	Type          string  `json:"type"`
	Status        string  `json:"status"`
	PaymentMethod string  `json:"paymentMethod"`
	Channel       string  `json:"channel"`
	CategoryID    *string `json:"categoryId,omitempty"`
}

func (c *Client) CreateTransaction(token string, in CreateInput) (*Transaction, error) {
	body, _ := json.Marshal(in)
	r, err := c.req("POST", "/api/v1/transactions", token, body)
	if err != nil {
		return nil, err
	}
	resp, err := c.http.Do(r)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if err := checkStatus(resp); err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusCreated {
		var e struct {
			Error string `json:"error"`
		}
		json.NewDecoder(resp.Body).Decode(&e)
		if e.Error != "" {
			return nil, errors.New(e.Error)
		}
		return nil, fmt.Errorf("API %d", resp.StatusCode)
	}

	var tx Transaction
	if err := json.NewDecoder(resp.Body).Decode(&tx); err != nil {
		return nil, err
	}
	return &tx, nil
}

func (c *Client) DeleteTransaction(token, id string) error {
	r, err := c.req("DELETE", "/api/v1/transactions/"+id, token, nil)
	if err != nil {
		return err
	}
	resp, err := c.http.Do(r)
	if err != nil {
		return err
	}
	resp.Body.Close()
	if err := checkStatus(resp); err != nil {
		return err
	}
	if resp.StatusCode != http.StatusNoContent {
		return fmt.Errorf("delete failed: %d", resp.StatusCode)
	}
	return nil
}

type Category struct {
	ID       string     `json:"id"`
	Name     string     `json:"name"`
	Type     string     `json:"type"`
	Color    *string    `json:"color"`
	Children []Category `json:"children"`
}

func (c *Client) ListCategories(token string) ([]Category, error) {
	r, err := c.req("GET", "/api/v1/categories", token, nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.http.Do(r)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if err := checkStatus(resp); err != nil {
		return nil, err
	}

	var cats []Category
	if err := json.NewDecoder(resp.Body).Decode(&cats); err != nil {
		return nil, err
	}
	return cats, nil
}

// FlatCategory is a flattened category for <select> options.
type FlatCategory struct {
	ID     string
	Name   string
	Type   string
	Indent bool
}

func FlattenCategories(cats []Category) []FlatCategory {
	var flat []FlatCategory
	for _, c := range cats {
		flat = append(flat, FlatCategory{ID: c.ID, Name: c.Name, Type: c.Type})
		for _, ch := range c.Children {
			flat = append(flat, FlatCategory{ID: ch.ID, Name: ch.Name, Type: ch.Type, Indent: true})
		}
	}
	return flat
}
