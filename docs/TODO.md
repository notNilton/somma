# TODO

## Backend

- [ ] Recurring transaction engine — cron job that generates transactions from a recurrence rule (frequency, interval, end date); idempotent so re-runs are safe
- [ ] Budget alert jobs — fire when spending reaches configurable thresholds (e.g. 80%, 100%) per envelope; debounce to avoid duplicate alerts
- [ ] OFX/QIF import — parse bank statement files, deduplicate against existing transactions by date+amount+description hash
- [ ] Per-user rate limiting — token bucket in-process (or Redis), keyed by user ID, separate limits for read vs write routes
- [ ] Soft delete for transactions — `deleted_at` column + filtered queries; allows undo without data loss
- [ ] Pagination on all list endpoints — cursor-based (keyset) rather than offset for large datasets
- [ ] `GET /analytics/trends` — month-over-month delta per category, moving average

## Web

- [ ] Offline support — cache API responses in service worker (`workbox`); queue mutations and replay on reconnect
- [ ] Mobile layout — bottom nav bar, touch-friendly transaction form, swipe-to-delete
- [ ] Dark mode — CSS variables already partial; wire to `prefers-color-scheme` + manual toggle persisted in localStorage
- [ ] Empty states — zero-data screens for budgets, goals, transactions with actionable CTAs
- [ ] Transaction bulk actions — multi-select + batch delete/categorize
- [ ] Keyboard shortcuts — `n` new transaction, `b` budgets, `ESC` close modal

## Database

- [ ] Transaction archival — move rows older than N months to `transactions_archive` (same schema); exclude from default queries via view
- [ ] Read replica config — `DATABASE_READONLY_URL` env var; route `GET` handlers to replica in `config` package
- [ ] Index audit — run `pg_stat_user_indexes` in production and drop unused indexes

## Infrastructure

- [ ] PostgreSQL backup — daily `pg_dump` to MinIO via cron on the VPS; retain last 30 days; alert on failure
- [ ] External health check — expose `GET /healthz` (already exists); register with an uptime monitor (e.g. UptimeRobot)
- [ ] Log aggregation — ship container logs to a central store (Loki or similar) for querying across restarts
- [ ] Resource limits on compose services — set `mem_limit` and `cpus` on backend and web containers in production compose
