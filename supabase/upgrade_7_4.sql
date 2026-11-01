-- Wordora 7.4: atomic exam save with optimistic conflict protection.
-- Apply AFTER upgrade_7_3.sql. Additive and non-destructive.
-- The server derives the user from auth.uid(); no user id is trusted from client JSON.
begin;

create table if not exists public.wordora_exam_requests (
 user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null,
 payload jsonb not null,
 result jsonb,
 created_at timestamptz not null default now(),
 primary key (user_id,request_id)
);
alter table public.wordora_exam_requests enable row level security;
revoke all on public.wordora_exam_requests from public,anon,authenticated;

create or replace function public.wordora_save_exam_v74(
 p_request_id uuid, p_items jsonb
) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare
 v_user uuid := auth.uid();
 v_claimed boolean;
 v_old public.wordora_exam_requests%rowtype;
 v_record record;
 v_learning public.word_learning%rowtype;
 v_conflicts bigint[] := array[]::bigint[];
 v_total integer;
 v_unique integer;
 v_result jsonb;
begin
 if v_user is null then
   raise exception 'Kirish talab qilinadi' using errcode='42501';
 end if;
 if p_request_id is null then
   raise exception 'Test identifikatori talab qilinadi' using errcode='22023';
 end if;
 if p_items is null or jsonb_typeof(p_items)<>'array'
    or jsonb_array_length(p_items) not between 1 and 60 then
   raise exception 'Testda 1–60 ta so‘z bo‘lishi kerak' using errcode='22023';
 end if;
 select count(*),count(distinct x.word_id)
 into v_total,v_unique
 from jsonb_to_recordset(p_items) as x(word_id bigint);
 if v_total<>v_unique then
   raise exception 'Testda takrorlangan yoki noto‘g‘ri so‘z identifikatori'
     using errcode='22023';
 end if;

 -- Block simultaneous retries with the same UUID until the first transaction
 -- finishes. The entire exam is committed or rejected atomically.
 insert into public.wordora_exam_requests(user_id,request_id,payload)
 values (v_user,p_request_id,p_items)
 on conflict (user_id,request_id) do nothing
 returning true into v_claimed;
 if coalesce(v_claimed,false) is false then
   select * into v_old from public.wordora_exam_requests
     where user_id=v_user and request_id=p_request_id;
   if not found or v_old.result is null then
     raise exception 'Test hozir saqlanmoqda, yana urinib ko‘ring' using errcode='40001';
   end if;
   if v_old.payload<>p_items then
     raise exception 'Test identifikatori boshqa natija uchun ishlatilgan'
       using errcode='22023';
   end if;
   return v_old.result || jsonb_build_object('deduplicated',true);
 end if;

 -- Lock all target rows in stable order to prevent interleaved exams.
 for v_record in
   select * from jsonb_to_recordset(p_items) as x(
      word_id bigint,stage text,next_review_on date,
      review_interval integer,last_test_score integer,
      tested_at timestamptz,expected_tested_at timestamptz
   ) order by word_id
 loop
   if v_record.word_id is null
      or v_record.stage is null
      or v_record.stage not in ('learning','mastered')
      or v_record.last_test_score is null or v_record.last_test_score not between 0 and 100
      or (v_record.stage='mastered' and v_record.last_test_score<90)
      or v_record.review_interval is null or v_record.review_interval not between 0 and 3650
      or v_record.next_review_on is null or v_record.tested_at is null then
     raise exception 'Test natijasi noto‘g‘ri' using errcode='22023';
   end if;
   select * into v_learning from public.word_learning
     where user_id=v_user and word_id=v_record.word_id for update;
   if not found then
     raise exception 'So‘z avval yodlash bosqichidan o‘tmagan' using errcode='42501';
   end if;
   if v_learning.tested_at is distinct from v_record.expected_tested_at then
     v_conflicts:=array_append(v_conflicts,v_record.word_id);
   end if;
 end loop;
 if cardinality(v_conflicts)>0 then
   v_result:=jsonb_build_object('ok',false,'conflict',true,'word_ids',to_jsonb(v_conflicts));
 else
   for v_record in
     select * from jsonb_to_recordset(p_items) as x(
       word_id bigint,stage text,next_review_on date,
       review_interval integer,last_test_score integer,
       tested_at timestamptz,expected_tested_at timestamptz
     ) order by word_id
   loop
     update public.word_learning set
       stage=v_record.stage,
       next_review_on=v_record.next_review_on,
       review_interval=v_record.review_interval,
       last_test_score=v_record.last_test_score,
       tested_at=v_record.tested_at,
       updated_at=clock_timestamp()
     where user_id=v_user and word_id=v_record.word_id;
   end loop;
   v_result:=jsonb_build_object('ok',true,'saved',v_total,'conflict',false);
 end if;
 update public.wordora_exam_requests set result=v_result
   where user_id=v_user and request_id=p_request_id;
 return v_result||jsonb_build_object('deduplicated',false);
end;
$$;

revoke all on function public.wordora_save_exam_v74(uuid,jsonb)
  from public,anon,authenticated;
grant execute on function public.wordora_save_exam_v74(uuid,jsonb)
  to authenticated;
commit;
notify pgrst, 'reload schema';

-- Old direct word_learning writes remain available for previous clients.
-- New 7.4 clients use this RPC, which protects against stale TEST results
-- from other devices via the expected_tested_at compare-and-swap condition.
