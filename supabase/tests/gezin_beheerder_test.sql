-- Test van het beheer van de gezinsruimte (WEEK-65): beheerder benoemen, verlaten met opvolger,
-- verlaten zonder opvolger geweigerd, en opheffen. Plus een regressie: gewone leden verlaten nog steeds.
-- Uitvoeren in de SQL-editor van Supabase (of via de Supabase-tool). Alles gebeurt in één blok
-- dat op het einde een fout gooit, zodat niets bewaard blijft.
-- Verwacht resultaat: "ALLE TESTS GESLAAGD (alles teruggedraaid)". Elke andere melding begint met "FOUT".
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid();
  g public.gezinnen; n int; fout text;
begin
  insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at)
  select x, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now() from unnest(array[a,b,c]) x;

  -- A maakt het gezin: A is beheerder; B en C treden toe
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  g := public.maak_gezin('Testgezin', 'A');
  if (select beheerder_id from public.gezinnen where id = g.id) <> a then raise exception 'FOUT maker is niet beheerder'; end if;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.word_lid(g.code, 'B');
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.word_lid(g.code, 'C');

  -- B (geen beheerder) kan niet benoemen, niet opheffen, niet met opvolger verlaten
  begin perform public.maak_beheerder(c); raise exception 'FOUT lid mocht beheerder benoemen';
  exception when others then if sqlerrm <> 'geen_beheerder' then raise; end if; end;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin perform public.hef_gezin_op(); raise exception 'FOUT lid mocht opheffen';
  exception when others then if sqlerrm <> 'geen_beheerder' then raise; end if; end;

  -- Gewoon lid B verlaat zonder opvolger-eis (regressie)
  perform public.verlaat_gezin();
  reset role;
  select count(*) into n from public.gezinsleden where gezin_id = g.id; if n <> 2 then raise exception 'FOUT B niet weg, leden %', n; end if;

  -- A (beheerder) verlaat zonder opvolger: geweigerd
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin perform public.verlaat_gezin(); raise exception 'FOUT beheerder mocht verlaten zonder opvolger';
  exception when others then if sqlerrm <> 'opvolger_nodig' then raise; end if; end;

  -- A maakt C beheerder, en verlaat daarna: nu geen opvolger meer nodig; A is weg, C blijft beheerder
  perform public.maak_beheerder(c);
  if (select beheerder_id from public.gezinnen where id = g.id) <> c then raise exception 'FOUT C is geen beheerder'; end if;
  perform public.verlaat_gezin();
  reset role;
  if (select beheerder_id from public.gezinnen where id = g.id) <> c then raise exception 'FOUT beheerder na verlaten'; end if;

  -- C (nu beheerder, alleen) verlaat met opvolger: geweigerd als opvolger geen lid is
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin perform public.verlaat_gezin_met_opvolger(a); raise exception 'FOUT geen-lid als opvolger toegelaten';
  exception when others then if sqlerrm <> 'geen_opvolger' then raise; end if; end;

  -- C heft het gezin op: het verdwijnt voor iedereen
  perform public.hef_gezin_op();
  reset role;
  select count(*) into n from public.gezinnen where id = g.id; if n <> 0 then raise exception 'FOUT gezin nog aanwezig'; end if;

  raise exception 'ALLE TESTS GESLAAGD (alles teruggedraaid)';
exception when others then
  if sqlerrm = 'ALLE TESTS GESLAAGD (alles teruggedraaid)' then raise; end if;
  raise exception '%', sqlerrm;
end $$;
