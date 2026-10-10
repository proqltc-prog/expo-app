-- Daglimiet AI-planner volgens abonnement (WEEK-31):
-- gratis 5 AI-aanvragen per 24 uur per toestel, betalend 30.
-- Betalend = het toestel hoort bij een gezin met een lopend abonnement.
-- Abonnementen worden enkel door de beheerder (service role / dashboard) ingesteld, nooit vanuit de app.
create table public.gezin_abonnement (
  gezin_id uuid primary key references public.gezinnen (id) on delete cascade,
  betalend_tot timestamptz not null
);
alter table public.gezin_abonnement enable row level security;
revoke all on public.gezin_abonnement from anon, authenticated;
grant select on public.gezin_abonnement to authenticated;
-- leden mogen het abonnement van hun eigen gezin lezen (om het later in de app te tonen)
create policy "leden lezen abonnement" on public.gezin_abonnement
  for select to authenticated using (public.is_lid(gezin_id));

-- Limiet van dit toestel: 30 als betalend, anders 5.
create function public.ai_daglimiet()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when exists (
    select 1 from public.gezinsleden l
    join public.gezin_abonnement a on a.gezin_id = l.gezin_id
    where l.gebruiker_id = auth.uid() and a.betalend_tot > now()
  ) then 30 else 5 end;
$$;
revoke all on function public.ai_daglimiet() from public, anon;
grant execute on function public.ai_daglimiet() to authenticated;

-- Registreert een aanvraag en zegt of ze mag (true) of de limiet bereikt is (false).
create or replace function public.ai_toegestaan()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  -- gelijktijdige aanvragen van hetzelfde toestel na elkaar tellen
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
  if (select count(*) from public.ai_gebruik
      where gebruiker_id = auth.uid() and op > now() - interval '24 hours') >= public.ai_daglimiet() then
    return false;
  end if;
  insert into public.ai_gebruik (gebruiker_id) values (auth.uid());
  return true;
end;
$$;
revoke all on function public.ai_toegestaan() from public, anon;
grant execute on function public.ai_toegestaan() to authenticated;
