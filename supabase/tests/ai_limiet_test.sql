-- Test van de AI-daglimiet (WEEK-31, WEEK-33, WEEK-54). Verwacht: "ALLE TESTS GESLAAGD (alles teruggedraaid)".
-- Gratis voor iedereen: 1 per kalenderdag per gezin. Toestel zonder gezin: eigen teller.
do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid(); g uuid; t json;
begin
  insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at) values
    (a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()),
    (b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()),
    (c, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now());
  insert into public.gezinnen (naam, code) values ('Test', 'TSTABC') returning id into g;
  insert into public.gezinsleden (gezin_id, gebruiker_id) values (g, b), (g, c);

  -- a zonder gezin: 1 per dag
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  t := public.ai_tegoed();
  if (t->>'limiet')::int <> 1 or (t->>'gebruikt')::int <> 0 then raise exception 'FOUT tegoed vooraf: %', t; end if;
  if not public.ai_toegestaan() then raise exception 'FOUT eerste aanvraag geweigerd'; end if;
  if public.ai_toegestaan() then raise exception 'FOUT tweede aanvraag toegelaten (gratis)'; end if;
  t := public.ai_tegoed();
  if (t->>'gebruikt')::int <> 1 then raise exception 'FOUT tegoed na: %', t; end if;
  begin perform count(*) from public.ai_gebruik; raise exception 'FOUT tabel leesbaar';
  exception when insufficient_privilege then null; end;
  reset role;

  -- gisteren telt niet mee
  update public.ai_gebruik set op = public.begin_van_vandaag() - interval '1 minute' where gebruiker_id = a;
  set local role authenticated;
  if not public.ai_toegestaan() then raise exception 'FOUT aanvraag van gisteren telde mee'; end if;
  reset role;

  -- gezin (b en c): samen 1 per dag
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  if not public.ai_toegestaan() then raise exception 'FOUT gezin eerste aanvraag'; end if;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  set local role authenticated;
  if public.ai_toegestaan() then raise exception 'FOUT tweede gezinslid kreeg extra aanvraag'; end if;
  if public.ai_daglimiet() <> 1 then raise exception 'FOUT daglimiet is niet 1'; end if;
  reset role;

  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  begin perform public.ai_toegestaan(); raise exception 'FOUT anon mag aanroepen';
  exception when insufficient_privilege then null; end;
  begin perform public.ai_tegoed(); raise exception 'FOUT anon mag tegoed lezen';
  exception when insufficient_privilege then null; end;
  reset role;
  raise exception 'ALLE TESTS GESLAAGD (alles teruggedraaid)';
end $$;
