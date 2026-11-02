-- Gezinsprofiel alleen door de beheerder (WEEK-168).
-- Samenstelling, adres en de rest van het gezinsprofiel (document 'profiel') kan enkel de beheerder
-- van het gezin wijzigen. Andere leden lezen het enkel. Het weekplan (document 'plan') blijft voor alle leden.

drop policy if exists "leden voegen documenten toe" on public.gezin_documenten;
drop policy if exists "leden wijzigen documenten" on public.gezin_documenten;

create policy "leden voegen documenten toe" on public.gezin_documenten
  for insert to authenticated
  with check (
    public.is_lid(gezin_id)
    and (sleutel <> 'profiel' or public.is_beheerder(gezin_id))
  );

create policy "leden wijzigen documenten" on public.gezin_documenten
  for update to authenticated
  using (public.is_lid(gezin_id))
  with check (
    public.is_lid(gezin_id)
    and (sleutel <> 'profiel' or public.is_beheerder(gezin_id))
  );
