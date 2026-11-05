-- WEEK-212: alle recepten in de databank voor 1 volwassene.
-- De app schaalt elk recept naar het gezin (src/lib/schaal.ts) en gaat ervan uit dat de
-- hoeveelheden voor 1 volwassene gelden. Recepten met porties > 1 krijgen hun hoeveelheden
-- gedeeld door het aantal porties; daarna porties = 1. Idempotent: een tweede keer doet niets.
update public.recept_ingredienten ri
set hoeveelheid = round(ri.hoeveelheid / r.porties, 2)
from public.recepten r
where r.id = ri.recept_id
  and r.porties > 1;

update public.recepten
set porties = 1
where porties > 1;

-- Nieuwe recepten: standaard 1 volwassene en nooit anders.
alter table public.recepten alter column porties set default 1;
alter table public.recepten drop constraint if exists recepten_porties_een_volwassene;
alter table public.recepten add constraint recepten_porties_een_volwassene check (porties = 1);
