-- WEEK-275: de app deelt eigen gerechten als soort 'eigenRecept' (WEEK-192), maar de databank liet die soort niet toe.
-- Daardoor mislukte het hele pakket van een toestel, ook de boodschappenlijst, In huis en het weekmenu.
-- WEEK-276: enkel de beheerder van de gezinsruimte mag eigen gerechten toevoegen of wijzigen; de andere leden lezen mee
-- (zelfde regel als het gezinsprofiel, WEEK-168).
-- Terugdraaien:
--   alter table public.gezin_items drop constraint gezin_items_soort_check;
--   alter table public.gezin_items add constraint gezin_items_soort_check check (soort = any (array['lijst', 'frigo', 'favoriet']));
--   en de twee policies hieronder terugzetten naar with check (is_lid(gezin_id)).

alter table public.gezin_items drop constraint gezin_items_soort_check;
alter table public.gezin_items add constraint gezin_items_soort_check
  check (soort = any (array['lijst', 'frigo', 'favoriet', 'eigenRecept']));

drop policy "leden voegen items toe" on public.gezin_items;
create policy "leden voegen items toe" on public.gezin_items for insert
  with check (is_lid(gezin_id) and (soort <> 'eigenRecept' or is_beheerder(gezin_id)));

drop policy "leden wijzigen items" on public.gezin_items;
create policy "leden wijzigen items" on public.gezin_items for update
  using (is_lid(gezin_id))
  with check (is_lid(gezin_id) and (soort <> 'eigenRecept' or is_beheerder(gezin_id)));
