package web

import (
	"net/http"
	"time"

	"github.com/nilbyte/tallyoh/backend/internal/money"
)

func (h *Handler) ListBudgetsPage(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFromContext(r.Context())
	if !ok {
		http.Redirect(w, r, "/login", http.StatusSeeOther)
		return
	}

	month := r.URL.Query().Get("month")
	if month == "" {
		month = time.Now().Format("2006-01")
	}
	monthDate := month + "-01"

	rows, err := h.db.Query(r.Context(), `
		SELECT id, name, target_date, notes
		FROM budgets
		WHERE user_id = $1 AND is_active = true
		ORDER BY target_date DESC
	`, user.ID)
	if err != nil {
		h.engine.Render(w, r, "budgets-list", map[string]any{
			"Title": "Orçamentos", "User": user, "Error": "Erro ao carregar",
		})
		return
	}
	defer rows.Close()

	var budgets []map[string]any
	for rows.Next() {
		var id, name, notes string
		var targetDate time.Time
		rows.Scan(&id, &name, &targetDate, &notes)

		// Items with derived amounts
		itemRows, _ := h.db.Query(r.Context(), `
			SELECT i.id, i.name, i.category_id, c.name AS category_name, c.color AS category_color,
			       COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount_cents ELSE 0 END), 0) AS budgeted,
			       COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN t.amount_cents ELSE 0 END), 0) AS spent
			FROM budget_items i
			LEFT JOIN categories c ON c.id = i.category_id
			LEFT JOIN transactions t ON t.budget_item_id = i.id AND t.is_active = true
			  AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', $2::date)
			WHERE i.budget_id = $1 AND i.is_active = true
			GROUP BY i.id, i.name, i.category_id, c.name, c.color, i.sort_order
			ORDER BY i.sort_order
		`, id, monthDate)

		var items []map[string]any
		var totalBudgeted, totalSpent int64
		if itemRows != nil {
			for itemRows.Next() {
				var iid, iname string
				var catID, catName, catColor *string
				var budgeted, spent int64
				itemRows.Scan(&iid, &iname, &catID, &catName, &catColor, &budgeted, &spent)
				progress := 0
				if budgeted > 0 {
					progress = int((spent * 100) / budgeted)
				}
				items = append(items, map[string]any{
					"ID": iid, "Name": iname, "CategoryName": catName, "CategoryColor": catColor,
					"Budgeted": money.ToReais(budgeted), "Spent": money.ToReais(spent),
					"Remaining": money.ToReais(budgeted - spent),
					"Progress": progress,
				})
				totalBudgeted += budgeted
				totalSpent += spent
			}
			itemRows.Close()
		}
		if items == nil {
			items = []map[string]any{}
		}

		budgets = append(budgets, map[string]any{
			"ID": id, "Name": name, "TargetDate": targetDate, "Notes": notes,
			"Items": items, "TotalBudgeted": money.ToReais(totalBudgeted),
			"TotalSpent": money.ToReais(totalSpent), "TotalRemaining": money.ToReais(totalBudgeted - totalSpent),
		})
	}
	if budgets == nil {
		budgets = []map[string]any{}
	}

	h.engine.Render(w, r, "budgets-list", map[string]any{
		"Title":   "Orçamentos",
		"User":    user,
		"Budgets": budgets,
		"Month":   month,
	})
}
