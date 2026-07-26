package models

type MonthlyEvolutionPoint struct {
	Month        string `json:"month"`
	IncomeCents  int64  `json:"incomeCents"`
	ExpenseCents int64  `json:"expenseCents"`
}

type CategoryBreakdownItem struct {
	CategoryID    *string `json:"categoryId"`
	CategoryName  *string `json:"categoryName"`
	CategoryColor *string `json:"categoryColor"`
	Type          string  `json:"type"`
	TotalCents    int64   `json:"totalCents"`
	Count         int     `json:"count"`
}
