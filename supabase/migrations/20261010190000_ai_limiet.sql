-- Limiet op de AI-planner (WEEK-31): elk aangemeld toestel mag de server-functie plan-week
-- hoogstens 30 keer per 24 uur gebruiken, tegen misbruik en onverwachte kosten.
create table public.ai_gebruik (
  gebruiker_id uuid not null references auth.users (id) on delete cascade,
  op timestamptz not null default now()
);
create index ai_gebruik_gebruiker on public.ai_gebruik (gebruiker_id, op);
alter table public.ai_gebruik enable row level security;
-- geen policies: enkel ai_toegestaan() mag deze tabel gebruiken
revoke all on public.ai_gebruik from anon, authenticated;

-- Registreert een aanvraag en zegt of ze mag (true) of de limiet bereikt is (false).
create function public.ai_toegestaan()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  if (select count(*) from public.ai_gebruik
      where gebruiker_id = auth.uid() and op > now() - interval '24 hours') >= 30 then
    return false;
  end if;
  insert into public.ai_gebruik (gebruiker_id) values (auth.uid());
  return true;
end;
$$;

revoke all on function public.ai_toegestaan() from public, anon;
grant execute on function public.ai_toegestaan() to authenticated;
