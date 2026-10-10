-- Fix voor de pogingenlimiet van word_lid (WEEK-8).
-- Een exception draait de hele aanroep terug, ook de geregistreerde mislukte poging.
-- Daarom geeft word_lid bij een onbekende code nu null terug in plaats van een fout,
-- zodat de poging bewaard blijft en de limiet (10 per uur) echt werkt.
create or replace function public.word_lid(p_code text, p_lid_naam text default '')
returns public.gezinnen
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.gezinnen;
begin
  if auth.uid() is null then
    raise exception 'niet_aangemeld';
  end if;
  if (select count(*) from public.lid_pogingen
      where gebruiker_id = auth.uid() and op > now() - interval '1 hour') >= 10 then
    raise exception 'te_veel_pogingen';
  end if;
  select * into g from public.gezinnen where code = upper(trim(p_code));
  if not found then
    insert into public.lid_pogingen (gebruiker_id) values (auth.uid());
    return null; -- onbekende code
  end if;
  if exists (select 1 from public.gezinsleden where gebruiker_id = auth.uid() and gezin_id <> g.id) then
    raise exception 'al_lid';
  end if;
  insert into public.gezinsleden (gezin_id, gebruiker_id, naam)
  values (g.id, auth.uid(), left(trim(coalesce(p_lid_naam, '')), 40))
  on conflict (gezin_id, gebruiker_id) do nothing;
  return g;
end;
$$;

