module github.com/nilbyte/personalledger/backend

go 1.25.0

replace github.com/nilbyte/personalledger/database => ../../database

require (
	github.com/golang-jwt/jwt/v5 v5.2.1
	github.com/jackc/pgx/v5 v5.6.0
	github.com/joho/godotenv v1.5.1
	github.com/nilbyte/personalledger/database v0.0.0-00010101000000-000000000000
	golang.org/x/crypto v0.45.0
)

require (
	github.com/google/uuid v1.6.0 // indirect
	github.com/jackc/pgpassfile v1.0.0 // indirect
	github.com/jackc/pgservicefile v0.0.0-20221227161230-091c0ba34f0a // indirect
	github.com/jackc/puddle/v2 v2.2.1 // indirect
	golang.org/x/sync v0.18.0 // indirect
	golang.org/x/text v0.31.0 // indirect
	golang.org/x/time v0.15.0 // indirect
)
