-- WEEK-86: de stijlcodes thais, japans en koreaans toevoegen aan de receptenbank.
-- Additief: de bestaande codes blijven geldig, er worden geen rijen gewijzigd.
alter table public.recepten drop constraint if exists recepten_stijl_check;
alter table public.recepten add constraint recepten_stijl_check
  check (stijl = any (array['klassiek'::text, 'italiaans'::text, 'aziatisch'::text, 'mexicaans'::text, 'mediterraan'::text, 'thais'::text, 'japans'::text, 'koreaans'::text]));
