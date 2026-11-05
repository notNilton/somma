-- name: ListRecurringFollowing :many
-- Ocorrências da série a partir de @from_date, menos a que está sendo editada.
SELECT id, date
FROM transactions
WHERE user_id = @user_id
  AND is_active = TRUE
  AND deleted_at IS NULL
  AND (id = @series_id OR recurring_origin_id = @series_id)
  AND date >= @from_date
  AND id <> @id
ORDER BY date ASC
FOR UPDATE;
