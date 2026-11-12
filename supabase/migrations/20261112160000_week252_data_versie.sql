-- WEEK-252/253: één versienummer per soort gegevens, zodat de app enkel iets ophaalt als er iets veranderd is.
-- De nummers stijgen automatisch bij elke wijziging (één keer per opdracht, ook bij een batch van honderden rijen).
--   ingredienten: ingredienten, ingredient_vertalingen
--   recepten:     recepten, recept_vertalingen, recept_bereidingen, recept_ingredienten (en ingredienten: code/categorie)
-- Iedereen mag de nummers lezen (geen gevoelige gegevens); enkel de triggers schrijven.
-- Enkel toevoegingen. Terugdraaien:
--   drop trigger data_versie_ingredienten on public.ingredienten; drop trigger data_versie_ingredient_vertalingen on public.ingredient_vertalingen;
--   drop trigger data_versie_recepten on public.recepten; drop trigger data_versie_recept_vertalingen on public.recept_vertalingen;
--   drop trigger data_versie_recept_bereidingen on public.recept_bereidingen; drop trigger data_versie_recept_ingredienten on public.recept_ingredienten;
--   drop function public.famenu_verhoog_data_versie(); drop table public.data_versie;

create table public.data_versie (
  naam text primary key check (naam in ('ingredienten', 'recepten')),
  versie bigint not null default 1,
  gewijzigd timestamptz not null default now()
);
insert into public.data_versie (naam) values ('ingredienten'), ('recepten');

alter table public.data_versie enable row level security;
create policy "data_versie is leesbaar voor iedereen" on public.data_versie for select to anon, authenticated using (true);
revoke insert, update, delete, truncate on public.data_versie from anon, authenticated;

-- Verhoogt de versie(s) die als argument van de trigger meegegeven zijn.
create function public.famenu_verhoog_data_versie() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.data_versie set versie = versie + 1, gewijzigd = now() where naam = any (tg_argv);
  return null;
end
$$;
revoke all on function public.famenu_verhoog_data_versie() from public, anon, authenticated;

create trigger data_versie_ingredienten after insert or update or delete or truncate on public.ingredienten
  for each statement execute function public.famenu_verhoog_data_versie('ingredienten', 'recepten');
create trigger data_versie_ingredient_vertalingen after insert or update or delete or truncate on public.ingredient_vertalingen
  for each statement execute function public.famenu_verhoog_data_versie('ingredienten');
create trigger data_versie_recepten after insert or update or delete or truncate on public.recepten
  for each statement execute function public.famenu_verhoog_data_versie('recepten');
create trigger data_versie_recept_vertalingen after insert or update or delete or truncate on public.recept_vertalingen
  for each statement execute function public.famenu_verhoog_data_versie('recepten');
create trigger data_versie_recept_bereidingen after insert or update or delete or truncate on public.recept_bereidingen
  for each statement execute function public.famenu_verhoog_data_versie('recepten');
create trigger data_versie_recept_ingredienten after insert or update or delete or truncate on public.recept_ingredienten
  for each statement execute function public.famenu_verhoog_data_versie('recepten');
