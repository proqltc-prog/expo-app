// Instellingen. Overschrijfbaar met EXPO_PUBLIC_*-variabelen in een bestand `.env.local` (wordt niet gecommit).
// Expo zet die variabelen tijdens het bouwen in de app.

/**
 * Supabase-project voor de gezinsruimte (WEEK-8).
 * De publieke anon-sleutel is bedoeld om in de app te staan: de toegang tot de gegevens
 * wordt in de database afgeschermd (row level security), niet door deze sleutel geheim te houden.
 * (De anon-sleutel werkt met elke versie van supabase-js, ook voor live updates; de nieuwere
 * "sb_publishable_…"-sleutel kan later in de plaats komen.)
 * Overschrijfbaar met EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY (leeg = zonder gezinsruimte).
 */
export const SUPABASE = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://dxhhjqzxdpmlzgjkhaoj.supabase.co',
  sleutel:
    process.env.EXPO_PUBLIC_SUPABASE_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4aGhqcXp4ZHBtbHpnamtoYW9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2MjQxMzAsImV4cCI6MjEwNzIwMDEzMH0.6oDAo82vTrqZGAAK5vzKgFnCUr5h6X_EJbHJaCEvOQA',
};
