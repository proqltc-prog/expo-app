import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { Afdeling, ingredientNaam } from '@/data/ingredienten';
import { Eenheid, Soort, STIJLEN, StijlCode } from '@/data/recept';
import { SEIZOENEN, Seizoen } from '@/data/seizoenen';
import type { Sleutel } from '@/i18n';
import {
  afdelingVanEigen,
  bewaarEigen,
  EENHEDEN,
  EigenIngredient,
  EigenRecept,
  Fout,
  GEZIN_STIJL,
  isExactBekend,
  nieuweId,
  nogGeldigeFouten,
  standaardEenheid,
  SOORTEN,
  StijlKeuze,
  valideer,
  verwijderEigen,
  zoekIngredienten,
} from '@/lib/eigenrecepten';
import { toonGezinsnaam } from '@/lib/gezinbeheer';
import { normaliseer } from '@/lib/frigoSheets';
import type { LosWijziging } from '@/lib/frigo';
import { LosPopup, PopupOpties } from '@/ui/losPopup';
import { binnenKooktijd, KOOKTIJD_BEREIK, KOOKTIJD_SCHATTING_STANDAARD, KOOKTIJDEN, KooktijdCode, kooktijdSchattingen, kooktijdVan, MAX_KOOKTIJD_MIN, minutenVoorKooktijd } from '@/lib/kooktijd';
import { terugPad } from '@/lib/terug';
import { laadEigenRecepten, wijzigEigenRecepten } from '@/opslag/eigenRecepten';
import { laadDbRecepten } from '@/opslag/receptenbank';
import { laadGezin } from '@/opslag/sync';
import { useTaal } from '@/ui/taal';
import { NakijkRegel, omrekenen, ontleedRegel, RuwRecept, verwerkRecept, voegSamen, zoekLink } from '@/lib/receptLink';
import { haalReceptOp, LinkFout } from '@/opslag/receptLink';
import type { FotoFout } from '@/lib/receptFoto';
import { FotoBron, kiesFoto, leesReceptUitFoto } from '@/opslag/receptFoto';
import { meldOvergeslagen } from '@/opslag/ingredientMelding';
import { koppelOnbekend } from '@/opslag/ingredientKoppel';
import { koppelingenUit, type KoppelResultaat } from '@/lib/ingredientKoppel';

// Recept bewerken (WEEK-192): naam, soort, kooktijd, stijl (ook de gezinsstijl), seizoen (optioneel),
// ingrediënten uit de ingrediëntenlijst van de app met hoeveelheid en eenheid, en de bereiding stap voor stap.
// WEEK-245: enkel ingrediënten die de app kent; je geeft enkel de hoeveelheid in (voor één volwassene).
// WEEK-199: de kooktijd kies je als snel, gemiddeld of uitgebreid (met het tijdsbestek); de minuten worden vooraf
// ingevuld met de geschatte tijd uit de databank en blijven aanpasbaar tot de bovengrens van een uur.
// WEEK-200: een ingrediënt voeg je toe zoals een product op de lijst: naam ingeven, op de plus tikken (of een treffer
// kiezen) en in de popup de hoeveelheid, de eenheid en de categorie invullen. Tikken op een ingrediënt opent de popup opnieuw.
// Voor een ingrediënt uit de app liggen de eenheid en de categorie vast, zoals op de lijst en in de frigo.

const KLEUR = '#2e7d4f';

/** Een ingrediënt in het formulier; de hoeveelheid komt uit de popup en is altijd ingevuld. */
type Rij = EigenIngredient;

/** Waarvoor de popup open staat: een nieuw ingrediënt (met of zonder code) of een bestaande rij. */
type PopupDoel = { index?: number; code?: EigenIngredient['code']; naam: string; nakijk?: number };

/** Wat er na het inlezen via een link (WEEK-247) of een foto (WEEK-251) getoond wordt. */
type LinkMelding = { bron: 'link' | 'foto'; aantal: number; personen: number; vanSite: boolean; teLang?: number; nieuw?: number };

/** WEEK-254: waarom opzoeken of toevoegen van een ingrediënt niet lukte. */
type NieuwFout = 'geen' | 'druk' | 'limiet' | 'niet_bereikbaar' | 'geen_verbinding';

const FOUT_TEKST: Record<Fout, string> = {
  naam: 'recept.fout.naam',
  minuten: 'recept.fout.minuten',
  ingredienten: 'recept.fout.ingredienten',
  stappen: 'recept.fout.stappen',
};

