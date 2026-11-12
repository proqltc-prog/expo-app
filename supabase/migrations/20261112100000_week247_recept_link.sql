-- WEEK-247: limiet voor het inlezen van recepten via een link (Supabase-functie recept-link).
-- Per gebruiker (ook anoniem) en per dag een teller; enkel deze functie schrijft erin. Geen links of pagina's bewaard.
-- Enkel toevoegingen. Terugdraaien:
--   drop function public.famenu_recept_link_tel(); drop table public.recept_link_gebruik;
--   en de Supabase-functie recept-link verwijderen in het dashboard.

create table public.recept_link_gebruik (
  gebruiker uuid not null,
  dag date not null default current_date,
  aantal int not null default 0,
  primary key (gebruiker, dag)
);
-- RLS aan zonder beleid: niemand leest of schrijft rechtstreeks, enkel via de functie hieronder.
alter table public.recept_link_gebruik enable row level security;

-- Telt één inlezing voor de aangemelde gebruiker. true zolang de gebruiker vandaag onder de 20 blijft
-- en alle gebruikers samen onder de 1000 (bescherming tegen misbruik). Oude dagen worden opgeruimd.
create function public.famenu_recept_link_tel() returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  n int;
  totaal int;
begin
  if auth.uid() is null then return false; end if;
  delete from public.recept_link_gebruik where dag < current_date - 7;
  select coalesce(sum(aantal), 0) into totaal from public.recept_link_gebruik where dag = current_date;
  if totaal >= 1000 then return false; end if;
  insert into public.recept_link_gebruik as g (gebruiker, dag, aantal) values (auth.uid(), current_date, 1)
  on conflict (gebruiker, dag) do update set aantal = g.aantal + 1
  returning aantal into n;
  return n <= 20;
end
$$;
revoke all on function public.famenu_recept_link_tel() from public, anon;
grant execute on function public.famenu_recept_link_tel() to authenticated;
