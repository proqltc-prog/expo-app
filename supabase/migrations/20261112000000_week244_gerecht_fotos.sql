-- WEEK-244: foto's van gerechten (gratis Pexels-foto's) in de opslag van Supabase.
-- Toegepast op 12/11/2026 als migratie "week244_gerecht_fotos". De lijst met foto's staat in
-- supabase/data/gerecht-fotos-week-244.sql; daarna ken_gerechtfotos_toe() uitvoeren.
-- Enkel toevoegingen. Terugdraaien:
--   alter table public.recepten drop column foto_pad;
--   drop function public.ken_gerechtfotos_toe(); drop function public.famenu_gerecht_soort(text, text, text);
--   drop table public.gerecht_fotos;  (en de map 'gerechtfotos' leegmaken en verwijderen in Storage)

create table public.gerecht_fotos (
  pad text primary key,               -- bestandsnaam in de map gerechtfotos; bevat de Pexels-id, dus elke nieuwe foto heeft een nieuwe naam
  sleutel text not null,              -- keuken-soort (bv. 'italiaans-pasta') of 'stijl-<keuken>' / 'stijl-gezin'
  volgnr int not null default 1,      -- variant binnen dezelfde sleutel
  pexels_id bigint not null,
  bron text not null,                 -- link naar de foto op Pexels
  aangemaakt_op timestamptz not null default now()
);
create index gerecht_fotos_sleutel on public.gerecht_fotos (sleutel);
alter table public.gerecht_fotos enable row level security;
create policy "gerechtfoto's lezen" on public.gerecht_fotos for select to anon, authenticated using (true);

alter table public.recepten add column foto_pad text references public.gerecht_fotos (pad) on delete set null;

-- Publieke map voor de foto's: iedereen mag ze lezen via de publieke link, enkel JPEG tot 200 kB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gerechtfotos', 'gerechtfotos', true, 204800, array['image/jpeg']);

-- Het soort gerecht uit de titel (nl), de basis en de bereiding.
create function public.famenu_gerecht_soort(titel text, basis text, bereiding text) returns text
language sql immutable set search_path = '' as $$
  select case
    when titel ~ '(soep|bouillon|ramen|pho|minestrone|velouté)' then 'soep'
    when titel ~ '(salade|bowl|poke)' then 'salade'
    when titel ~ '(curry|dal|korma|tikka|masala|kerrie)' then 'curry'
    when titel ~ '(stoof|stoverij|ragout|chili|goulash|tajine|stew)' then 'stoof'
    when titel ~ '(burger|sandwich|toast|tosti|croque|wrap|taco|burrito|quesadilla|fajita|pita)' then 'brood'
    when titel ~ '(lasagne|gratin|ovenschotel|quiche|moussaka|traybake|uit de oven|tian)' or (bereiding = 'oven' and basis is null) then 'ovenschotel'
    when titel ~ '(risotto|paella|nasi|fried rice|gebakken rijst|bibimbap|donburi|pilaf|biryani)' then 'rijstgerecht'
    when titel ~ '(noedel|noodle|pad thai|mie|udon|soba|bami)' or basis = 'noedels' then 'noedels'
    when titel ~ '(pasta|spaghetti|penne|tagliatelle|gnocchi|orzo|linguine|fusilli|macaroni|ravioli)' or basis = 'pasta' then 'pasta'
    when titel ~ '(vis|zalm|kabeljauw|scampi|garnaal|tonijn|mosselen)' then 'vis'
    when titel ~ '(kip|kalkoen)' then 'kip'
    when titel ~ '(gehakt|balletjes|steak|biefstuk|varken|rund|worst|spek)' then 'vlees'
    when basis is not null then basis
    else 'bord'
  end
$$;

-- Geeft elk recept een foto: de foto van keuken-soort (verdeeld over de varianten, zodat een weekmenu
-- minder dubbel toont), anders de stijlfoto van de keuken. Opnieuw uitvoeren na nieuwe recepten of foto's.
create function public.ken_gerechtfotos_toe() returns integer
language plpgsql set search_path = '' as $$
declare aantal integer;
begin
  with t as (
    select r.id, r.stijl, public.famenu_gerecht_soort(lower(v.titel), r.basis, r.bereidingswijze) as soort
    from public.recepten r join public.recept_vertalingen v on v.recept_id = r.id and v.taal = 'nl'
  ),
  k as (
    select id, stijl, stijl || '-' || soort as combi,
           row_number() over (partition by stijl, soort order by id) - 1 as rnr
    from t
  ),
  f as (
    select sleutel, pad, row_number() over (partition by sleutel order by volgnr, pad) - 1 as nr,
           count(*) over (partition by sleutel) as aantal
    from public.gerecht_fotos
  ),
  keuze as (
    select k.id, coalesce(
      (select f.pad from f where f.sleutel = k.combi and f.nr = k.rnr % f.aantal),
      (select f.pad from f where f.sleutel = 'stijl-' || k.stijl and f.nr = 0)
    ) as pad
    from k
  )
  update public.recepten r set foto_pad = keuze.pad
  from keuze where keuze.id = r.id and r.foto_pad is distinct from keuze.pad;
  get diagnostics aantal = row_count;
  return aantal;
end
$$;
revoke all on function public.ken_gerechtfotos_toe() from public, anon, authenticated;
