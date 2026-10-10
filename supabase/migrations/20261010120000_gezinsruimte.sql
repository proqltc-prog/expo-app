-- Gezinsruimte (WEEK-8): één gezin, meerdere leden, gedeelde gegevens.
-- Elk toestel meldt zich anoniem aan (Supabase Auth, "anonymous sign-ins").
-- Wie een gezin maakt, krijgt een code van 6 tekens; met die code worden anderen lid.
-- Enkel leden van een gezin kunnen de gegevens van dat gezin lezen of wijzigen (RLS).

-- ── Tabellen ──

create table public.gezinnen (
  id uuid primary key default gen_random_uuid(),
  naam text not null check (char_length(naam) between 1 and 60),
  -- zonder I, O, 0 en 1 om verwarring bij het overtypen te vermijden
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  aangemaakt_op timestamptz not null default now()
);

create table public.gezinsleden (
  gezin_id uuid not null references public.gezinnen (id) on delete cascade,
  gebruiker_id uuid not null references auth.users (id) on delete cascade,
  naam text not null default '' check (char_length(naam) <= 40),
  toegetreden_op timestamptz not null default now(),
  primary key (gezin_id, gebruiker_id),
  -- een toestel hoort bij hoogstens één gezin tegelijk
  unique (gebruiker_id)
);

-- Lijsten met items die per item gesynchroniseerd worden (boodschappenlijst, frigo, favorieten).
-- Verwijderen gebeurt met verwijderd = true, zodat andere toestellen het ook te weten komen.
create table public.gezin_items (
  gezin_id uuid not null references public.gezinnen (id) on delete cascade,
  soort text not null check (soort in ('lijst', 'frigo', 'favoriet')),
  id text not null check (char_length(id) between 1 and 200),
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 20000),
  verwijderd boolean not null default false,
  bijgewerkt_op timestamptz not null,
  bijgewerkt_door uuid default auth.uid(),
  primary key (gezin_id, soort, id)
);

-- Documenten die als geheel gesynchroniseerd worden (weekplan, gezinsprofiel).
create table public.gezin_documenten (
  gezin_id uuid not null references public.gezinnen (id) on delete cascade,
  sleutel text not null check (sleutel in ('plan', 'profiel')),
  data jsonb not null check (pg_column_size(data) < 200000),
  bijgewerkt_op timestamptz not null,
  bijgewerkt_door uuid default auth.uid(),
  primary key (gezin_id, sleutel)
);

-- Mislukte pogingen om lid te worden (tegen het raden van codes).
create table public.lid_pogingen (
  gebruiker_id uuid not null references auth.users (id) on delete cascade,
  op timestamptz not null default now()
);
create index lid_pogingen_gebruiker on public.lid_pogingen (gebruiker_id, op);

-- ── Hulpfuncties ──

-- Is de aangemelde gebruiker lid van dit gezin? (security definer: omzeilt RLS op gezinsleden, geen lus)
create function public.is_lid(p_gezin uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.gezinsleden
    where gezin_id = p_gezin and gebruiker_id = (select auth.uid())
  );
$$;

-- Laatste wijziging wint: een update met een ouder tijdstip wordt genegeerd.
-- Een tijdstip ver in de toekomst (verkeerde klok) wordt teruggezet naar nu.
create function public.laatste_wint()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.bijgewerkt_op > now() + interval '1 day' then
    new.bijgewerkt_op := now();
  end if;
  if tg_op = 'UPDATE' and new.bijgewerkt_op < old.bijgewerkt_op then
    return null;
  end if;
  new.bijgewerkt_door := auth.uid();
  return new;
end;
$$;

create trigger items_laatste_wint before insert or update on public.gezin_items
  for each row execute function public.laatste_wint();
create trigger documenten_laatste_wint before insert or update on public.gezin_documenten
  for each row execute function public.laatste_wint();

-- Willekeurige code van 6 tekens uit 32 tekens (256 is deelbaar door 32: geen voorkeur voor bepaalde tekens).
create function public.nieuwe_gezinscode()
returns text
language plpgsql
set search_path = ''
as $$
declare
  tekens constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(6);
  code text := '';
