package models

import "time"

type Category struct {
	ID          string
	UserID      string
	Name        string
	Type        string
	Description *string
	Color       *string
	ParentID    *string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type CategoryWithChildren struct {
	Category
	Children []Category `json:"children"`
}
