#!/bin/sh
set -e

MIGRATIONS_PATH=/app/migrations ./migrate up

exec ./main