export default function EigenReceptScherm() {
  const { t, taal } = useTaal();
  const params = useLocalSearchParams<{ id?: string; terug?: string }>();
  const id = params.id;
  // WEEK-218: terug naar het scherm vanwaar dit geopend werd (verborgen tab: router.back() ging naar het beginscherm).
  const terug = () => router.navigate(terugPad(params.terug, '/mijn-recepten') as never);
  const navigation = useNavigation();

  const [geladen, setGeladen] = useState(!id);
  const [bestaand, setBestaand] = useState<EigenRecept | undefined>(undefined);
  const [naam, setNaam] = useState('');
  const [soort, setSoort] = useState<Soort>('vegetarisch');
  // WEEK-218: de minuten volgen uit de gekozen kooktijd (snel als start); er is geen minutenvak meer.
  const [minuten, setMinuten] = useState(String(KOOKTIJD_SCHATTING_STANDAARD.snel));
  const [stijlen, setStijlen] = useState<StijlKeuze[]>([GEZIN_STIJL]);
  const [seizoenen, setSeizoenen] = useState<Seizoen[]>([]);
  const [rijen, setRijen] = useState<Rij[]>([]);
  const [stappen, setStappen] = useState<string[]>(['']);
  const [zoek, setZoek] = useState('');
  const [popup, setPopup] = useState<PopupOpties | null>(null);
  const [popupDoel, setPopupDoel] = useState<PopupDoel | null>(null);
  const [gezinNaam, setGezinNaam] = useState<string | undefined>(undefined);
  const [fouten, setFouten] = useState<Fout[]>([]);
  const [bezig, setBezig] = useState(false);
  // WEEK-246: bevestiging van het verwijderen in de pagina zelf (een Alert met knoppen werkt niet op het web).
  const [bevestigVerwijder, setBevestigVerwijder] = useState(false);
  // De geschatte tijd per kooktijd: het gemiddelde van de databankrecepten; zolang die niet geladen zijn, de vaste schatting.
  // WEEK-247: een recept inlezen via een link.
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState('');
  const [linkBezig, setLinkBezig] = useState(false);
  const [linkFout, setLinkFout] = useState<LinkFout | undefined>(undefined);
  const [linkMelding, setLinkMelding] = useState<LinkMelding | undefined>(undefined);
  const [nakijken, setNakijken] = useState<NakijkRegel[]>([]);
  // WEEK-251: een recept inlezen via een foto (Google Gemini via de Supabase-functie recept-foto).
  const [fotoOpen, setFotoOpen] = useState(false);
  const [fotoBezig, setFotoBezig] = useState(false);
  const [fotoFout, setFotoFout] = useState<FotoFout | 'geenToestemming' | undefined>(undefined);
  // WEEK-254: een onbekend ingrediënt laten opzoeken of toevoegen (Gemini, via de Supabase-functie ingredient-koppel).
  const [nieuwBezig, setNieuwBezig] = useState(false);
  const [nieuwFout, setNieuwFout] = useState<NieuwFout | undefined>(undefined);
  const [schattingen, setSchattingen] = useState<Record<KooktijdCode, number>>(KOOKTIJD_SCHATTING_STANDAARD);

  useEffect(() => {
    laadDbRecepten()
      .then((recepten) => setSchattingen(kooktijdSchattingen(recepten.map((r) => r.kooktijdMin))))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    laadGezin().then((g) => setGezinNaam(g?.naam || undefined)).catch(() => setGezinNaam(undefined));
    laadEigenRecepten().then((lijst) => {
      const r = id ? lijst.find((x) => x.id === id) : undefined;
      setBestaand(r);
      if (r) {
        setNaam(r.naam);
        setSoort(r.soort);
        setMinuten(String(r.minuten));
        setStijlen([...(r.gezinStijl ? [GEZIN_STIJL] : []), ...r.stijlen]);
        setSeizoenen([...(r.seizoenen ?? [])]);
        setRijen(r.ingredienten.map((i) => ({ ...i })));
        setStappen(r.stappen.length ? [...r.stappen] : ['']);
      }
      setGeladen(true);
    });
  }, [id]);

  // WEEK-203: de titel staat één keer, in de kop van het scherm: "Nieuw recept" of "Recept bewerken".
  useLayoutEffect(() => {
    navigation.setOptions({ title: t(bestaand ? 'recept.titelBewerk' : 'recept.titelNieuw') });
  }, [navigation, bestaand, t]);

  // De gezinsstijl heet naar de gezinsruimte; zonder eigen naam heet hij vertaald "Ons gezin" (WEEK-243).
  const gezinLabel = toonGezinsnaam(gezinNaam, t('recept.stijlGezinZonderNaam'));

  // WEEK-245: enkel ingrediënten die de app kent (in 4 talen); eigen ingrediënten kunnen niet meer.
  const zoekTreffers = useMemo(() => (zoek.trim() ? zoekIngredienten(zoek, taal) : []), [zoek, taal]);
  const nietsGevonden = zoek.trim().length > 0 && zoekTreffers.length === 0;

  /** Opent de popup voor een ingrediënt: met code liggen eenheid en categorie vast (zoals de lijst en de frigo), anders kies je ze. */
  const openPopup = (doel: PopupDoel, bestaande?: Rij) => {
    const code = doel.code;
    const eenheid = bestaande?.eenheid ?? standaardEenheid(code);
    const afdeling = code ? afdelingVanEigen({ code }) : bestaande?.afdeling;
    setPopupDoel(doel);
    setPopup({
      sleutel: `${doel.index ?? 'nieuw'}-${Date.now()}`,
      titel: t(doel.index === undefined ? 'recept.popupNieuw' : 'recept.popupBewerk'),
      naam: doel.naam,
      hoeveelheid: bestaande?.hoeveelheid,
      eenheid,
      afdeling: afdeling ?? 'overig',
      // WEEK-245: enkel de hoeveelheid is in te geven; eenheid en categorie liggen vast.
      toonEenheid: false,
      toonCategorie: false,
      toonVasteCategorie: !!code,
      toonHoudbaar: false,
      eenheden: EENHEDEN,
      hoeveelheidVerplicht: true,
      accent: KLEUR,
    });
  };

  const sluitPopup = () => {
    setPopup(null);
    setPopupDoel(null);
  };

  /** De plus: een treffer die exact zo heet, of de enige treffer. Een onbekende naam kan niet (WEEK-245). */
  const plus = () => {
    const naam = zoek.trim();
    if (!naam) return;
    const exact = isExactBekend(naam, zoekTreffers) ? zoekTreffers.find((k) => normaliseer(k.naam) === normaliseer(naam)) : undefined;
    const keuze = exact ?? (zoekTreffers.length === 1 ? zoekTreffers[0] : undefined);
    if (keuze) openPopup({ code: keuze.code, naam: keuze.naam });
  };

  const bewaarPopup = (w: LosWijziging) => {
    if (!popupDoel || w.hoeveelheid === undefined) return;
    const code = popupDoel.code;
    const eenheid = (code ? standaardEenheid(code) : w.eenheid && (EENHEDEN as readonly string[]).includes(w.eenheid) ? w.eenheid : 'g') as Eenheid;
    const afdeling: Afdeling | undefined = !code && w.afdeling !== 'overig' ? w.afdeling : undefined;
    const rij: Rij = { ...(code ? { code } : {}), naam: popupDoel.naam, hoeveelheid: w.hoeveelheid, eenheid, ...(afdeling ? { afdeling } : {}) };
    // WEEK-247: een ingrediënt dat al in het recept staat, wordt niet dubbel toegevoegd; de hoeveelheden worden samengeteld.
    setRijen((r) => (popupDoel.index === undefined ? voegSamen(r, rij) : r.map((x, i) => (i === popupDoel.index ? rij : x))));
    if (popupDoel.nakijk !== undefined) {
      const weg = popupDoel.nakijk;
      setNakijken((n) => n.filter((_, i) => i !== weg));
    }
    setZoek('');
    sluitPopup();
  };

  /** WEEK-247: leest het recept van de link in en vult het formulier; wat niet zeker is, komt bij "nog na te kijken". */
  const leesLink = async () => {
    if (linkBezig) return;
    const url = zoekLink(link);
    if (!url) {
      setLinkFout('ongeldige_link');
      return;
    }
    setLinkFout(undefined);
    setLinkBezig(true);
    try {
      const r = await haalReceptOp(url);
      if (!r.ok) {
        setLinkFout(r.fout);
        return;
      }
      await pasToe(r.recept, 'link');
      setLinkOpen(false);
      setLink('');
    } finally {
      setLinkBezig(false);
    }
  };

  /** Vult het formulier met een ingelezen recept (link of foto); wat niet zeker is, komt bij "nog na te kijken". */
  const pasToe = async (recept: RuwRecept, bron: LinkMelding['bron']) => {
    let ingelezen = verwerkRecept(recept, taal);
    // WEEK-254: wat de app niet kent, wordt meteen opgezocht: een bestaand ingrediënt of een nieuw (automatisch toegevoegd).
    let nieuw = 0;
    const onbekend = ingelezen.nakijken.filter((n) => n.reden === 'onbekend');
    if (onbekend.length) {
      const r = await koppelOnbekend(
        onbekend.map((n) => n.naam),
        onbekend[0].taal
      );
      if (r.ok && r.resultaten.some((x) => x.code)) {
        ingelezen = verwerkRecept(recept, taal, koppelingenUit(r.resultaten));
        nieuw = r.resultaten.filter((x) => x.status === 'nieuw').length;
      }
    }
    if (ingelezen.naam) setNaam(ingelezen.naam);
    setSoort(ingelezen.soort);
    const teLang = ingelezen.minuten !== undefined && ingelezen.minuten > MAX_KOOKTIJD_MIN ? ingelezen.minuten : undefined;
    if (ingelezen.minuten !== undefined && !teLang) setMinuten(String(ingelezen.minuten));
    if (ingelezen.stappen.length) setStappen(ingelezen.stappen);
    setRijen((bestaande) => ingelezen.ingredienten.reduce(voegSamen, bestaande));
    setNakijken(ingelezen.nakijken);
    setLinkMelding({ bron, aantal: ingelezen.ingredienten.length, personen: ingelezen.personen, vanSite: ingelezen.personenVanSite, ...(teLang ? { teLang } : {}), ...(nieuw ? { nieuw } : {}) });
  };

  /** WEEK-251: een foto nemen of kiezen en laten lezen; één vraag per foto. */
  const leesFoto = async (bron: FotoBron) => {
    if (fotoBezig) return;
    setFotoFout(undefined);
    const foto = await kiesFoto(bron).catch(() => undefined);
    if (foto === 'geen_toestemming') {
      setFotoFout('geenToestemming');
      return;
    }
    if (!foto) return;
    setFotoBezig(true);
    try {
      const r = await leesReceptUitFoto(foto);
      if (!r.ok) {
        setFotoFout(r.fout);
        return;
      }
      await pasToe(r.recept, 'foto');
      setFotoOpen(false);
    } finally {
      setFotoBezig(false);
    }
  };

  /** Een regel om na te kijken: het voorstel gebruiken (met hoeveelheid meteen, anders via de popup). */
  const gebruikNakijk = (index: number) => {
    const n = nakijken[index];
    if (!n?.code) return;
    const naamApp = ingredientNaam(n.code, taal);
    if (n.hoeveelheid !== undefined) {
      const rij: Rij = { code: n.code, naam: naamApp, hoeveelheid: n.hoeveelheid, eenheid: standaardEenheid(n.code) };
      setRijen((r) => voegSamen(r, rij));
      setNakijken((l) => l.filter((_, i) => i !== index));
    } else {
      openPopup({ code: n.code, naam: naamApp, nakijk: index });
    }
  };
  const haalNakijkWeg = (index: number) => setNakijken((l) => l.filter((_, i) => i !== index));
  /** Overslaan; een onbekend ingrediënt wordt anoniem gemeld, zodat het later aan de lijst toegevoegd kan worden (WEEK-248). */
  const slaNakijkOver = (index: number) => {
    const n = nakijken[index];
    if (n) void meldOvergeslagen(n);
    haalNakijkWeg(index);
  };
  /** Zelf zoeken: de naam komt in het zoekveld en de regel verdwijnt uit de lijst om na te kijken (zonder melding). */
  const zoekNakijk = (index: number) => {
    setZoek(nakijken[index]?.naam ?? '');
    haalNakijkWeg(index);
  };

  /** De reden waarom een opzoeking niets bruikbaars gaf, voor de melding. */
  const redenVan = (r: { ok: true; resultaten: KoppelResultaat[] } | { ok: false; fout: string }): NieuwFout => {
    if (!r.ok) return r.fout === 'limiet' ? 'limiet' : r.fout === 'geen_verbinding' ? 'geen_verbinding' : 'niet_bereikbaar';
    const s0 = r.resultaten[0]?.status;
    return s0 === 'druk' ? 'druk' : s0 === 'limiet' ? 'limiet' : 'geen';
  };

  /** WEEK-254: een onbekende regel opnieuw laten opzoeken (bv. als Gemini eerst overbelast was). */
  const zoekNakijkOpnieuw = async (index: number) => {
    const n = nakijken[index];
    if (!n || nieuwBezig) return;
    setNieuwFout(undefined);
    setNieuwBezig(true);
    try {
      const r = await koppelOnbekend([n.naam], n.taal);
      const code = r.ok ? r.resultaten.find((x) => x.code)?.code : undefined;
      if (!code) {
        setNieuwFout(redenVan(r));
        return;
      }
      const hoeveelheid = omrekenen(ontleedRegel(n.tekst), code, linkMelding?.personen ?? 1);
      if (hoeveelheid !== undefined) {
        setRijen((rij) => voegSamen(rij, { code, naam: ingredientNaam(code, taal), hoeveelheid, eenheid: standaardEenheid(code) }));
        haalNakijkWeg(index);
      } else {
        setNakijken((l) => l.map((x, i) => (i === index ? { ...x, reden: 'hoeveelheid', code } : x)));
      }
    } finally {
      setNieuwBezig(false);
    }
  };

  /** WEEK-254: een ingrediënt dat de zoeklijst niet kent, laten opzoeken of toevoegen; daarna de hoeveelheid invullen. */
  const voegNieuwToe = async () => {
    const naamNieuw = zoek.trim();
    if (!naamNieuw || nieuwBezig) return;
    setNieuwFout(undefined);
    setNieuwBezig(true);
    try {
      const r = await koppelOnbekend([naamNieuw], taal);
      const code = r.ok ? r.resultaten.find((x) => x.code)?.code : undefined;
      if (!code) {
        setNieuwFout(redenVan(r));
        return;
      }
      setZoek('');
      openPopup({ code, naam: ingredientNaam(code, taal) });
    } finally {
      setNieuwBezig(false);
    }
  };

  const verwijderRij = (index: number) => setRijen((r) => r.filter((_, i) => i !== index));

  /** Wat een rij toont naast de naam: hoeveelheid, eenheid en categorie. */
  const rijDetail = (r: Rij) => {
    const afd = afdelingVanEigen(r);
    return `${String(r.hoeveelheid).replace('.', ',')} ${t(`recept.eenheid.${r.eenheid}`)} · ${t(`afdeling.${afd ?? 'overig'}` as Sleutel)}`;
  };

  const wijzigStap = (index: number, tekst: string) => setStappen((s) => s.map((x, i) => (i === index ? tekst : x)));

  // Een nieuwe stap alleen als de laatste ingevuld is.
  const laatsteGevuld = stappen.length > 0 && stappen[stappen.length - 1].trim().length > 0;
  const voegStapToe = () => {
    if (laatsteGevuld) setStappen((s) => [...s, '']);
  };

  // De gekozen kooktijd volgt uit de minuten; een chip vult de geschatte tijd van die kooktijd in.
  const minutenGetal = Number(minuten.trim());
  const gekozenKooktijd: KooktijdCode | undefined = minuten.trim() && binnenKooktijd(minutenGetal) ? kooktijdVan(minutenGetal) : undefined;
  const kiesKooktijd = (k: KooktijdCode) => setMinuten(String(minutenVoorKooktijd(k, schattingen)));

  const toggleStijl = (k: StijlKeuze) =>
    setStijlen((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  const toggleSeizoen = (k: Seizoen) =>
    setSeizoenen((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  const bewaar = async () => {
    if (bezig) return;
    const resultaat = valideer({ naam, soort, minuten, stijlen, seizoenen, ingredienten: rijen, stappen });
    if (!resultaat.ok) {
      setFouten(resultaat.fouten);
      return;
    }
    setFouten([]);
    setBezig(true);
    try {
      const nu = new Date();
      const recept: EigenRecept = {
        ...resultaat.waarden,
        id: bestaand?.id ?? nieuweId(nu),
        bijgewerkt: nu.toISOString(),
      };
      await wijzigEigenRecepten((lijst) => bewaarEigen(lijst, recept));
      terug();
    } finally {
      setBezig(false);
    }
  };

  const verwijder = async () => {
    if (!bestaand) return;
    setBevestigVerwijder(false);
    await wijzigEigenRecepten((lijst) => verwijderEigen(lijst, bestaand.id));
    terug();
  };

  if (!geladen) return null;

  // WEEK-246: een getoonde melding verdwijnt zodra het probleem opgelost is.
  const getoond = nogGeldigeFouten(fouten, { naam, soort, minuten, stijlen, seizoenen, ingredienten: rijen, stappen });
  const fout = (f: Fout) => (getoond.includes(f) ? <Text style={s.fout}>{t(FOUT_TEKST[f] as never, { max: MAX_KOOKTIJD_MIN })}</Text> : null);

  return (
    <ScrollView contentContainerStyle={s.scherm} keyboardShouldPersistTaps="handled">
      {/* WEEK-245: de hoeveelheden zijn voor één volwassene; de app rekent om voor het gezin. */}
      <View style={s.uitleg}>
        <Text style={s.uitlegTekst}>{t('recept.uitlegVolwassene')}</Text>
      </View>

      {/* WEEK-247: een recept inlezen via de link van een receptensite. */}
      {!bestaand && !linkOpen && !fotoOpen && (
        <Pressable style={s.linkKnop} onPress={() => setLinkOpen(true)} accessibilityRole="button">
          <Ionicons name="link-outline" size={18} color={KLEUR} />
          <Text style={s.linkKnopTekst}>{t('recept.link.knop')}</Text>
        </Pressable>
      )}
      {/* WEEK-251: een recept inlezen via een foto. */}
      {!bestaand && !linkOpen && !fotoOpen && (
        <Pressable style={s.linkKnop} onPress={() => setFotoOpen(true)} accessibilityRole="button">
          <Ionicons name="camera-outline" size={18} color={KLEUR} />
          <Text style={s.linkKnopTekst}>{t('recept.foto.knop')}</Text>
        </Pressable>
      )}
      {!bestaand && fotoOpen && (
        <View style={s.linkVak}>
          <Text style={s.linkUitleg}>{t('recept.foto.uitleg')}</Text>
          {fotoFout && <Text style={s.fout}>{t(fotoFout === 'geenToestemming' ? 'recept.foto.geenToestemming' : (`recept.foto.fout.${fotoFout}` as Sleutel))}</Text>}
          {fotoBezig ? (
            <View style={s.fotoBezig} accessibilityLiveRegion="polite">
              <ActivityIndicator color={KLEUR} />
              <Text style={s.linkUitleg}>{t('recept.foto.bezig')}</Text>
            </View>
          ) : (
            <View style={s.knoppen}>
              <Pressable style={s.annuleer} onPress={() => leesFoto('camera')} accessibilityRole="button">
                <Text style={s.annuleerTekst}>{t('recept.foto.camera')}</Text>
              </Pressable>
              <Pressable style={s.annuleer} onPress={() => leesFoto('galerij')} accessibilityRole="button">
                <Text style={s.annuleerTekst}>{t('recept.foto.galerij')}</Text>
              </Pressable>
            </View>
          )}
          <Pressable onPress={() => { setFotoOpen(false); setFotoFout(undefined); }} disabled={fotoBezig} accessibilityRole="button" style={s.fotoAnnuleer}>
            <Text style={s.annuleerTekst}>{t('recept.annuleer')}</Text>
          </Pressable>
        </View>
      )}
      {!bestaand && linkOpen && (
        <View style={s.linkVak}>
          <Text style={s.linkUitleg}>{t('recept.link.uitleg')}</Text>
          <TextInput
            style={s.veld}
            value={link}
            onChangeText={(x) => {
              setLink(x);
              setLinkFout(undefined);
            }}
            onSubmitEditing={leesLink}
            placeholder="https://"
            accessibilityLabel={t('recept.link.veld')}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!linkBezig}
          />
          {linkFout && <Text style={s.fout}>{t(`recept.link.fout.${linkFout}` as Sleutel)}</Text>}
          <View style={s.knoppen}>
            <Pressable style={s.annuleer} onPress={() => setLinkOpen(false)} disabled={linkBezig} accessibilityRole="button">
              <Text style={s.annuleerTekst}>{t('recept.annuleer')}</Text>
            </Pressable>
            <Pressable
              style={[s.bewaar, (linkBezig || !link.trim()) && { opacity: 0.6 }]}
              onPress={leesLink}
              disabled={linkBezig || !link.trim()}
              accessibilityRole="button"
              accessibilityLabel={t(linkBezig ? 'recept.link.bezig' : 'recept.link.lees')}
            >
              {linkBezig ? <ActivityIndicator color="#fff" /> : <Text style={s.bewaarTekst}>{t('recept.link.lees')}</Text>}
            </Pressable>
          </View>
        </View>
      )}
      {linkMelding && (
        <View style={s.uitleg}>
          <Text style={s.uitlegTekst}>{t('recept.link.klaar', { aantal: linkMelding.aantal })}</Text>
          <Text style={s.uitlegTekst}>{t(linkMelding.vanSite ? 'recept.link.personen' : linkMelding.bron === 'foto' ? 'recept.foto.personenGeschat' : 'recept.link.personenGeschat', { n: linkMelding.personen })}</Text>
          {linkMelding.teLang !== undefined && <Text style={s.uitlegTekst}>{t('recept.link.teLang', { minuten: linkMelding.teLang })}</Text>}
          {linkMelding.nieuw !== undefined && <Text style={s.uitlegTekst}>{t('recept.link.nieuw', { n: linkMelding.nieuw })}</Text>}
        </View>
      )}
      <Text style={s.label}>{t('recept.naam')}</Text>
      <TextInput style={s.veld} value={naam} onChangeText={setNaam} accessibilityLabel={t('recept.naam')} />
      {fout('naam')}

      <Text style={s.label}>{t('recept.soort')}</Text>
      <View style={s.rijChips}>
        {SOORTEN.map((k) => (
          <Chip key={k} tekst={t(`soort.${k}`)} actief={soort === k} onPress={() => setSoort(k)} />
        ))}
      </View>

      <Text style={s.label}>{t('recept.kooktijd')}</Text>
      <View style={s.rijChips}>
        {KOOKTIJDEN.map((k) => (
          <Chip key={k} tekst={t(`kooktijd.${k}`, KOOKTIJD_BEREIK[k])} actief={gekozenKooktijd === k} onPress={() => kiesKooktijd(k)} />
        ))}
      </View>
      {fout('minuten')}

      <Text style={s.label}>{t('recept.stijlen')}</Text>
      <View style={s.rijChips}>
        <Chip tekst={gezinLabel} actief={stijlen.includes(GEZIN_STIJL)} onPress={() => toggleStijl(GEZIN_STIJL)} />
        {STIJLEN.map((k: StijlCode) => (
          <Chip key={k} tekst={t(`stijl.${k}`)} actief={stijlen.includes(k)} onPress={() => toggleStijl(k)} />
        ))}
      </View>

      <Text style={s.label}>{t('recept.seizoen')}</Text>
      <View style={s.rijChips}>
        {SEIZOENEN.map((k) => (
          <Chip key={k} tekst={t(`seizoen.${k}`)} actief={seizoenen.includes(k)} onPress={() => toggleSeizoen(k)} />
        ))}
      </View>

      <Text style={s.label}>{t('recept.ingredienten')}</Text>
      {/* WEEK-247: wat bij het inlezen niet zeker gekoppeld is: voorstel gebruiken, zelf zoeken of overslaan. */}
      {nakijken.length > 0 && (
        <View style={s.nakijkVak}>
          <Text style={s.nakijkKop}>{t('recept.link.nakijken')}</Text>
          <Text style={s.nakijkUitleg}>{t('recept.link.nakijkUitleg')}</Text>
          {nakijken.map((n, i) => (
            <View key={`${n.tekst}-${i}`} style={s.nakijkRij}>
              <Text style={s.nakijkTekst}>{n.tekst}</Text>
              <Text style={s.nakijkDetail}>
                {n.code
                  ? n.reden === 'hoeveelheid'
                    ? `${ingredientNaam(n.code, taal)} · ${t('recept.link.hoeveelheid')}`
                    : t('recept.link.voorstel', { naam: ingredientNaam(n.code, taal) })
                  : t('recept.link.onbekend')}
              </Text>
              <View style={s.rijChips}>
                {n.code && (
                  <Pressable style={[s.chip, s.chipActief]} onPress={() => gebruikNakijk(i)} accessibilityRole="button">
                    <Text style={[s.chipTekst, s.chipTekstActief]}>{n.hoeveelheid === undefined ? t('recept.link.hoeveelheid') : t('recept.link.gebruik')}</Text>
                  </Pressable>
                )}
                {!n.code && (
                  <Pressable style={s.chip} onPress={() => zoekNakijkOpnieuw(i)} disabled={nieuwBezig} accessibilityRole="button">
                    <Text style={s.chipTekst}>{t('recept.link.opnieuw')}</Text>
                  </Pressable>
                )}
                <Pressable style={s.chip} onPress={() => zoekNakijk(i)} accessibilityRole="button">
                  <Text style={s.chipTekst}>{t('recept.link.zoek')}</Text>
                </Pressable>
                <Pressable style={s.chip} onPress={() => slaNakijkOver(i)} accessibilityRole="button">
                  <Text style={s.chipTekst}>{t('recept.link.sla')}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
      {rijen.map((r, i) => (
        <View key={`${r.naam}-${i}`} style={s.ingredient}>
          <Pressable style={s.ingredientTekst} onPress={() => openPopup({ index: i, code: r.code, naam: r.naam }, r)} accessibilityRole="button">
            <Text style={s.ingredientNaam}>{r.naam}</Text>
            <Text style={s.ingredientDetail}>{rijDetail(r)}</Text>
          </Pressable>
          <Pressable onPress={() => verwijderRij(i)} accessibilityRole="button" accessibilityLabel={t('recept.ingredientWeg', { naam: r.naam })} hitSlop={8}>
            <Text style={s.verwijder}>✕</Text>
          </Pressable>
        </View>
      ))}
      {fout('ingredienten')}

      <View style={s.invoerRij}>
        <TextInput
          style={[s.veld, s.invoerVeld]}
          value={zoek}
          onChangeText={setZoek}
          onSubmitEditing={plus}
          returnKeyType="done"
          placeholder={t('recept.zoekIngredient')}
          accessibilityLabel={t('recept.zoekIngredient')}
          autoCorrect={false}
        />
        <Pressable style={[s.plus, !zoek.trim() && s.plusUit]} onPress={plus} accessibilityRole="button" accessibilityLabel={t('recept.ingredientPlus')}>
          <Text style={s.plusTekst}>+</Text>
        </Pressable>
      </View>
      {zoekTreffers.map((k) => (
        <Pressable key={`${k.code ?? k.naam}`} style={s.treffer} onPress={() => openPopup({ code: k.code, naam: k.naam })} accessibilityRole="button">
          <Text style={s.trefferTekst}>{k.naam}</Text>
        </Pressable>
      ))}
      {nietsGevonden && <Text style={s.geenTreffer}>{t('frigo.geenIngredient')}</Text>}
      {/* WEEK-254: niet gevonden: laten opzoeken of als nieuw ingrediënt toevoegen. */}
      {nietsGevonden && (
        <Pressable style={[s.linkKnop, nieuwBezig && { opacity: 0.6 }]} onPress={voegNieuwToe} disabled={nieuwBezig} accessibilityRole="button">
          {nieuwBezig ? <ActivityIndicator color={KLEUR} /> : <Ionicons name="add-circle-outline" size={18} color={KLEUR} />}
          <Text style={s.linkKnopTekst}>{nieuwBezig ? t('recept.nieuwBezig') : t('recept.nieuwIngredient', { naam: zoek.trim() })}</Text>
        </Pressable>
      )}
      {nieuwFout && <Text style={s.fout}>{t(`recept.nieuwFout.${nieuwFout}` as Sleutel)}</Text>}

      <Text style={s.label}>{t('recept.stappen')}</Text>
      {stappen.map((stap, i) => (
        <View key={i} style={s.stapRij}>
          <Text style={s.stapNummer}>{i + 1}</Text>
          <TextInput
            style={[s.veld, s.stapVeld]}
            value={stap}
            onChangeText={(tekst) => wijzigStap(i, tekst)}
            multiline
            placeholder={t('recept.stap', { n: i + 1 })}
            accessibilityLabel={t('recept.stap', { n: i + 1 })}
          />
        </View>
      ))}
      {laatsteGevuld && (
        <Pressable onPress={voegStapToe} accessibilityRole="button">
          <Text style={s.link}>{t('recept.stapVoeg')}</Text>
        </Pressable>
      )}
      {fout('stappen')}

      <View style={s.knoppen}>
        <Pressable style={s.annuleer} onPress={terug} disabled={bezig} accessibilityRole="button">
          <Text style={s.annuleerTekst}>{t('recept.annuleer')}</Text>
        </Pressable>
        <Pressable style={[s.bewaar, bezig && { opacity: 0.6 }]} onPress={bewaar} disabled={bezig} accessibilityRole="button">
          <Text style={s.bewaarTekst}>{t('recept.bewaar')}</Text>
        </Pressable>
      </View>
      {bestaand && !bevestigVerwijder && (
        <Pressable style={s.verwijderKnop} onPress={() => setBevestigVerwijder(true)} accessibilityRole="button">
          <Text style={s.verwijderTekst}>{t('recept.verwijder')}</Text>
        </Pressable>
      )}
      {bestaand && bevestigVerwijder && (
        <View style={s.bevestig}>
          <Text style={s.bevestigTekst}>{t('recept.verwijderVraag')}</Text>
          <View style={s.knoppen}>
            <Pressable style={s.annuleer} onPress={() => setBevestigVerwijder(false)} accessibilityRole="button">
              <Text style={s.annuleerTekst}>{t('recept.annuleer')}</Text>
            </Pressable>
            <Pressable style={[s.bewaar, s.verwijderJa]} onPress={verwijder} accessibilityRole="button">
              <Text style={s.bewaarTekst}>{t('recept.verwijder')}</Text>
            </Pressable>
          </View>
        </View>
      )}
      <LosPopup opties={popup} onSluit={sluitPopup} onBewaar={bewaarPopup} />
    </ScrollView>
  );
}

function Chip({ tekst, actief, onPress }: { tekst: string; actief: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[s.chip, actief && s.chipActief]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: actief }}
    >
      <Text style={[s.chipTekst, actief && s.chipTekstActief]}>{tekst}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  // WEEK-203: dezelfde maten als Kies en Mijn recepten: zijmarge 16, velden en knoppen met hoekstraal 12, chips zoals in het weekmenu.
  scherm: { padding: 16, gap: 8, paddingBottom: 48 },
  label: { fontSize: 14, fontWeight: '700', color: '#333', marginTop: 10 },
  veld: { borderWidth: 1.5, borderColor: '#ccc', borderRadius: 12, padding: 12, minHeight: 48, fontSize: 16, backgroundColor: '#fff' },
  fout: { color: '#c62828', fontSize: 13 },
  rijChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18, borderWidth: 1.5, borderColor: '#ccc', backgroundColor: '#fff', minHeight: 36, justifyContent: 'center' },
  chipActief: { backgroundColor: KLEUR, borderColor: KLEUR },
  chipTekst: { fontSize: 13, color: '#333', fontWeight: '600' },
  chipTekstActief: { color: '#fff' },
  ingredient: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e5e5', paddingVertical: 10, paddingHorizontal: 14 },
  ingredientTekst: { flex: 1, gap: 2 },
  ingredientNaam: { fontSize: 15, fontWeight: '600' },
  ingredientDetail: { fontSize: 13, color: '#5E6B63' },
  invoerRij: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  invoerVeld: { flex: 1 },
  plus: { width: 48, height: 48, borderRadius: 12, backgroundColor: KLEUR, alignItems: 'center', justifyContent: 'center' },
  plusUit: { opacity: 0.4 },
  plusTekst: { color: '#fff', fontSize: 24, fontWeight: '700', lineHeight: 28 },
  verwijder: { fontSize: 18, color: '#c62828', paddingHorizontal: 6 },
  treffer: { backgroundColor: '#f4f8f5', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  trefferTekst: { fontSize: 15, color: '#2e7d4f' },
  stapRij: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  stapNummer: { width: 22, paddingTop: 12, fontWeight: '700', color: '#555', textAlign: 'center' },
  stapVeld: { flex: 1, minHeight: 44 },
  link: { color: KLEUR, fontWeight: '700', paddingVertical: 6 },
  knoppen: { flexDirection: 'row', gap: 10, marginTop: 16 },
  annuleer: { flex: 1, borderWidth: 1.5, borderColor: '#ccc', borderRadius: 12, padding: 14, minHeight: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  annuleerTekst: { color: '#444', fontWeight: '700', fontSize: 16 },
  bewaar: { flex: 2, backgroundColor: KLEUR, borderRadius: 12, padding: 14, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  bewaarTekst: { color: '#fff', fontWeight: '700', fontSize: 16 },
  verwijderKnop: { padding: 12, alignItems: 'center' },
  bevestig: { marginTop: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#f3c1c1', backgroundColor: '#fdf1f1', gap: 4 },
  bevestigTekst: { color: '#7a1c1c', fontWeight: '700', textAlign: 'center' },
  verwijderJa: { backgroundColor: '#c62828' },
  uitleg: { backgroundColor: '#E8F3EC', borderRadius: 12, padding: 12, marginBottom: 4 },
  uitlegTekst: { color: '#1f5c38', fontSize: 14, lineHeight: 20 },
  geenTreffer: { color: '#666', marginTop: 6 },
  verwijderTekst: { color: '#c62828', fontWeight: '600' },
  linkKnop: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: KLEUR, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#fff' },
  linkKnopTekst: { color: KLEUR, fontWeight: '700', fontSize: 15 },
  fotoBezig: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  fotoAnnuleer: { alignSelf: 'center', paddingVertical: 6 },
  linkVak: { borderWidth: 1, borderColor: '#cfe3d6', borderRadius: 14, padding: 12, gap: 8, backgroundColor: '#fff' },
  linkUitleg: { color: '#333', fontSize: 14, lineHeight: 20 },
  nakijkVak: { borderWidth: 1, borderColor: '#f0d9a8', backgroundColor: '#fff9ec', borderRadius: 14, padding: 12, gap: 8 },
  nakijkKop: { fontWeight: '800', color: '#7a5200', fontSize: 15 },
  nakijkUitleg: { color: '#7a5200', fontSize: 13 },
  nakijkRij: { backgroundColor: '#fff', borderRadius: 12, padding: 10, gap: 6, borderWidth: 1, borderColor: '#f3e3bf' },
  nakijkTekst: { fontSize: 15, fontWeight: '600', color: '#17201A' },
  nakijkDetail: { fontSize: 13, color: '#5E6B63' },
});
