-- WEEK-248: beheer van de gemelde onbekende ingrediënten. Plak een blok in de SQL-editor van Supabase.
-- (Ook te bekijken in de Table Editor: views ingredient_meldingen_overzicht en ingredient_meldingen_per_taal.)

-- 1. Samenvatting: per taal hoeveel namen en meldingen, en hoeveel per status.
select * from public.ingredient_meldingen_per_taal;

-- 2. Alle meldingen: de nieuwe eerst, de vaakst gemelde bovenaan, met de talen die nog ontbreken.
select * from public.ingredient_meldingen_overzicht;

-- 3. Goedkeuren of afwijzen (pas de namen en de taal aan).
update public.ingredient_meldingen set status = 'goedgekeurd' where taal = 'nl' and naam in ('yuzu');
update public.ingredient_meldingen set status = 'afgewezen' where taal = 'nl' and naam in ('drakenpoeder');

-- 4. Batchvertaling: vraag Claude "vertaal de goedgekeurde ingrediënten". Die
--    a) leest de goedgekeurde meldingen,
--    b) vult de ontbrekende talen aan (nl, fr, de, en) en kiest categorie, eenheid en voedingswaarden,
--    c) voegt ze toe aan public.ingredienten en public.ingredient_vertalingen
--       (een naam die al een bestaand ingrediënt blijkt, krijgt enkel die code: geen dubbel),
--    d) zet de meldingen op 'toegevoegd' met de ingredient_code,
--    e) maakt de lijst in de app opnieuw: npm run ingredienten (en een nieuwe versie van de app).

-- 5. Controle: ingrediënten in de lijst die nog een vertaling missen (die slaat npm run ingredienten over).
select * from public.ingredient_vertalingen_ontbrekend;
