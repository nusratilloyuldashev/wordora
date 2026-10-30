-- WORDORA 3.0: ADDITIVE MIGRATION. Run ONCE in the existing Wordora Supabase project.
-- This file does NOT drop tables, remove users, erase progress, or reset reviews.
-- Safe to re-run; existing custom classifications are preserved.
-- Never run it on the wrong Supabase project.
begin;
alter table public.words add column if not exists topic text not null default 'other';
alter table public.words add column if not exists word_type text not null default 'other';

-- Keep the existing category constraint: personal words still have category='mine'.
-- The new topic is independent of who owns the word.
update public.words set topic=category
 where owner_id is null and topic='other';
-- Improve a few clearly identifiable topic assignments for existing starter words.
update public.words set topic='clothes' where owner_id is null and en='clothes' and topic in ('daily','other');
update public.words set topic='weather' where owner_id is null and en in ('weather','rain','wind','sunshine') and topic in ('nature','other');
update public.words set topic='home' where owner_id is null and en in ('home','window') and topic in ('daily','other');

-- Curate known starter words; no unreliable automated part-of-speech guessing.
update public.words set word_type='verb'
 where owner_id is null and category='verbs' and word_type='other';
update public.words set word_type='verb'
 where owner_id is null and en in ('arrive','depart','download','upload') and word_type='other';
update public.words set word_type='adjective'
 where owner_id is null and en in ('hungry','delicious','happy','sad','excited','nervous','calm','proud','worried','surprised','grateful','confident') and word_type='other';
update public.words set word_type='adverb'
 where owner_id is null and en in ('today','tomorrow') and word_type='other';
update public.words set word_type='noun'
 where owner_id is null and word_type='other' and en in (
 'morning','evening','neighbor','family','friend','home','window','clothes','money','time',
 'breakfast','lunch','dinner','bread','vegetable','fruit','water','recipe','ticket','airport',
 'journey','passport','luggage','destination','map','hotel','lesson','homework','question',
 'answer','mistake','knowledge','skill','meeting','project','goal','progress','result',
 'forest','river','mountain','flower','sunshine','rain','wind','weather','earth',
 'environment','computer','keyboard','screen','website','password','network','device','software');

-- Allowed values are deliberately explicit: prevents unexpected values and unsafe filters.
do $$ begin
 if not exists (select 1 from pg_constraint where conname='wordora_topic_valid' and conrelid='public.words'::regclass) then
  alter table public.words add constraint wordora_topic_valid check (
    topic in ('daily','clothes','weather','home','food','travel','transport','technology',
              'study','health','shopping','sports','nature','feelings','verbs','other'));
 end if;
 if not exists (select 1 from pg_constraint where conname='wordora_word_type_valid' and conrelid='public.words'::regclass) then
  alter table public.words add constraint wordora_word_type_valid check (
    word_type in ('noun','verb','adjective','adverb','modal','pronoun','preposition',
                  'conjunction','number','phrase','other'));
 end if;
end $$;

create index if not exists wordora_words_topic_type on public.words(topic,word_type);
-- Read access remains protected by the existing wordora_read_visible_words RLS policy.
-- Only permit updating classification columns; deny updates to built-in dictionary rows.
grant update (topic,word_type) on public.words to authenticated;
drop policy if exists wordora_update_personal_tags on public.words;
create policy wordora_update_personal_tags on public.words
 for update to authenticated
 using (owner_id=(select auth.uid()) and category='mine')
 with check (owner_id=(select auth.uid()) and category='mine');
commit;

-- After success: reload https://wordora-english.netlify.app with Ctrl+Shift+R.
-- Personal vocabulary and review history are unchanged.