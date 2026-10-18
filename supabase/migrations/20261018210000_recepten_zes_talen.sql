-- WEEK-84: recepten, stappen en ingrediënten in zes talen (nl, fr, de, en, es, pt),
-- en de stijlcodes van de keukens die nog geen recepten hadden.
-- Additief: bestaande rijen blijven zoals ze zijn.
alter table public.recept_vertalingen drop constraint if exists recept_vertalingen_taal_check;
alter table public.recept_vertalingen add constraint recept_vertalingen_taal_check
  check (taal = any (array['nl'::text, 'fr'::text, 'de'::text, 'en'::text, 'es'::text, 'pt'::text]));

alter table public.bereidingsstap_vertalingen drop constraint if exists bereidingsstap_vertalingen_taal_check;
alter table public.bereidingsstap_vertalingen add constraint bereidingsstap_vertalingen_taal_check
  check (taal = any (array['nl'::text, 'fr'::text, 'de'::text, 'en'::text, 'es'::text, 'pt'::text]));

alter table public.ingredient_vertalingen drop constraint if exists ingredient_vertalingen_taal_check;
alter table public.ingredient_vertalingen add constraint ingredient_vertalingen_taal_check
  check (taal = any (array['nl'::text, 'fr'::text, 'de'::text, 'en'::text, 'es'::text, 'pt'::text]));

alter table public.recepten drop constraint if exists recepten_stijl_check;
alter table public.recepten add constraint recepten_stijl_check
  check (stijl = any (array['klassiek'::text, 'italiaans'::text, 'aziatisch'::text, 'mexicaans'::text, 'mediterraan'::text,
    'thais'::text, 'japans'::text, 'koreaans'::text, 'frans'::text, 'belgisch'::text, 'indiaas'::text, 'chinees'::text, 'hartig'::text, 'zoet'::text]));
