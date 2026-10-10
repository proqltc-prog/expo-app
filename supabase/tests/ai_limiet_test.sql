-- Test van de AI-daglimiet (WEEK-31). Verwacht: "ALLE TESTS GESLAAGD (alles teruggedraaid)".
-- Gratis: 5 per 24 uur. Betalend gezin: 30. Verlopen abonnement = gratis.
do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); g uuid; n int; ok boolean; lim int;
begin
  insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at) values
    (a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now()),
    (b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true, now(), now());
  insert into public.gezinnen (naam, code) values ('Test', 'TSTABC') returning id into g;
  insert into public.gezinsleden (gezin_id, gebruiker_id) values (g, b);

  -- gratis toestel a: 5
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  n := 0; for i in 1..5 loop if public.ai_toegestaan() then n := n + 1; end if; end loop;
  ok := public.ai_toegestaan();
  if n <> 5 or ok then raise exception 'FOUT gratis: % toegelaten, 6e = %', n, ok; end if;
  begin perform count(*) from public.ai_gebruik; raise exception 'FOUT tabel leesbaar';
  exception when insufficient_privilege then null; end;
  begin insert into public.gezin_abonnement values (g, now() + interval '1 year'); raise exception 'FOUT app kan abonnement zetten';
  exception when insufficient_privilege then null; end;
  reset role;

  -- toestel b in gezin met verlopen abonnement: 5
  insert into public.gezin_abonnement values (g, now() - interval '1 day');
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  lim := public.ai_daglimiet();
  if lim <> 5 then raise exception 'FOUT verlopen abonnement: limiet %', lim; end if;
  reset role;

  -- lopend abonnement: 30
  update public.gezin_abonnement set betalend_tot = now() + interval '1 month' where gezin_id = g;
  set local role authenticated;
  if (select count(*) from public.gezin_abonnement) <> 1 then raise exception 'FOUT lid ziet abonnement niet'; end if;
  n := 0; for i in 1..30 loop if public.ai_toegestaan() then n := n + 1; end if; end loop;
  ok := public.ai_toegestaan();
  if n <> 30 or ok then raise exception 'FOUT betalend: % toegelaten, 31e = %', n, ok; end if;
  reset role;

  -- a (geen lid) ziet het abonnement van het gezin niet
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  if (select count(*) from public.gezin_abonnement) <> 0 then raise exception 'FOUT niet-lid ziet abonnement'; end if;
  reset role;

  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  begin perform public.ai_toegestaan(); raise exception 'FOUT anon mag aanroepen';
  exception when insufficient_privilege then null; end;
  reset role;
  raise exception 'ALLE TESTS GESLAAGD (alles teruggedraaid)';
end $$;
