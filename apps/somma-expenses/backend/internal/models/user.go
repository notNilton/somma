package models

import "time"

type User struct {
	ID                 string
	Email              string
	PasswordHash       string
	Name               *string
	Phone              *string
	Cpf                *string
	Cnpj               *string
	AvatarUrl          *string
	PrivacyModeEnabled bool
	CreatedAt          time.Time
	UpdatedAt          time.Time
}
