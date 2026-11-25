-- WEEK-337: voorbereiding om later zelf je (web)winkel te kiezen. Nog onzichtbaar in de app.
-- Per winkelketen wat er later kan (zoeken in de webshop, mandje vullen, prijzen, promoties).
-- Zolang er geen koppeling is, staat elke winkel op actief = false: de app leest enkel actieve winkels en toont dus niets.
-- Een koppeling aanzetten gebeurt hier (actief, zoek_url, mogelijkheden), zonder nieuwe versie van de app.
-- Codes zoals in recepten.winkel (ah, delhaize, colruyt) + carrefour.
-- Terugdraaien: drop table public.webwinkels;

create table if not exists public.webwinkels (
  code text primary key check (code ~ '^[a-z0-9_]+$'),
  naam text not null,
  land text not null default 'BE' check (land ~ '^[A-Z]{2}$'),
  webshop_url text not null check (webshop_url ~ '^https://'),
  -- Sjabloon voor zoeken in de webshop, met {zoekterm}; null zolang niet nagekeken.
  zoek_url text check (zoek_url is null or (zoek_url ~ '^https://' and position('{zoekterm}' in zoek_url) > 0)),
  mogelijkheden text[] not null default '{}' check (mogelijkheden <@ array['zoeken', 'mandje', 'prijzen', 'promoties']::text[]),
  actief boolean not null default false,
  volgorde smallint not null default 0,
  bijgewerkt_op timestamptz not null default now()
);

alter table public.webwinkels enable row level security;

-- Iedereen mag de actieve winkels lezen (ook zonder account); schrijven enkel via het dashboard of de service-rol.
create policy "actieve webwinkels lezen" on public.webwinkels
  for select to anon, authenticated using (actief);

insert into public.webwinkels (code, naam, webshop_url, volgorde) values
  ('colruyt', 'Colruyt (Collect&Go)', 'https://www.collectandgo.be', 1),
  ('delhaize', 'Delhaize', 'https://www.delhaize.be', 2),
  ('ah', 'Albert Heijn', 'https://www.ah.be', 3),
  ('carrefour', 'Carrefour', 'https://www.carrefour.be', 4)
on conflict (code) do nothing;
