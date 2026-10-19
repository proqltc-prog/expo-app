// De fysieke terugknop van Android (WEEK-128). Pure logica, zonder React.
// Op een scherm binnen de app gaat de knop naar het weekmenu, nooit naar de taalkeuze.
// Op het menu zelf en op het welkomstscherm doet de knop het gewone.

/** Gaat de terugknop op dit pad naar het weekmenu? */
export function gaatNaarMenu(pad: string): boolean {
  const schoon = pad.replace(/\/+$/, '') || '/';
  return schoon !== '/' && schoon !== '/index' && schoon !== '/welkom';
}
