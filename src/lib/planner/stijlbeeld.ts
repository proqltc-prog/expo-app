// Beeld per stijl in het weekmenu (WEEK-73): een gerecht-illustratie met een subtiele landshint.
// Pure logica: de component tekent de vorm en kleuren; hier staat welke hoort bij welke stijl.

/** De illustraties die er zijn. Elke vorm is een eenvoudig gerecht op een bord. */
export type Vorm = 'pasta' | 'wok' | 'kom' | 'schotel' | 'wrap' | 'pastaBasil' | 'bibim' | 'curry' | 'nigiri' | 'toast' | 'stapel' | 'salade';

export type Stijlbeeld = {
  vorm: Vorm;
  /** Het voorbeeldgerecht dat onder de stijlnaam staat. */
  voorbeeld: string;
  /** Drie kleuren van het land: de achtergrond (zacht), en de vlaggenstrook. */
  land: readonly [string, string, string];
};

const BEELDEN: Record<string, Stijlbeeld> = {
  mediterraan: { vorm: 'pasta', voorbeeld: 'Pasta met tomaat en olijven', land: ['#1F5FA8', '#FFFFFF', '#E8C98A'] },
  chinees: { vorm: 'wok', voorbeeld: 'Kip met cashew', land: ['#C8102E', '#F2B63C', '#8F0A1F'] },
  indiaas: { vorm: 'kom', voorbeeld: 'Dal met linzen', land: ['#FF9933', '#FFFFFF', '#138808'] },
  frans: { vorm: 'schotel', voorbeeld: 'Gratin dauphinois', land: ['#002395', '#FFFFFF', '#ED2939'] },
  mexicaans: { vorm: 'wrap', voorbeeld: "Taco's met bonen", land: ['#006847', '#FFFFFF', '#CE1126'] },
  italiaans: { vorm: 'pastaBasil', voorbeeld: 'Risotto met parmezaan', land: ['#008C45', '#FFFFFF', '#CD212A'] },
  koreaans: { vorm: 'bibim', voorbeeld: 'Bibimbap', land: ['#003478', '#C60C30', '#17201A'] },
  thais: { vorm: 'curry', voorbeeld: 'Groene kerrie met rijst', land: ['#2D2A4A', '#FFFFFF', '#A51931'] },
  japans: { vorm: 'nigiri', voorbeeld: 'Teriyaki-zalm', land: ['#FFFFFF', '#BC002D', '#FFFFFF'] },
  belgisch: { vorm: 'schotel', voorbeeld: 'Stoofvlees met friet', land: ['#17201A', '#FAE042', '#ED2939'] },
  hartig: { vorm: 'toast', voorbeeld: 'Croque met kaas en ham', land: ['#B9733A', '#F4DDAA', '#7A4E26'] },
  zoet: { vorm: 'stapel', voorbeeld: 'Pannenkoeken met fruit', land: ['#E77FA0', '#FBE3EA', '#B8336A'] },
};

/** Het beeld van een stijl, of undefined als de stijl er geen heeft. */
export function stijlbeeld(id: string): Stijlbeeld | undefined {
  return BEELDEN[id];
}

/** Alle stijl-id's met een beeld. */
export const STIJLBEELD_IDS: string[] = Object.keys(BEELDEN);

/**
 * Welk beeld bij een recept van de planner hoort. De planner kent de vijf databasestijlen,
 * de keuzes in het weekmenu zijn fijner. Daarom krijgt elke databasestijl één vertegenwoordiger.
 */
const BEELD_VOOR_DB_STIJL: Record<string, string> = {
  mediterraan: 'mediterraan',
  italiaans: 'italiaans',
  mexicaans: 'mexicaans',
  aziatisch: 'chinees',
  klassiek: 'belgisch',
  thais: 'thais',
  japans: 'japans',
  koreaans: 'koreaans',
};

/** Het stijlbeeld voor een recept met deze eerste databasestijl, of undefined als er geen is. */
export function beeldVoorReceptStijl(stijl: string | undefined): string | undefined {
  return stijl ? BEELD_VOOR_DB_STIJL[stijl] : undefined;
}
