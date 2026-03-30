package models

import "time"

type Transfer struct {
	ID                       string
	SourceTransactionID      string
	DestinationTransactionID string
	CreatedAt                time.Time
}
