-- Beheer van de gezinsruimte (WEEK-65): de beheerder staat op het gezin en kan
-- andere leden tot beheerder maken, de groep opheffen, of verlaten met een opvolger.

alter table public.gezinnen
  add column beheerder_id uuid references auth.users (id) on delete set null;

-- Bestaande gezinnen: het oudste lid wordt beheerder.
update public.gezinnen g
set beheerder_id = (
  select l.gebruiker_id from public.gezinsleden l
  where l.gezin_id = g.id
  order by l.toegetreden_op asc
  limit 1
)
where g.beheerder_id is null;

-- Wie een gezin maakt, is de beheerder.
create or replace function public.maak_gezin(p_naam text, p_lid_naam text default '')
returns public.gezinnen
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.gezinnen;
  pogingen int := 0;
begin
  if auth.uid() is null then
    raise exception 'niet_aangemeld';
  end if;
  if exists (select 1 from public.gezinsleden where gebruiker_id = auth.uid()) then
    raise exception 'al_lid';
  end if;
  loop
    begin
      insert into public.gezinnen (naam, code, beheerder_id)
      values (coalesce(nullif(left(trim(p_naam), 60), ''), 'Gezin'), public.nieuwe_gezinscode(), auth.uid())
      returning * into g;
      exit;
    exception when unique_violation then
      pogingen := pogingen + 1;
      if pogingen > 10 then raise; end if;
    end;
  end loop;
  insert into public.gezinsleden (gezin_id, gebruiker_id, naam)
  values (g.id, auth.uid(), left(trim(coalesce(p_lid_naam, '')), 40));
  return g;
end;
$$;

-- Is de aangemelde gebruiker de beheerder van dit gezin?
create or replace function public.is_beheerder(p_gezin uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.gezinnen g
    where g.id = p_gezin and g.beheerder_id = auth.uid()
  );
$$;

-- Verlaat het gezin. Een beheerder moet eerst een opvolger aanwijzen (zie verlaat_gezin_met_opvolger),
-- tenzij hij het laatste lid is: dan verdwijnt het gezin met al zijn gegevens.
create or replace function public.verlaat_gezin()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  g uuid;
begin
  select gezin_id into g from public.gezinsleden where gebruiker_id = auth.uid();
  if g is null then
    return;
  end if;
  if public.is_beheerder(g) and exists (select 1 from public.gezinsleden where gezin_id = g and gebruiker_id <> auth.uid()) then
    raise exception 'opvolger_nodig';
  end if;
  delete from public.gezinsleden where gebruiker_id = auth.uid();
  if not exists (select 1 from public.gezinsleden where gezin_id = g) then
    delete from public.gezinnen where id = g;
  end if;
end;
$$;

-- Maakt een ander lid tot beheerder. Enkel de beheerder zelf.
create function public.maak_beheerder(p_gebruiker uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  g uuid;
begin
  select gezin_id into g from public.gezinsleden where gebruiker_id = auth.uid();
  if g is null or not public.is_beheerder(g) then
    raise exception 'geen_beheerder';
  end if;
  if not exists (select 1 from public.gezinsleden where gezin_id = g and gebruiker_id = p_gebruiker) then
    raise exception 'geen_lid';
  end if;
  update public.gezinnen set beheerder_id = p_gebruiker where id = g;
end;
$$;

-- De beheerder verlaat het gezin en wijst een opvolger aan. De opvolger wordt beheerder.
create function public.verlaat_gezin_met_opvolger(p_opvolger uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  g uuid;
begin
  select gezin_id into g from public.gezinsleden where gebruiker_id = auth.uid();
  if g is null or not public.is_beheerder(g) then
    raise exception 'geen_beheerder';
  end if;
  if p_opvolger = auth.uid() or not exists (select 1 from public.gezinsleden where gezin_id = g and gebruiker_id = p_opvolger) then
    raise exception 'geen_opvolger';
  end if;
  update public.gezinnen set beheerder_id = p_opvolger where id = g;
  delete from public.gezinsleden where gebruiker_id = auth.uid();
end;
$$;

-- De beheerder heft de groep op: het gezin met al zijn gegevens verdwijnt, voor iedereen.
create function public.hef_gezin_op()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  g uuid;
begin
  select gezin_id into g from public.gezinsleden where gebruiker_id = auth.uid();
  if g is null or not public.is_beheerder(g) then
    raise exception 'geen_beheerder';
  end if;
  delete from public.gezinnen where id = g;
end;
$$;

revoke all on function public.is_beheerder(uuid) from public, anon;
revoke all on function public.maak_beheerder(uuid) from public, anon;
revoke all on function public.verlaat_gezin_met_opvolger(uuid) from public, anon;
revoke all on function public.hef_gezin_op() from public, anon;
grant execute on function public.is_beheerder(uuid) to authenticated;
grant execute on function public.maak_beheerder(uuid) to authenticated;
grant execute on function public.verlaat_gezin_met_opvolger(uuid) to authenticated;
grant execute on function public.hef_gezin_op() to authenticated;
