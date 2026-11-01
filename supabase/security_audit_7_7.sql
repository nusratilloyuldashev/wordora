-- WORDORA 7.7: READ-ONLY Supabase security audit.
-- Run in the CURRENT project's SQL Editor. Does not create/alter/delete any data.
-- Inspect every row. A passing report is NOT a substitute for two-user live RLS tests.
-- 1. Table RLS and grants.
with expected(table_name) as (
 values ('words'),('progress'),('reviews'),('word_learning'),
        ('word_collections'),('word_collection_items'),
        ('wordora_review_requests'),('wordora_exam_requests')
)
select e.table_name,
       (c.oid is not null) as table_exists,
       coalesce(c.relrowsecurity,false) as rls_enabled,
       coalesce(has_table_privilege('anon',c.oid,'SELECT'),false) as anon_can_select,
       coalesce(has_table_privilege('anon',c.oid,'INSERT'),false) as anon_can_insert,
       coalesce(has_table_privilege('anon',c.oid,'UPDATE'),false) as anon_can_update,
       coalesce(has_table_privilege('anon',c.oid,'DELETE'),false) as anon_can_delete,
       coalesce(has_table_privilege('authenticated',c.oid,'SELECT'),false) as signed_in_can_select,
       coalesce(has_table_privilege('authenticated',c.oid,'INSERT'),false) as signed_in_can_insert,
       coalesce(has_table_privilege('authenticated',c.oid,'UPDATE'),false) as signed_in_can_update,
       (select count(*) from pg_catalog.pg_policies p
        where p.schemaname='public' and p.tablename=e.table_name) as policy_count
from expected e
left join pg_catalog.pg_class c
  on c.oid=pg_catalog.to_regclass('public.'||e.table_name)
order by e.table_name;

-- 2. Review actual RLS expressions, especially owner/user_id checks.
select tablename,policyname,cmd,roles,qual,with_check
from pg_catalog.pg_policies
where schemaname='public'
  and tablename in ('words','progress','reviews','word_learning',
                    'word_collections','word_collection_items',
                    'wordora_review_requests','wordora_exam_requests')
order by tablename,policyname;

-- 3. Privileged RPCs must be unavailable to anon, and SECURITY DEFINER
-- functions must have a fixed search_path.
select p.proname as function_name,
       pg_catalog.pg_get_function_identity_arguments(p.oid) as args,
       p.prosecdef as security_definer,
       p.proconfig as function_settings,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as signed_in_can_execute
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('wordora_review','wordora_review_v2',
                    'wordora_save_exam_v74','wordora_stats','wordora_session',
                    'wordora_word_limit')
order by p.proname;

-- 4. Existing DB-level 90% mastery constraint must be present and validated.
select c.conname,c.convalidated,pg_catalog.pg_get_constraintdef(c.oid) as definition
from pg_catalog.pg_constraint c
where c.conrelid=pg_catalog.to_regclass('public.word_learning')
  and c.conname='wordora_test_mastery_gate';

-- NOTE: authenticated INSERT/UPDATE permissions on word_learning are currently
-- used by legacy clients. They are a separate hardening follow-up; the current
-- client-side test score is not cryptographically trustworthy.
