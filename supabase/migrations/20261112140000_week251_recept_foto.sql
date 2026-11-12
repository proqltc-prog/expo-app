-- WEEK-251: limiet voor het inlezen van recepten via een foto (Supabase-functie recept-foto, Google Gemini).
-- Per gebruiker (ook anoniem) en per dag een teller; enkel deze functie schrijft erin. Foto's worden nergens bewaard.
-- Afspraak eigenaar: 5 per gebruiker per dag, 100 per dag voor alle gebruikers samen (gratis plan van Gemini).
-- Enkel toevoegingen. Terugdraaien:
--   drop function public.famenu_recept_foto_tel(); drop table public.recept_foto_gebruik;
--   en de Supabase-functie recept-foto en het geheim GEMINI_API_KEY verwijderen in het dashboard.

create table public.recept_foto_gebruik (
  gebruiker uuid not null,
  dag date not null default current_date,
  aantal int not null default 0,
  primary key (gebruiker, dag)
);
-- RLS aan zonder beleid: niemand leest of schrijft rechtstreeks, enkel via de functie hieronder.
alter table public.recept_foto_gebruik enable row level security;

-- Telt één foto voor de aangemelde gebruiker. true zolang de gebruiker vandaag onder de 5 blijft
-- en alle gebruikers samen onder de 100. Oude dagen worden opgeruimd.
create function public.famenu_recept_foto_tel() returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  n int;
  totaal int;
begin
  if auth.uid() is null then return false; end if;
  delete from public.recept_foto_gebruik where dag < current_date - 7;
  select coalesce(sum(aantal), 0) into totaal from public.recept_foto_gebruik where dag = current_date;
  if totaal >= 100 then return false; end if;
  insert into public.recept_foto_gebruik as g (gebruiker, dag, aantal) values (auth.uid(), current_date, 1)
  on conflict (gebruiker, dag) do update set aantal = g.aantal + 1
  returning aantal into n;
  return n <= 5;
end
$$;
revoke all on function public.famenu_recept_foto_tel() from public, anon;
grant execute on function public.famenu_recept_foto_tel() to authenticated;
