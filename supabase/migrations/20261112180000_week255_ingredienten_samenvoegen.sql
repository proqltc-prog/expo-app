-- WEEK-255: dubbele ingrediënten veilig samenvoegen, zonder impact op recepten.
-- De oude code blijft bestaan als doorverwijzing (ingredient_aliassen): de app krijgt die mee met de ingrediëntenlijst
-- (WEEK-252), zodat eigen recepten, boodschappenlijsten, frigo's en weekmenu's op de toestellen blijven werken.
-- Enkel toevoegingen. Terugdraaien:
--   drop function public.famenu_voeg_ingredienten_samen(text, text); drop trigger data_versie_ingredient_aliassen on public.ingredient_aliassen;
--   drop table public.ingredient_aliassen; drop table public.ingredient_controle_log;

create table public.ingredient_aliassen (
  oud text primary key check (oud ~ '^[a-z][a-z0-9_]{1,40}$'),
  nieuw text not null references public.ingredienten (code) on update cascade,
  samengevoegd_op timestamptz not null default now(),
  check (oud <> nieuw)
);
alter table public.ingredient_aliassen enable row level security;
create policy "ingredient_aliassen is leesbaar voor iedereen" on public.ingredient_aliassen for select to anon, authenticated using (true);
revoke insert, update, delete, truncate on public.ingredient_aliassen from anon, authenticated;

create trigger data_versie_ingredient_aliassen after insert or update or delete or truncate on public.ingredient_aliassen
  for each statement execute function public.famenu_verhoog_data_versie('ingredienten', 'recepten');

-- Verslag van de dagelijkse controle (enkel de eigenaar leest het).
create table public.ingredient_controle_log (
  id bigint generated always as identity primary key,
  gecontroleerd_op timestamptz not null default now(),
  code text not null,
  actie text not null check (actie in ('nagekeken', 'verbeterd', 'samengevoegd', 'twijfel')),
  details text not null default ''
);
alter table public.ingredient_controle_log enable row level security;

-- Voegt het ingrediënt p_dubbel samen in p_behoud. Alles of niets (één transactie):
-- 1. receptregels: naar p_behoud; staat p_behoud al in hetzelfde recept, dan de hoeveelheden samentellen
--    (enkel bij dezelfde eenheid, anders stopt de functie zonder iets te wijzigen);
-- 2. meldingen (WEEK-248) en bestaande doorverwijzingen wijzen naar p_behoud;
-- 3. p_dubbel wordt een doorverwijzing naar p_behoud en daarna verwijderd (met zijn vertalingen).
create function public.famenu_voeg_ingredienten_samen(p_dubbel text, p_behoud text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  id_dubbel bigint;
  id_behoud bigint;
begin
  if p_dubbel = p_behoud then raise exception 'zelfde ingrediënt'; end if;
  select id into id_dubbel from public.ingredienten where code = p_dubbel;
  select id into id_behoud from public.ingredienten where code = p_behoud;
  if id_dubbel is null or id_behoud is null then raise exception 'ingrediënt onbekend (% of %)', p_dubbel, p_behoud; end if;
  if exists (
    select 1 from public.recept_ingredienten d join public.recept_ingredienten b
      on b.recept_id = d.recept_id and b.ingredient_id = id_behoud
    where d.ingredient_id = id_dubbel and d.eenheid <> b.eenheid
  ) then
    raise exception 'recept met beide ingrediënten in een andere eenheid: eerst met de hand oplossen';
  end if;
  update public.recept_ingredienten b set hoeveelheid = b.hoeveelheid + d.hoeveelheid
  from public.recept_ingredienten d
  where d.recept_id = b.recept_id and d.ingredient_id = id_dubbel and b.ingredient_id = id_behoud;
  delete from public.recept_ingredienten d
  where d.ingredient_id = id_dubbel and exists (select 1 from public.recept_ingredienten b where b.recept_id = d.recept_id and b.ingredient_id = id_behoud);
  update public.recept_ingredienten set ingredient_id = id_behoud where ingredient_id = id_dubbel;
  update public.ingredient_meldingen set ingredient_code = p_behoud where ingredient_code = p_dubbel;
  update public.ingredient_aliassen set nieuw = p_behoud where nieuw = p_dubbel;
  insert into public.ingredient_aliassen (oud, nieuw) values (p_dubbel, p_behoud)
    on conflict (oud) do update set nieuw = excluded.nieuw, samengevoegd_op = now();
  delete from public.ingredienten where id = id_dubbel;
  insert into public.ingredient_controle_log (code, actie, details) values (p_dubbel, 'samengevoegd', 'samengevoegd in ' || p_behoud);
end
$$;
revoke all on function public.famenu_voeg_ingredienten_samen(text, text) from public, anon, authenticated;
