-- Test van de gezinsruimte (WEEK-8): toegangsregels (RLS), laatste-wint en de pogingenlimiet.
-- Uitvoeren in de SQL-editor van Supabase (of via de Supabase-tool). Alles gebeurt in één blok
-- dat op het einde een fout gooit, zodat niets bewaard blijft.
-- Verwacht resultaat: "ALLE TESTS GESLAAGD (alles teruggedraaid)". Elke andere melding begint met "FOUT".
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid();
  g public.gezinnen; g2 public.gezinnen; n int; d jsonb; fout text;
begin
  insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
  select x, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now() from unnest(array[a,b,c]) x;

  -- A maakt een gezin en een item
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  g := public.maak_gezin('Testgezin', 'Maarten');
  if g.code !~ '^[A-HJ-NP-Z2-9]{6}$' then raise exception 'FOUT code %', g.code; end if;
  insert into public.gezin_items (gezin_id, soort, id, data, bijgewerkt_op) values (g.id, 'lijst', 'pasta', '{"v":2}', '2026-10-10T10:00:00Z');
  select count(*) into n from public.gezin_items; if n <> 1 then raise exception 'FOUT A ziet % items', n; end if;
  begin g2 := public.maak_gezin('Tweede', 'x'); raise exception 'FOUT tweede gezin toegelaten';
  exception when others then if sqlerrm <> 'al_lid' then raise; end if; end;

  -- C is geen lid: ziet niets, kan niets schrijven, kan zichzelf niet toevoegen
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.gezin_items; if n <> 0 then raise exception 'FOUT C ziet items'; end if;
  select count(*) into n from public.gezinnen; if n <> 0 then raise exception 'FOUT C ziet gezinnen'; end if;
  select count(*) into n from public.gezinsleden; if n <> 0 then raise exception 'FOUT C ziet leden'; end if;
  begin
    insert into public.gezin_items (gezin_id, soort, id, data, bijgewerkt_op) values (g.id, 'lijst', 'hack', '{}', now());
    raise exception 'FOUT C kon item schrijven';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.gezinsleden (gezin_id, gebruiker_id) values (g.id, c);
    raise exception 'FOUT C kon zichzelf als lid toevoegen';
  exception when insufficient_privilege then null; end;
  update public.gezin_items set data = '{"hack":1}' where gezin_id = g.id;
  g2 := public.word_lid('ZZZZZZ', 'C');
  if g2.id is not null then raise exception 'FOUT onbekende code aanvaard'; end if;

  -- B wordt lid met de code (kleine letters en spaties mogen) en ziet de gegevens
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  g2 := public.word_lid(' ' || lower(g.code) || ' ', 'Pauline');
  if g2.id is distinct from g.id then raise exception 'FOUT verkeerd gezin'; end if;
  select data into d from public.gezin_items where id = 'pasta';
  if d <> '{"v":2}'::jsonb then raise exception 'FOUT data: %', d; end if;
  select count(*) into n from public.gezinsleden; if n <> 2 then raise exception 'FOUT B ziet % leden', n; end if;

  -- laatste wijziging wint
  update public.gezin_items set data = '{"v":1}', bijgewerkt_op = '2026-10-10T09:00:00Z' where id = 'pasta';
  select data into d from public.gezin_items where id = 'pasta';
  if d <> '{"v":2}'::jsonb then raise exception 'FOUT oudere versie won'; end if;
  insert into public.gezin_items (gezin_id, soort, id, data, bijgewerkt_op) values (g.id, 'lijst', 'pasta', '{"v":3}', '2026-10-10T11:00:00Z')
    on conflict (gezin_id, soort, id) do update set data = excluded.data, verwijderd = excluded.verwijderd, bijgewerkt_op = excluded.bijgewerkt_op;
  select data into d from public.gezin_items where id = 'pasta';
  if d <> '{"v":3}'::jsonb then raise exception 'FOUT nieuwere upsert niet toegepast'; end if;
  insert into public.gezin_items (gezin_id, soort, id, data, bijgewerkt_op) values (g.id, 'lijst', 'pasta', '{"v":0}', '2026-10-10T08:00:00Z')
    on conflict (gezin_id, soort, id) do update set data = excluded.data, verwijderd = excluded.verwijderd, bijgewerkt_op = excluded.bijgewerkt_op;
  select data into d from public.gezin_items where id = 'pasta';
  if d <> '{"v":3}'::jsonb then raise exception 'FOUT oudere upsert won'; end if;

  -- enkel de eigen naam aanpassen
  update public.gezinsleden set naam = 'gehackt' where gebruiker_id = a;
  update public.gezinsleden set naam = 'Pauline D.' where gebruiker_id = b;
  reset role;
  if (select naam from public.gezinsleden where gebruiker_id = a) <> 'Maarten' then raise exception 'FOUT B wijzigde naam van A'; end if;
  if (select naam from public.gezinsleden where gebruiker_id = b) <> 'Pauline D.' then raise exception 'FOUT B kon eigen naam niet wijzigen'; end if;

  -- verlaten: na het laatste lid is alles weg
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.gezin_documenten (gezin_id, sleutel, data, bijgewerkt_op) values (g.id, 'plan', '{"dagen":[]}', now());
  perform public.verlaat_gezin();
  select count(*) into n from public.gezin_items; if n <> 0 then raise exception 'FOUT B ziet nog items na vertrek'; end if;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.verlaat_gezin();
  reset role;
  if exists (select 1 from public.gezinnen where id = g.id) then raise exception 'FOUT gezin bleef bestaan'; end if;
  if exists (select 1 from public.gezin_documenten where gezin_id = g.id) then raise exception 'FOUT documenten bleven bestaan'; end if;

  -- maximaal 10 mislukte pogingen per uur
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  set local role authenticated;
  for i in 1..9 loop perform public.word_lid('YYYYYY'); end loop;
  begin perform public.word_lid('YYYYYY'); fout := 'geen fout'; exception when others then fout := sqlerrm; end;
  if fout <> 'te_veel_pogingen' then raise exception 'FOUT limiet: %', fout; end if;

  raise exception 'ALLE TESTS GESLAAGD (alles teruggedraaid)';
end $$;
