// Instellingen uit omgevingsvariabelen. Expo zet EXPO_PUBLIC_*-variabelen tijdens het bouwen in de app.
// Zet ze in een bestand `.env.local` (wordt niet gecommit), bv.:
//   EXPO_PUBLIC_PLANNER_URL=https://<project>.supabase.co/functions/v1/plan-week
//   EXPO_PUBLIC_PLANNER_KEY=<publieke anon-sleutel van Supabase>
import type { AiInstelling } from '@/lib/planner/ai';

export const AI: AiInstelling = {
  url: process.env.EXPO_PUBLIC_PLANNER_URL || undefined,
  sleutel: process.env.EXPO_PUBLIC_PLANNER_KEY || undefined,
};
