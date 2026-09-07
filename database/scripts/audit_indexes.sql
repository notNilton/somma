-- ==============================================================================
-- Index Audit Script for Somma Production Database
-- Inspects table index usage, scans, cache hits and identifies unused indexes
-- Run against production PostgreSQL:
-- psql "$DATABASE_URL" -f database/scripts/audit_indexes.sql
-- ==============================================================================

-- 1. Index scan counts and table sizes (detects zero or low scan indexes)
SELECT
    schemaname,
    relname AS table_name,
    indexrelname AS index_name,
    idx_scan AS index_scans_count,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    pg_size_pretty(pg_relation_size(relid)) AS table_size
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;

-- 2. Candidates for dropping (non-primary key, non-unique indexes with 0 scans)
SELECT
    'DROP INDEX CONCURRENTLY IF EXISTS ' || quote_ident(schemaname) || '.' || quote_ident(indexrelname) || ';' AS drop_statement,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) AS wasted_size
FROM pg_stat_user_indexes
JOIN pg_index USING (indexrelid)
WHERE idx_scan = 0
  AND indisunique = FALSE
  AND indisprimary = FALSE
ORDER BY pg_relation_size(indexrelid) DESC;

-- 3. Cache hit ratio by table & index
SELECT
    relname AS table_name,
    heap_blks_read,
    heap_blks_hit,
    ROUND((heap_blks_hit::numeric / NULLIF(heap_blks_hit + heap_blks_read, 0)) * 100, 2) AS heap_hit_ratio_pct,
    idx_blks_read,
    idx_blks_hit,
    ROUND((idx_blks_hit::numeric / NULLIF(idx_blks_hit + idx_blks_read, 0)) * 100, 2) AS index_hit_ratio_pct
FROM pg_statio_user_tables
ORDER BY (heap_blks_hit + heap_blks_read) DESC;
