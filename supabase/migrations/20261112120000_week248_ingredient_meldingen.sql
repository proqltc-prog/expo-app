-- WEEK-248: onbekende ingrediënten die een gebruiker bij het inlezen van een recept overslaat, anoniem melden.
-- Eén rij per naam en taal met een teller (geen dubbels, geen clutter). Geen gebruiker in de meldingen;
-- de aparte dagteller per gebruiker dient enkel voor de limiet en wordt na 7 dagen opgeruimd.
-- Enkel toevoegingen. Terugdraaien:
--   drop view public.ingredient_meldingen_per_taal; drop view public.ingredient_meldingen_overzicht;
--   drop view public.ingredient_vertalingen_ontbrekend;
--   drop function public.famenu_meld_ingredient(text, text);
--   drop table public.ingredient_melding_gebruik; drop table public.ingredient_meldingen;

create table public.ingredient_meldingen (
  id bigint generated always as identity primary key,
  naam text not null,
  taal text not null check (taal in ('nl', 'fr', 'de', 'en')),
  aantal int not null default 1,
  eerst_gemeld timestamptz not null default now(),
  laatst_gemeld timestamptz not null default now(),
  -- De eigenaar zet 'goedgekeurd' of 'afgewezen'; 'toegevoegd' zodra het ingrediënt in de lijst staat.
  status text not null default 'nieuw' check (status in ('nieuw', 'goedgekeurd', 'afgewezen', 'toegevoegd')),
  -- De code in public.ingredienten, zodra het ingrediënt toegevoegd is (of een bestaand ingrediënt bleek).
  ingredient_code text,
  unique (naam, taal)
);
alter table public.ingredient_meldingen enable row level security;

create table public.ingredient_melding_gebruik (
  gebruiker uuid not null,
  dag date not null default current_date,
  aantal int not null default 0,
  primary key (gebruiker, dag)
);
alter table public.ingredient_melding_gebruik enable row level security;
-- RLS aan zonder beleid op beide tabellen: niemand leest of schrijft rechtstreeks, enkel via de functie hieronder.

-- Meldt één onbekend ingrediënt. Limieten: 30 per gebruiker per dag, 2000 per dag in totaal,
-- en hoogstens 5000 verschillende namen (daarna tellen enkel bestaande namen nog mee).
create function public.famenu_meld_ingredient(p_naam text, p_taal text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  n int;
  totaal int;
  v_naam text := lower(btrim(regexp_replace(coalesce(p_naam, ''), '\s+', ' ', 'g')));
begin
  if auth.uid() is null then return false; end if;
  if p_taal not in ('nl', 'fr', 'de', 'en') then return false; end if;
  if v_naam !~ '^[[:alpha:]][[:alpha:] ''-]{1,59}$' then return false; end if;
  delete from public.ingredient_melding_gebruik where dag < current_date - 7;
  select coalesce(sum(aantal), 0) into totaal from public.ingredient_melding_gebruik where dag = current_date;
  if totaal >= 2000 then return false; end if;
  insert into public.ingredient_melding_gebruik as g (gebruiker, dag, aantal) values (auth.uid(), current_date, 1)
  on conflict (gebruiker, dag) do update set aantal = g.aantal + 1
  returning aantal into n;
  if n > 30 then return false; end if;
  update public.ingredient_meldingen set aantal = aantal + 1, laatst_gemeld = now()
  where naam = v_naam and taal = p_taal;
  if found then return true; end if;
  if (select count(*) from public.ingredient_meldingen) >= 5000 then return false; end if;
  insert into public.ingredient_meldingen (naam, taal) values (v_naam, p_taal)
  on conflict (naam, taal) do update set aantal = public.ingredient_meldingen.aantal + 1, laatst_gemeld = now();
  return true;
end
$$;
revoke all on function public.famenu_meld_ingredient(text, text) from public, anon;
grant execute on function public.famenu_meld_ingredient(text, text) to authenticated;

-- Overzicht voor de eigenaar (SQL-editor of Table Editor in Supabase): per gemelde naam hoe vaak, in welke taal,
-- de status en welke talen nog ontbreken. Zolang een melding niet toegevoegd is, ontbreken de drie andere talen;
-- daarna de talen die het ingrediënt in ingredient_vertalingen nog mist.
create view public.ingredient_meldingen_overzicht with (security_invoker = true) as
select
  m.naam,
  m.taal,
  m.aantal,
  m.status,
  m.ingredient_code,
  array(
    select t from unnest(array['nl', 'fr', 'de', 'en']) as t
    where case
      when i.id is null then t <> m.taal
      else not exists (select 1 from public.ingredient_vertalingen v where v.ingredient_id = i.id and v.taal = t)
    end
  ) as ontbrekende_talen,
  m.eerst_gemeld,
  m.laatst_gemeld
from public.ingredient_meldingen m
left join public.ingredienten i on i.code = m.ingredient_code
order by m.status = 'nieuw' desc, m.aantal desc, m.naam;

-- Samenvatting per taal: hoeveel verschillende namen en meldingen, en hoeveel per status.
create view public.ingredient_meldingen_per_taal with (security_invoker = true) as
select
  taal,
  count(*) as namen,
  sum(aantal) as meldingen,
  count(*) filter (where status = 'nieuw') as nieuw,
  count(*) filter (where status = 'goedgekeurd') as goedgekeurd,
  count(*) filter (where status = 'afgewezen') as afgewezen,
  count(*) filter (where status = 'toegevoegd') as toegevoegd
from public.ingredient_meldingen
group by taal
order by taal;

-- Ingrediënten in de lijst die nog een vertaling missen (die slaat `npm run ingredienten` over).
create view public.ingredient_vertalingen_ontbrekend with (security_invoker = true) as
select i.code, array_agg(t order by t) as ontbrekende_talen
from public.ingredienten i
cross join unnest(array['nl', 'fr', 'de', 'en']) as t
where not exists (select 1 from public.ingredient_vertalingen v where v.ingredient_id = i.id and v.taal = t)
group by i.code
order by i.code;

-- De overzichten zijn enkel voor de eigenaar, niet voor de app.
revoke all on public.ingredient_meldingen_overzicht, public.ingredient_meldingen_per_taal,
  public.ingredient_vertalingen_ontbrekend from anon, authenticated;
