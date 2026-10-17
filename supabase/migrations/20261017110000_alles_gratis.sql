-- Betaalde versie verwijderd (WEEK-54): alle functies zijn gratis.
-- De AI-limiet blijft 1 aanvraag per gezin per dag, de basis waarop reclame later extra tegoed kan geven.
create or replace function public.ai_daglimiet()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select 1;
$$;

-- Het abonnement bestaat niet meer: de tabel (en haar leesbeleid) gaat weg.
drop table if exists public.gezin_abonnement cascade;
