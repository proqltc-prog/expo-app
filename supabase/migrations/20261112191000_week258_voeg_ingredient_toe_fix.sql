-- WEEK-258: fout in famenu_voeg_ingredient_toe (WEEK-254) gevonden bij de test: "column reference t is ambiguous"
-- (t was zowel een variabele als de kolom van unnest), waardoor geen enkel nieuw ingrediënt toegevoegd kon worden.
-- Zelfde functie, enkel de vertalingen worden nu ingevoegd met een eigen naam (taal) voor de kolom.
create or replace function public.famenu_voeg_ingredient_toe(
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
  select nieuw_id, tl.taal, btrim(p_namen ->> tl.taal) from unnest(array['nl', 'fr', 'de', 'en']) as tl(taal);
  update public.ingredient_meldingen set status = 'toegevoegd', ingredient_code = p_code
  where status in ('nieuw', 'goedgekeurd') and naam in (select lower(btrim(x)) from jsonb_each_text(p_namen) as e(k, x));
  return p_code;
end
$$;
