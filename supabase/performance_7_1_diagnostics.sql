-- WORDORA 7.1: Supabase Performance Diagnostics (READ-ONLY)
-- Supabase Dashboard > SQL Editor > New query > Run
-- This file only SELECTs database metadata and PostgreSQL statistics.
-- No DDL, UPDATE, DELETE, INSERT, GRANT, or policy changes.
--
-- IMPORTANT: PostgreSQL statistics are cumulative and approximate; seq scans on
-- small tables do not necessarily mean a missing index. Use actual load metrics
-- and EXPLAIN (ANALYZE, BUFFERS) in a test database before adding indexes.

-- 1. Table size, estimated live rows and query scan activity
select
  s.relname as table_name,
  s.n_live_tup as estimated_rows,
  s.seq_scan as sequential_scans,
  s.idx_scan as index_scans,
  s.seq_tup_read as sequential_rows_read,
  pg_size_pretty(pg_total_relation_size(s.relid)) as total_size
from pg_stat_user_tables s
where s.schemaname = 'public'
  and s.relname in (
    'words', 'progress', 'reviews', 'word_learning',
    'word_collections', 'word_collection_items'
  )
order by pg_total_relation_size(s.relid) desc, s.relname;

-- 2. All indexes currently installed for Wordora's main tables
select
  tablename as table_name,
  indexname as index_name,
  indexdef as definition
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'words', 'progress', 'reviews', 'word_learning',
    'word_collections', 'word_collection_items'
  )
order by tablename, indexname;

-- 3. Index usage counts (cumulative, reset after server/collector reset)
select
  s.relname as table_name,
  s.indexrelname as index_name,
  s.idx_scan as index_scans,
  s.idx_tup_read as index_rows_read,
  s.idx_tup_fetch as rows_fetched
from pg_stat_user_indexes s
where s.schemaname = 'public'
  and s.relname in (
    'words', 'progress', 'reviews', 'word_learning',
    'word_collections', 'word_collection_items'
  )
order by s.relname, s.idx_scan desc, s.indexrelname;

-- 4. Optional only: check availability of PostgreSQL query statistics.
-- If pg_stat_statements is available, investigate slow RPC/query patterns
-- in Supabase Database Reports / Query Performance and validate with plans.
select extname as installed_extension
from pg_extension
where extname = 'pg_stat_statements';
