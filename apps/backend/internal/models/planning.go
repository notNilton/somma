package models

import "time"

const (
	PlanningStatusACTIVE    = "ACTIVE"
	PlanningStatusPAUSED    = "PAUSED"
	PlanningStatusCOMPLETED = "COMPLETED"
	PlanningStatusCANCELED  = "CANCELED"
)

var ValidPlanningStatuses = map[string]bool{
	PlanningStatusACTIVE:    true,
	PlanningStatusPAUSED:    true,
	PlanningStatusCOMPLETED: true,
	PlanningStatusCANCELED:  true,
}

type PlanningPlan struct {
	ID                string
	UserID            string
	Name              string
	TargetAmountCents int64
	TargetDate        *time.Time
	Status            string
	Notes             *string
	Color             *string
	Icon              *string
	IsActive          bool
	DeletedAt         *time.Time
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

type PlanningPlanItem struct {
	ID                   string
	PlanID               string
	CategoryID           *string
	Name                 string
	EstimatedAmountCents int64
	Notes                *string
	SortOrder            int
	IsActive             bool
	DeletedAt            *time.Time
	CreatedAt            time.Time
	UpdatedAt            time.Time
}

type PlanningContribution struct {
	ID               string
	PlanID           string
	AmountCents      int64
	ContributionDate time.Time
	Notes            *string
	IsActive         bool
	DeletedAt        *time.Time
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type PlanningPlanSummary struct {
	PlanningPlan
	EstimatedTotalCents   int64
	ContributedTotalCents int64
	ItemCount             int
	ContributionCount     int
	LastContributionDate  *time.Time
}

type PlanningPlanItemWithCategory struct {
	PlanningPlanItem
	CategoryName  *string
	CategoryColor *string
}
