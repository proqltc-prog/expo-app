-- WEEK-323: de beheerder haalt een ander lid uit de gezinsruimte (bv. een oud toestel of een dubbel lid).
-- Enkel de beheerder; nooit zichzelf (daarvoor bestaan verlaat_gezin en verlaat_gezin_met_opvolger).
-- De gegevens van het gezin blijven; enkel het lidmaatschap verdwijnt.
-- Terugdraaien: drop function public.verwijder_lid(uuid);

create or replace function public.verwijder_lid(p_lid uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  g uuid;
begin
  select gezin_id into g from public.gezinsleden where gebruiker_id = auth.uid();
  if g is null or not public.is_beheerder(g) then
    raise exception 'geen_beheerder';
  end if;
  if p_lid = auth.uid() then
    raise exception 'niet_zelf';
  end if;
  delete from public.gezinsleden where gezin_id = g and gebruiker_id = p_lid;
  if not found then
    raise exception 'geen_lid';
  end if;
end;
$function$;

revoke all on function public.verwijder_lid(uuid) from public, anon;
grant execute on function public.verwijder_lid(uuid) to authenticated;
