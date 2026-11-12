-- WEEK-254: onbekende ingrediënten automatisch koppelen of toevoegen (Supabase-functie ingredient-koppel, Gemini).
-- Afspraken eigenaar: Gemini vult ook de allergenen in, de eigenaar kijkt achteraf na.
-- Limieten: 20 opzoekingen per gebruiker per dag, 300 voor iedereen samen, hoogstens 50 nieuwe ingrediënten per dag.
-- Enkel toevoegingen. Terugdraaien:
--   drop view public.ingredienten_na_te_kijken;
--   drop function public.famenu_voeg_ingredient_toe(text, text, text, text, text[], numeric, numeric, numeric, jsonb);
--   drop function public.famenu_ingredient_koppel_tel(); drop table public.ingredient_koppel_gebruik;
--   alter table public.ingredienten drop column herkomst, drop column nagekeken, drop column toegevoegd_op;
--   en de Supabase-functie ingredient-koppel verwijderen in het dashboard.

-- Herkomst: 'beheer' (door de eigenaar of een receptenbatch) of 'ai' (automatisch, WEEK-254).
alter table public.ingredienten
  add column herkomst text not null default 'beheer' check (herkomst in ('beheer', 'ai')),
  add column nagekeken boolean not null default true,
  add column toegevoegd_op timestamptz not null default now();

-- Dagteller per gebruiker voor het opzoeken (RLS aan zonder beleid: enkel de functie hieronder).
create table public.ingredient_koppel_gebruik (
  gebruiker uuid not null,
  dag date not null default current_date,
  aantal int not null default 0,
  primary key (gebruiker, dag)
);
alter table public.ingredient_koppel_gebruik enable row level security;

create function public.famenu_ingredient_koppel_tel() returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  n int;
  totaal int;
begin
  if auth.uid() is null then return false; end if;
  delete from public.ingredient_koppel_gebruik where dag < current_date - 7;
  select coalesce(sum(aantal), 0) into totaal from public.ingredient_koppel_gebruik where dag = current_date;
  if totaal >= 300 then return false; end if;
  insert into public.ingredient_koppel_gebruik as g (gebruiker, dag, aantal) values (auth.uid(), current_date, 1)
  on conflict (gebruiker, dag) do update set aantal = g.aantal + 1
  returning aantal into n;
  return n <= 20;
end
$$;
revoke all on function public.famenu_ingredient_koppel_tel() from public, anon;
grant execute on function public.famenu_ingredient_koppel_tel() to authenticated;

-- Voegt één ingrediënt toe (enkel de Supabase-functie, met de service-rol). Bestaat de code of een van de namen al
-- (zonder hoofdletters), dan wordt de bestaande code teruggegeven en niets toegevoegd: geen dubbels.
-- Hoogstens 50 nieuwe automatische ingrediënten per dag; daarna null.
create function public.famenu_voeg_ingredient_toe(
  p_code text, p_categorie text, p_eenheid text, p_soort text, p_allergenen text[],
  p_kcal numeric, p_eiwit numeric, p_vezels numeric, p_namen jsonb
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  bestaand text;
  nieuw_id bigint;
  t text;
begin
  select code into bestaand from public.ingredienten where code = p_code;
  if bestaand is not null then return bestaand; end if;
  select i.code into bestaand
  from public.ingredient_vertalingen v join public.ingredienten i on i.id = v.ingredient_id
  where lower(btrim(v.naam)) in (select lower(btrim(x)) from jsonb_each_text(p_namen) as e(k, x))
  limit 1;
  if bestaand is not null then return bestaand; end if;
  if (select count(*) from public.ingredienten where herkomst = 'ai' and toegevoegd_op >= current_date) >= 50 then
    return null;
  end if;
  if p_code !~ '^[a-z][a-z0-9_]{1,40}$' then raise exception 'ongeldige code'; end if;
  if p_categorie not in ('condiment','ei','eiwit','fruit','graan','groente','kruid','noten','overig','peulvrucht','specerij','vet','vis','vlees','zoet','zuivel') then
    raise exception 'ongeldige categorie';
  end if;
  foreach t in array array['nl', 'fr', 'de', 'en'] loop
    if coalesce(btrim(p_namen ->> t), '') = '' or length(p_namen ->> t) > 80 then raise exception 'naam ontbreekt (%)', t; end if;
  end loop;
  insert into public.ingredienten (code, categorie, eenheid, soort, allergenen, kcal_per_100g, eiwit_per_100g, vezels_per_100g, herkomst, nagekeken)
  values (
    p_code, p_categorie, p_eenheid, p_soort,
    coalesce((select array_agg(a) from unnest(p_allergenen) a
              where a in ('ei','gluten','melk','noten','schaaldieren','soja','sulfiet','vis','weekdieren','pinda','selderij','mosterd','sesam','lupine')), '{}'),
    p_kcal, p_eiwit, p_vezels, 'ai', false
  )
  returning id into nieuw_id;
  insert into public.ingredient_vertalingen (ingredient_id, taal, naam)
  select nieuw_id, t, btrim(p_namen ->> t) from unnest(array['nl', 'fr', 'de', 'en']) as t;
  -- De meldingen van deze naam (WEEK-248) zijn hiermee opgelost.
  update public.ingredient_meldingen set status = 'toegevoegd', ingredient_code = p_code
  where status in ('nieuw', 'goedgekeurd') and naam in (select lower(btrim(x)) from jsonb_each_text(p_namen) as e(k, x));
  return p_code;
end
$$;
revoke all on function public.famenu_voeg_ingredient_toe(text, text, text, text, text[], numeric, numeric, numeric, jsonb) from public, anon, authenticated;
grant execute on function public.famenu_voeg_ingredient_toe(text, text, text, text, text[], numeric, numeric, numeric, jsonb) to service_role;

-- Overzicht voor de eigenaar: automatisch toegevoegde ingrediënten die nog nagekeken moeten worden.
-- Nakijken: aanpassen waar nodig en daarna `update public.ingredienten set nagekeken = true where code = '...'`.
create view public.ingredienten_na_te_kijken with (security_invoker = true) as
select i.code, i.categorie, i.eenheid, i.soort, i.allergenen, i.kcal_per_100g, i.eiwit_per_100g, i.vezels_per_100g,
  (select jsonb_object_agg(v.taal, v.naam) from public.ingredient_vertalingen v where v.ingredient_id = i.id) as namen,
  i.toegevoegd_op
from public.ingredienten i
where i.herkomst = 'ai' and not i.nagekeken
order by i.toegevoegd_op desc;
revoke all on public.ingredienten_na_te_kijken from anon, authenticated;