begin
  for i in 0..5 loop
    code := code || substr(tekens, 1 + (get_byte(bytes, i) % 32), 1);
  end loop;
  return code;
end;
$$;

-- ── Acties (RPC) ──

-- Maakt een gezin en maakt de aanvrager er lid van.
create function public.maak_gezin(p_naam text, p_lid_naam text default '')
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
      insert into public.gezinnen (naam, code)
      values (coalesce(nullif(left(trim(p_naam), 60), ''), 'Gezin'), public.nieuwe_gezinscode())
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

-- Wordt lid van het gezin met deze code. Maximaal 10 mislukte pogingen per uur.
create function public.word_lid(p_code text, p_lid_naam text default '')
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
    raise exception 'onbekende_code';
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

-- Verlaat het gezin. Het laatste lid dat vertrekt, verwijdert het gezin met al zijn gegevens.
create function public.verlaat_gezin()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  g uuid;
begin
  delete from public.gezinsleden where gebruiker_id = auth.uid() returning gezin_id into g;
  if g is not null and not exists (select 1 from public.gezinsleden where gezin_id = g) then
    delete from public.gezinnen where id = g;
  end if;
end;
$$;

-- ── Rechten ──

revoke all on function public.is_lid(uuid) from public, anon;
revoke all on function public.maak_gezin(text, text) from public, anon;
revoke all on function public.word_lid(text, text) from public, anon;
revoke all on function public.verlaat_gezin() from public, anon;
revoke all on function public.nieuwe_gezinscode() from public, anon, authenticated;
revoke all on function public.laatste_wint() from public, anon, authenticated;
grant execute on function public.is_lid(uuid) to authenticated;
grant execute on function public.maak_gezin(text, text) to authenticated;
grant execute on function public.word_lid(text, text) to authenticated;
grant execute on function public.verlaat_gezin() to authenticated;

alter table public.gezinnen enable row level security;
alter table public.gezinsleden enable row level security;
alter table public.gezin_items enable row level security;
alter table public.gezin_documenten enable row level security;
alter table public.lid_pogingen enable row level security;

-- Niemand behalve de functies hierboven mag gezinnen of leden aanmaken; lezen enkel binnen het eigen gezin.
create policy "leden lezen hun gezin" on public.gezinnen
  for select to authenticated using (public.is_lid(id));

create policy "leden lezen de leden van hun gezin" on public.gezinsleden
  for select to authenticated using (public.is_lid(gezin_id));
create policy "leden passen hun eigen naam aan" on public.gezinsleden
  for update to authenticated
  using (gebruiker_id = (select auth.uid()))
  with check (gebruiker_id = (select auth.uid()));

create policy "leden lezen items" on public.gezin_items
  for select to authenticated using (public.is_lid(gezin_id));
create policy "leden voegen items toe" on public.gezin_items
  for insert to authenticated with check (public.is_lid(gezin_id));
create policy "leden wijzigen items" on public.gezin_items
  for update to authenticated using (public.is_lid(gezin_id)) with check (public.is_lid(gezin_id));

create policy "leden lezen documenten" on public.gezin_documenten
  for select to authenticated using (public.is_lid(gezin_id));
create policy "leden voegen documenten toe" on public.gezin_documenten
  for insert to authenticated with check (public.is_lid(gezin_id));
create policy "leden wijzigen documenten" on public.gezin_documenten
  for update to authenticated using (public.is_lid(gezin_id)) with check (public.is_lid(gezin_id));

-- lid_pogingen: geen policies = niemand kan er rechtstreeks aan (enkel word_lid).

revoke all on public.gezinnen, public.gezinsleden, public.gezin_items, public.gezin_documenten, public.lid_pogingen from anon;
-- Leden mogen enkel hun eigen naam aanpassen, geen andere kolommen.
revoke update on public.gezinsleden from authenticated;
grant update (naam) on public.gezinsleden to authenticated;

-- ── Live updates ──

alter publication supabase_realtime add table public.gezin_items, public.gezin_documenten, public.gezinsleden;
