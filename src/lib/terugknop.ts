// De fysieke terugknop van Android (WEEK-128). Pure logica, zonder React.
// Op een scherm binnen de app gaat de knop naar het weekmenu, nooit naar de taalkeuze.
// Op het menu zelf en op het welkomstscherm doet de knop het gewone.
import { scanTerug } from '@/lib/scanBestemming';

/** Gaat de terugknop op dit pad naar het weekmenu? */
export function gaatNaarMenu(pad: string): boolean {
  const schoon = pad.replace(/\/+$/, '') || '/';
  return schoon !== '/' && schoon !== '/index' && schoon !== '/welkom';
}

/**
 * WEEK-142: op het weekmenu zelf sluit de terugknop de app, in plaats van terug te gaan naar de taalkeuze
 * die onder het menu in de stapel staat.
 */
export function sluitAppOp(pad: string): boolean {
  const schoon = pad.replace(/\/+$/, '') || '/';
  return schoon === '/' || schoon === '/index';
}

/**
 * WEEK-321: waar de terugknop naartoe gaat. Vanuit de scanner terug naar waar je scande (Boodschappen of In huis),
 * nu de scanner geen eigen tab meer heeft; anders naar het weekmenu.
 */
export function terugBestemming(pad: string, van: string | undefined): string {
  const schoon = pad.replace(/\/+$/, '') || '/';
  return schoon === '/scan' ? (scanTerug(van) ?? '/') : '/';
}
