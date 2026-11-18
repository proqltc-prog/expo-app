-- WEEK-316: sterren na Gekookt. Eén beoordeling per gebruiker en gerecht van de app (1 tot 5 sterren), enkel sterren.
-- Geen naam of e-mail: enkel het (eventueel anonieme) gebruikers-id.
-- Terugdraaien: drop view public.recept_scores; drop table public.recept_beoordelingen;

create table if not exists public.recept_beoordelingen (
  gebruiker_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recept_id bigint not null references public.recepten(id) on delete cascade,
  sterren smallint not null check (sterren between 1 and 5),
  bijgewerkt_op timestamptz not null default now(),
  primary key (gebruiker_id, recept_id)
);

create index if not exists recept_beoordelingen_recept on public.recept_beoordelingen (recept_id);

alter table public.recept_beoordelingen enable row level security;

create policy "eigen beoordelingen lezen" on public.recept_beoordelingen
  for select to authenticated using (gebruiker_id = (select auth.uid()));
create policy "eigen beoordeling toevoegen" on public.recept_beoordelingen
  for insert to authenticated with check (gebruiker_id = (select auth.uid()));
create policy "eigen beoordeling wijzigen" on public.recept_beoordelingen
  for update to authenticated using (gebruiker_id = (select auth.uid())) with check (gebruiker_id = (select auth.uid()));

-- Overzicht voor de eigenaar (enkel via het dashboard of de service-rol): gemiddelde, aantal en lage scores per gerecht.
create or replace view public.recept_scores with (security_invoker = true) as
select
  b.recept_id,
  v.titel as naam,
  count(*) as aantal,
  round(avg(b.sterren)::numeric, 2) as gemiddelde,
  count(*) filter (where b.sterren <= 2) as laag,
  max(b.bijgewerkt_op) as laatst
from public.recept_beoordelingen b
left join public.recept_vertalingen v on v.recept_id = b.recept_id and v.taal = 'nl'
group by b.recept_id, v.titel;

revoke all on public.recept_scores from anon, authenticated;
