-- WEEK-219: de winkel van een recept (afgeleid uit de bron), voor later gebruik in de app.
alter table public.recepten add column if not exists winkel text
  check (winkel is null or winkel in ('ah', 'delhaize', 'colruyt'));

comment on column public.recepten.winkel is 'WEEK-219: winkel van het recept volgens de bron (ah, delhaize, colruyt); leeg voor andere sites.';

update public.recepten set winkel = case
  when bron ~* '^https?://([a-z0-9-]+\.)*ah\.(be|nl)/' then 'ah'
  when bron ~* '^https?://([a-z0-9-]+\.)*delhaize\.be/' then 'delhaize'
  when bron ~* '^https?://([a-z0-9-]+\.)*colruyt\.be/' then 'colruyt'
end
where winkel is null;
