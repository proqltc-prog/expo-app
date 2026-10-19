-- WEEK-118: de app gebruikt geen AI meer (WEEK-116). Verwijdert de AI-limiet objecten.
-- Recepten in de tabel recepten blijven behouden.
drop function if exists public.ai_toegestaan();
drop function if exists public.ai_gebruikt_vandaag();
drop function if exists public.ai_daglimiet();
drop function if exists public.ai_tegoed();
drop function if exists public.begin_van_vandaag();
drop table if exists public.ai_gebruik;
