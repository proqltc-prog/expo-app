-- WEEK-121: bereidingsstappen per recept en taal.
-- Eén rij per recept en taal; stappen is een JSON-lijst met tekstregels (4 tot 6 stappen).
-- Lezen is openbaar (zoals recepten); schrijven gebeurt enkel via de databank zelf.
create table if not exists public.recept_bereidingen (
  recept_id integer not null references public.recepten(id) on delete cascade,
  taal text not null check (taal in ('nl','fr','de','en','es','pt')),
  stappen jsonb not null check (jsonb_typeof(stappen) = 'array'),
  primary key (recept_id, taal)
);

alter table public.recept_bereidingen enable row level security;

create policy "recept_bereidingen lezen" on public.recept_bereidingen
  for select to anon, authenticated using (true);
