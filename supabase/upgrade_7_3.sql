-- WORDORA 7.3 — IDEMPOTENT REVIEW RPC (ADDITIVE, NON-DESTRUCTIVE).
-- Apply ONCE in existing Wordora Supabase SQL Editor AFTER setup.sql.
-- Never rerun setup.sql just to install this upgrade.
-- Existing words, reviews, progress, learning, collections and auth users are not modified.
-- A stable request id guarantees ONE review write across retries/duplicate calls.
begin;

create table if not exists public.wordora_review_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  word_id bigint not null references public.words(id) on delete cascade,
  mode text not null check (mode in ('cards','choice','write','listen')),
  quality integer not null check (quality between 0 and 5),
  result jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id,request_id)
);

alter table public.wordora_review_requests enable row level security;
-- Clients never read/write idempotency records directly. Only the SECURITY DEFINER RPC can.
revoke all on public.wordora_review_requests from public,anon,authenticated;

create or replace function public.wordora_review_v2(
  p_word_id bigint,
  p_mode text,
  p_quality integer,
  p_request_id uuid
) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_claimed boolean;
  v_old public.wordora_review_requests%rowtype;
  v_result jsonb;
begin
  if v_user is null then
    raise exception 'Kirish talab qilinadi' using errcode='42501';
  end if;
  if p_request_id is null then
    raise exception 'Mashq identifikatori talab qilinadi' using errcode='22023';
  end if;
  if p_word_id is null or p_mode is null
     or p_mode not in ('cards','choice','write','listen')
     or p_quality is null or p_quality not between 0 and 5 then
    raise exception 'Mashq natijasi noto‘g‘ri' using errcode='22023';
  end if;

  -- An identical pending request blocks on the unique index until the original
  -- transaction commits or rolls back. Exactly one caller owns the new key.
  insert into public.wordora_review_requests(user_id,request_id,word_id,mode,quality)
  values (v_user,p_request_id,p_word_id,p_mode,p_quality)
  on conflict (user_id,request_id) do nothing
  returning true into v_claimed;

  if coalesce(v_claimed,false) is false then
    select * into v_old
      from public.wordora_review_requests r
      where r.user_id=v_user and r.request_id=p_request_id;
    if not found or v_old.result is null then
      raise exception 'Mashq natijasi hali tayyor emas; qayta urinib ko‘ring' using errcode='40001';
    end if;
    if v_old.word_id<>p_word_id or v_old.mode<>p_mode or v_old.quality<>p_quality then
      raise exception 'Mashq identifikatori boshqa natija uchun ishlatilgan'
        using errcode='22023';
    end if;
    return v_old.result || jsonb_build_object('deduplicated',true);
  end if;

  -- Reuse the existing authoritative review algorithm and atomic SQL transaction.
  v_result := public.wordora_review(p_word_id,p_mode,p_quality);
  update public.wordora_review_requests
    set result=v_result
    where user_id=v_user and request_id=p_request_id;
  return v_result || jsonb_build_object('deduplicated',false);
end;
$$;

revoke all on function public.wordora_review_v2(bigint,text,integer,uuid)
  from public,anon,authenticated;
grant execute on function public.wordora_review_v2(bigint,text,integer,uuid)
  to authenticated;
commit;
notify pgrst, 'reload schema';

-- Only new v2 clients with stable request_id are exactly-once.
-- Legacy wordora_review() remains available for older versions until rollout completes.
-- A repeat with the same id+same payload returns the stored result.
-- Same id with a different payload fails and cannot change the progress.
