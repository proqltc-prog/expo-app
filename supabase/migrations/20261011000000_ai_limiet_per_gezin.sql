-- AI-limiet per gezin en per kalenderdag (WEEK-33):
-- gratis 1 AI-aanvraag per dag per gezin, betalend 3. Een toestel zonder gezin telt als een gezin van één.
-- "Per dag" = kalenderdag in Belgische tijd, zodat "morgen kan het opnieuw" klopt.
alter table public.ai_gebruik add column gezin_id uuid references public.gezinnen (id) on delete set null;
create index ai_gebruik_gezin on public.ai_gebruik (gezin_id, op);

-- Gezin van dit toestel (null als het bij geen gezin hoort).
create function public.mijn_gezin()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select gezin_id from public.gezinsleden where gebruiker_id = auth.uid();
$$;
revoke all on function public.mijn_gezin() from public, anon;
grant execute on function public.mijn_gezin() to authenticated;

-- Begin van vandaag in Belgische tijd.
create function public.begin_van_vandaag()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select (date_trunc('day', now() at time zone 'Europe/Brussels')) at time zone 'Europe/Brussels';
$$;

create or replace function public.ai_daglimiet()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when exists (
    select 1 from public.gezin_abonnement a
    where a.gezin_id = public.mijn_gezin() and a.betalend_tot > now()
  ) then 3 else 1 end;
$$;

-- Aantal AI-aanvragen vandaag voor het gezin van dit toestel (of voor dit toestel alleen).
create function public.ai_gebruikt_vandaag()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.ai_gebruik g
  where g.op >= public.begin_van_vandaag()
    and case when public.mijn_gezin() is null
             then g.gebruiker_id = auth.uid() and g.gezin_id is null
             else g.gezin_id = public.mijn_gezin() end;
$$;
revoke all on function public.ai_gebruikt_vandaag() from public, anon;

-- Voor de app: limiet en wat er vandaag al gebruikt is (registreert niets).
create function public.ai_tegoed()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object('limiet', public.ai_daglimiet(), 'gebruikt', public.ai_gebruikt_vandaag());
$$;
revoke all on function public.ai_tegoed() from public, anon;
grant execute on function public.ai_tegoed() to authenticated;

-- Registreert een aanvraag en zegt of ze mag (true) of de limiet bereikt is (false).
create or replace function public.ai_toegestaan()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare g uuid;
begin
  if auth.uid() is null then
    return false;
  end if;
  g := public.mijn_gezin();
  -- gelijktijdige aanvragen van hetzelfde gezin na elkaar tellen
  perform pg_advisory_xact_lock(hashtext(coalesce(g, auth.uid())::text));
  if public.ai_gebruikt_vandaag() >= public.ai_daglimiet() then
    return false;
  end if;
  insert into public.ai_gebruik (gebruiker_id, gezin_id) values (auth.uid(), g);
  return true;
end;
$$;
revoke all on function public.ai_toegestaan() from public, anon;
grant execute on function public.ai_toegestaan() to authenticated;
