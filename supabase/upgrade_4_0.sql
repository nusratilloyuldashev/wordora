-- WORDORA 4.0 — SAFE, ADDITIVE DATABASE UPGRADE.
-- Run only in the existing Wordora project, AFTER upgrade_3_0.sql.
-- Does NOT delete words, progress, reviews, users, or previously saved tags.
-- The new records track introductions and test-based mastery separately from practice counts.
begin;
create table if not exists public.word_learning (
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id bigint not null references public.words(id) on delete cascade,
  stage text not null default 'learning' check (stage in ('learning','mastered')),
  introduced_on date not null default (now() at time zone 'Asia/Tashkent')::date,
  introduced_at timestamptz not null default now(),
  next_review_on date not null default (now() at time zone 'Asia/Tashkent')::date,
  review_interval integer not null default 0 check (review_interval between 0 and 3650),
  last_test_score integer check (last_test_score between 0 and 100),
  tested_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(user_id,word_id),
  constraint wordora_test_mastery_gate check (stage <> 'mastered' or (last_test_score >= 90 and tested_at is not null))
);
create index if not exists wordora_learning_due on public.word_learning(user_id,next_review_on);
create index if not exists wordora_learning_date on public.word_learning(user_id,introduced_on);
alter table public.word_learning enable row level security;
revoke all on public.word_learning from public, anon, authenticated;
grant select, insert, update on public.word_learning to authenticated;
drop policy if exists wordora_learning_select on public.word_learning;
create policy wordora_learning_select on public.word_learning for select to authenticated
using (user_id=(select auth.uid()));
drop policy if exists wordora_learning_insert on public.word_learning;
create policy wordora_learning_insert on public.word_learning for insert to authenticated
with check (user_id=(select auth.uid()) and exists (
  select 1 from public.words w where w.id=word_id
    and (w.owner_id is null or w.owner_id=(select auth.uid()))
));
drop policy if exists wordora_learning_update on public.word_learning;
create policy wordora_learning_update on public.word_learning for update to authenticated
using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()) and exists (
  select 1 from public.words w where w.id=word_id
    and (w.owner_id is null or w.owner_id=(select auth.uid()))
));
-- Preserve older active learning: progress data means the learner already met the word.
-- last_reviewed is the oldest available date field in the old schema; true first
-- introduction dates were not recorded in Wordora 2.x/3.x.
-- Never infer mastery solely from older progress/repetition counts.
insert into public.word_learning(user_id,word_id,stage,introduced_on,next_review_on,review_interval)
select p.user_id,p.word_id,'learning',coalesce(p.last_reviewed,(now() at time zone 'Asia/Tashkent')::date),
       coalesce(p.due_on,(now() at time zone 'Asia/Tashkent')::date),
       least(3650,greatest(0,p.interval_days))
from public.progress p
on conflict (user_id,word_id) do nothing;
commit;
notify pgrst, 'reload schema';
-- Expected result: Success. No rows returned.
-- Auth, words, previous practice scores and categories are retained.