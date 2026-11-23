import { ComponentProps, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { Afdeling, gewichtPerStuk, ingredientNaam } from '@/data/ingredienten';
import { Eenheid, Soort, STIJLEN, StijlCode } from '@/data/recept';
import { SEIZOENEN, Seizoen } from '@/data/seizoenen';
import { eenheidNaam, type Sleutel } from '@/i18n';
import {
  afdelingVanEigen,
  bewaarEigen,
  EENHEDEN,
  EigenIngredient,
  EigenRecept,
  formulierVoor,
  Fout,
  GEZIN_STIJL,
  plusActie,
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
import type { LosWijziging } from '@/lib/frigo';
import { LosPopup, PopupOpties } from '@/ui/losPopup';
import { binnenKooktijd, KOOKTIJD_BEREIK, KOOKTIJD_SCHATTING_STANDAARD, KOOKTIJDEN, KooktijdCode, kooktijdSchattingen, kooktijdVan, kooktijdVoorTeLang, MAX_KOOKTIJD_MIN, minutenVoorKooktijd } from '@/lib/kooktijd';
import { terugPad } from '@/lib/terug';
import { laadEigenRecepten, wijzigEigenRecepten } from '@/opslag/eigenRecepten';
import { laadDbRecepten } from '@/opslag/receptenbank';
import { laadGezin } from '@/opslag/sync';
import { useTaal } from '@/ui/taal';
import { moetNakijkenMelden, NakijkRegel, omrekenen, ontleedRegel, RuwRecept, soortNaWijziging, verwerkRecept, voegSamen, zoekLink, zoekTermVoor } from '@/lib/receptLink';
import { haalReceptOp, LinkFout } from '@/opslag/receptLink';
import { fotoTijdelijkOnbereikbaar, type FotoFout } from '@/lib/receptFoto';
import { FotoBron, kiesFoto, leesReceptUitFoto } from '@/opslag/receptFoto';
import { meldOvergeslagen } from '@/opslag/ingredientMelding';
import { TerugKnop } from '@/ui/terugKnop';
import { useMagGerechtenBeheren } from '@/ui/magGerechten';
import { toonFilmpjeVoorInlezen } from '@/opslag/advertentie';
import { magInlezenNaFilmpje } from '@/lib/inlezenFilmpje';
import { koppelOnbekend } from '@/opslag/ingredientKoppel';
import { koppelingenUit, type KoppelResultaat, opzoekenTijdelijkOnbereikbaar } from '@/lib/ingredientKoppel';

// Recept bewerken (WEEK-192): naam, soort, kooktijd, stijl (ook de gezinsstijl), seizoen (optioneel),
// ingrediënten uit de ingrediëntenlijst van de app met hoeveelheid en eenheid, en de bereiding stap voor stap.
// WEEK-245: enkel ingrediënten die de app kent; je geeft enkel de hoeveelheid in (voor één volwassene).
// WEEK-199: de kooktijd kies je als snel, gemiddeld of uitgebreid (met het tijdsbestek); de minuten worden vooraf
// ingevuld met de geschatte tijd uit de databank en blijven aanpasbaar tot de bovengrens van een uur.
// WEEK-200: een ingrediënt voeg je toe zoals een product op de lijst: naam ingeven, op de plus tikken (of een treffer
// kiezen) en in de popup de hoeveelheid, de eenheid en de categorie invullen. Tikken op een ingrediënt opent de popup opnieuw.
// Voor een ingrediënt uit de app liggen de eenheid en de categorie vast, zoals op de lijst en in de frigo.

const KLEUR = '#2e7d4f';
/** WEEK-328: kleur voor een regel die aandacht vraagt in de melding na het inlezen. */
const ORANJE_MELDING = '#C9500A';

/** Een ingrediënt in het formulier; de hoeveelheid komt uit de popup en is altijd ingevuld. */
import { isKeukenEenheid, KeukenEenheid, keuzeEenheden, naarBasis, pastBij } from '@/lib/eenheden';

type Rij = EigenIngredient;

/** WEEK-270: hoeveelheid en eenheid zoals de gebruiker ze ziet: de gekozen keukenmaat, anders de basis. */
const zichtbareMaat = (r: Pick<Rij, 'hoeveelheid' | 'eenheid' | 'keuken'>): { hoeveelheid: number; eenheid: KeukenEenheid } =>
  r.keuken ? { hoeveelheid: r.keuken.hoeveelheid, eenheid: r.keuken.eenheid } : { hoeveelheid: r.hoeveelheid, eenheid: r.eenheid };

/** Waarvoor de popup open staat: een nieuw ingrediënt (met of zonder code) of een bestaande rij. */
type PopupDoel = { index?: number; code?: EigenIngredient['code']; naam: string; nakijk?: number };

/** Wat er na het inlezen via een link (WEEK-247) of een foto (WEEK-251) getoond wordt. */
type LinkMelding = {
  bron: 'link' | 'foto';
  aantal: number;
  personen: number;
  vanSite: boolean;
  teLang?: number;
  /** WEEK-258: onbekende ingrediënten konden niet opgezocht worden (AI tijdelijk onbereikbaar). */
  opzoekenTijdelijk?: boolean;
};

/** WEEK-254: waarom opzoeken of toevoegen van een ingrediënt niet lukte. */
type NieuwFout = 'geen' | 'druk' | 'limiet' | 'niet_bereikbaar' | 'geen_verbinding';

const FOUT_TEKST: Record<Fout, string> = {
  naam: 'recept.fout.naam',
  minuten: 'recept.fout.minuten',
  ingredienten: 'recept.fout.ingredienten',
  stappen: 'recept.fout.stappen',
};

export default function EigenReceptScherm() {
  const { t, tn, taal } = useTaal();
  const params = useLocalSearchParams<{ id?: string; terug?: string }>();
  const id = params.id;
  // WEEK-218: terug naar het scherm vanwaar dit geopend werd (verborgen tab: router.back() ging naar het beginscherm).
  const terug = () => router.navigate(terugPad(params.terug, '/mijn-recepten') as never);
  const navigation = useNavigation();

  const [geladen, setGeladen] = useState(!id);
  const [bestaand, setBestaand] = useState<EigenRecept | undefined>(undefined);
  const [naam, setNaam] = useState('');
  const [soort, setSoort] = useState<Soort>('vegetarisch');
  // WEEK-328: heeft de gebruiker het soort zelf gekozen (of is het een bestaand gerecht)? Anders volgt het de ingrediënten.
  const [soortGekozen, setSoortGekozen] = useState(false);
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
  const [linkFout, setLinkFout] = useState<LinkFout | 'filmpje' | undefined>(undefined);
  const [linkMelding, setLinkMelding] = useState<LinkMelding | undefined>(undefined);
  const [nakijken, setNakijken] = useState<NakijkRegel[]>([]);
  // WEEK-326: bewaren met regels in "Nog na te kijken" vraagt eerst een bevestiging; "Nakijken" scrolt naar die regels.
  const [vraagNakijken, setVraagNakijken] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [nakijkY, setNakijkY] = useState(0);
  const [formulierY, setFormulierY] = useState(0);
  // WEEK-326: "Zelf kiezen": de regel blijft staan (gemarkeerd) tot er echt een ingrediënt voor gekozen is.
  const [zoektVoor, setZoektVoor] = useState<NakijkRegel | undefined>(undefined);
  const [plusHint, setPlusHint] = useState(false);
  const zoekVeldRef = useRef<TextInput>(null);
  const [zoekVeldY, setZoekVeldY] = useState(0);
  // De vraag staat onder de knoppen: schuif ze in beeld zodra ze verschijnt.
  useEffect(() => {
    if (vraagNakijken) requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [vraagNakijken]);
  // WEEK-251: een recept inlezen via een foto (Google Gemini via de Supabase-functie recept-foto).
  const [fotoOpen, setFotoOpen] = useState(false);
  const [fotoBezig, setFotoBezig] = useState(false);
  const [fotoFout, setFotoFout] = useState<FotoFout | 'geenToestemming' | 'filmpje' | undefined>(undefined);
  // WEEK-254: een onbekend ingrediënt laten opzoeken of toevoegen (Gemini, via de Supabase-functie ingredient-koppel).
  const [nieuwBezig, setNieuwBezig] = useState(false);
  const [nieuwFout, setNieuwFout] = useState<NieuwFout | undefined>(undefined);
  const [schattingen, setSchattingen] = useState<Record<KooktijdCode, number>>(KOOKTIJD_SCHATTING_STANDAARD);

  useEffect(() => {
    laadDbRecepten()
      .then((recepten) => setSchattingen(kooktijdSchattingen(recepten.map((r) => r.kooktijdMin))))
      .catch(() => undefined);
  }, []);

  // WEEK-320: dit scherm is een verborgen tabblad en blijft geladen. Daarom bij elke opening het formulier opnieuw
  // opbouwen: leeg voor een nieuw recept, ingevuld voor een bestaand. Anders bleven de ingrediënten van het vorige recept staan.
  useFocusEffect(
    useCallback(() => {
      let actief = true;
      const vul = (r: EigenRecept | undefined) => {
        const f = formulierVoor(r, KOOKTIJD_SCHATTING_STANDAARD.snel);
        setBestaand(r);
        setNaam(f.naam);
        setSoort(f.soort);
        setSoortGekozen(!!r);
        setMinuten(f.minuten);
        setStijlen(f.stijlen);
        setSeizoenen(f.seizoenen);
        setRijen(f.ingredienten);
        setStappen(f.stappen);
        setZoek('');
        setFouten([]);
        setNakijken([]);
        setLinkOpen(false);
        setLink('');
        setLinkFout(undefined);
        setLinkMelding(undefined);
        setFotoOpen(false);
        setFotoFout(undefined);
        setNieuwFout(undefined);
        setBevestigVerwijder(false);
        setPopup(null);
        setPopupDoel(null);
      };
      setGeladen(!id);
      vul(undefined);
      laadGezin().then((g) => actief && setGezinNaam(g?.naam || undefined)).catch(() => actief && setGezinNaam(undefined));
      laadEigenRecepten().then((lijst) => {
        if (!actief) return;
        if (id) vul(lijst.find((x) => x.id === id));
        setGeladen(true);
      });
      return () => {
        actief = false;
      };
    }, [id])
  );

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
    const basis = bestaande?.eenheid ?? standaardEenheid(code);
    // WEEK-270: de popup toont wat de gebruiker koos (2 el), niet de omgerekende basis (30 ml).
    const zichtbaar = bestaande ? zichtbareMaat(bestaande) : undefined;
    const keuzes = keuzeEenheden(basis, code ? gewichtPerStuk(code) : undefined);
    const afdeling = code ? afdelingVanEigen({ code }) : bestaande?.afdeling;
    setPopupDoel(doel);
    setPopup({
      sleutel: `${doel.index ?? 'nieuw'}-${Date.now()}`,
      titel: t(doel.index === undefined ? 'recept.popupNieuw' : 'recept.popupBewerk'),
      naam: doel.naam,
      hoeveelheid: zichtbaar?.hoeveelheid,
      eenheid: zichtbaar?.eenheid ?? basis,
      afdeling: afdeling ?? 'overig',
      // WEEK-245: de categorie ligt vast. WEEK-270: de eenheid kies je uit de keukeneenheden die bij het ingrediënt passen.
      toonEenheid: keuzes.length > 1,
      toonCategorie: false,
      toonVasteCategorie: !!code,
      toonHoudbaar: false,
      eenheden: keuzes,
      hoeveelheidVerplicht: true,
      accent: KLEUR,
    });
  };

  const sluitPopup = () => {
    setPopup(null);
    setPopupDoel(null);
  };

  /**
   * Een gekozen ingrediënt uit het zoekveld. WEEK-326: zoekt de gebruiker voor een regel om na te kijken, dan staat de
   * hoeveelheid uit het recept al ingevuld (als die om te rekenen is).
   */
  const kiesTreffer = (k: { code?: EigenIngredient['code']; naam: string }) => {
    const h = zoektVoor && k.code ? omrekenen(ontleedRegel(zoektVoor.tekst), k.code, linkMelding?.personen ?? 1) : undefined;
    const voorstel: Rij | undefined = k.code && h !== undefined ? { code: k.code, naam: k.naam, hoeveelheid: h, eenheid: standaardEenheid(k.code) } : undefined;
    openPopup({ code: k.code, naam: k.naam }, voorstel);
  };

  /** De plus (WEEK-326): de juiste treffer kiezen, bij meerdere treffers zeggen dat je er een kiest, zonder treffer opzoeken. */
  const plus = () => {
    const r = plusActie(zoek, zoekTreffers);
    if (r.actie === 'kies') kiesTreffer(r.keuze);
    else if (r.actie === 'meerdere') setPlusHint(true);
    else if (r.actie === 'nieuw') void voegNieuwToe();
  };

  const bewaarPopup = (w: LosWijziging) => {
    if (!popupDoel || w.hoeveelheid === undefined) return;
    const code = popupDoel.code;
    const eenheid = (code ? standaardEenheid(code) : w.eenheid && (EENHEDEN as readonly string[]).includes(w.eenheid) ? w.eenheid : 'g') as Eenheid;
    const afdeling: Afdeling | undefined = !code && w.afdeling !== 'overig' ? w.afdeling : undefined;
    // WEEK-270: een gekozen keukeneenheid (el, bosje, dl …) wordt omgerekend naar de basis; de keuze zelf blijft bewaard om te tonen.
    const perStuk = code ? gewichtPerStuk(code) : undefined;
    const gekozen = isKeukenEenheid(w.eenheid) && pastBij(w.eenheid, eenheid, perStuk) && w.eenheid !== eenheid ? w.eenheid : undefined;
    const rij: Rij = {
      ...(code ? { code } : {}),
      naam: popupDoel.naam,
      hoeveelheid: gekozen ? naarBasis(w.hoeveelheid, gekozen, eenheid, perStuk) : w.hoeveelheid,
      eenheid,
      ...(afdeling ? { afdeling } : {}),
      ...(gekozen ? { keuken: { eenheid: gekozen, hoeveelheid: w.hoeveelheid } } : {}),
    };
    // WEEK-247: een ingrediënt dat al in het recept staat, wordt niet dubbel toegevoegd; de hoeveelheden worden samengeteld.
    setRijen((r) => (popupDoel.index === undefined ? voegSamen(r, rij) : r.map((x, i) => (i === popupDoel.index ? rij : x))));
    if (popupDoel.nakijk !== undefined) {
      const weg = popupDoel.nakijk;
      setNakijken((n) => n.filter((_, i) => i !== weg));
    } else if (popupDoel.index === undefined && zoektVoor) {
      // WEEK-326: er is een ingrediënt gekozen voor de regel waarvoor gezocht werd; pas nu verdwijnt die regel.
      const regel = zoektVoor;
      setNakijken((n) => n.filter((x) => x !== regel));
      setZoektVoor(undefined);
    }
    setPlusHint(false);
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
      // WEEK-280: eerst het filmpje (in de app); vroegtijdig gesloten = niet inlezen.
      if (!magInlezenNaFilmpje(await toonFilmpjeVoorInlezen())) {
        setLinkFout('filmpje');
        return;
      }
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
    let opzoekenTijdelijk = false;
    const onbekend = ingelezen.nakijken.filter((n) => n.reden === 'onbekend');
    if (onbekend.length) {
      const r = await koppelOnbekend(
        onbekend.map((n) => n.naam),
        onbekend[0].taal
      );
      opzoekenTijdelijk = opzoekenTijdelijkOnbereikbaar(r);
      if (r.ok && r.resultaten.some((x) => x.code)) {
        ingelezen = verwerkRecept(recept, taal, koppelingenUit(r.resultaten));
      }
    }
    if (ingelezen.naam) setNaam(ingelezen.naam);
    setSoort(ingelezen.soort);
    const teLang = ingelezen.minuten !== undefined && ingelezen.minuten > MAX_KOOKTIJD_MIN ? ingelezen.minuten : undefined;
    // WEEK-328: langer dan een uur: meteen "Uitgebreid" (de gebruiker kan het nog aanpassen); vroeger bleef de kooktijd leeg.
    const langeKooktijd = kooktijdVoorTeLang(ingelezen.minuten);
    if (langeKooktijd) setMinuten(String(minutenVoorKooktijd(langeKooktijd, schattingen)));
    else if (ingelezen.minuten !== undefined) setMinuten(String(ingelezen.minuten));
    if (ingelezen.stappen.length) setStappen(ingelezen.stappen);
    setRijen((bestaande) => ingelezen.ingredienten.reduce(voegSamen, bestaande));
    setNakijken(ingelezen.nakijken);
    setLinkMelding({ bron, aantal: ingelezen.ingredienten.length, personen: ingelezen.personen, vanSite: ingelezen.personenVanSite, ...(teLang ? { teLang } : {}), ...(opzoekenTijdelijk ? { opzoekenTijdelijk } : {}) });
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
      // WEEK-280: eerst het filmpje (in de app); vroegtijdig gesloten = niet inlezen.
      if (!magInlezenNaFilmpje(await toonFilmpjeVoorInlezen())) {
        setFotoFout('filmpje');
        return;
      }
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
  /**
   * Zelf kiezen (WEEK-326): een korte zoekterm die treffers geeft komt in het zoekveld, het veld schuift in beeld en de regel
   * blijft gemarkeerd staan tot er een ingrediënt gekozen is (anders zou ze stil verdwijnen).
   */
  const zoekNakijk = (index: number) => {
    const n = nakijken[index];
    if (!n) return;
    const heeftTreffers = (q: string) => zoekIngredienten(q, taal).length > 0;
    let term = zoekTermVoor(n.naam, heeftTreffers);
    // Heeft de regel een voorstel, dan moet dat bij de treffers staan ("potatoes" vond enkel "baby potatoes", niet "potato").
    if (n.code && !zoekIngredienten(term, taal).some((k) => k.code === n.code)) term = ingredientNaam(n.code, taal);
    setZoektVoor(n);
    setPlusHint(false);
    setNieuwFout(undefined);
    setZoek(term);
    scrollRef.current?.scrollTo({ y: Math.max(0, formulierY + zoekVeldY - 120), animated: true });
    setTimeout(() => zoekVeldRef.current?.focus(), 300);
  };
  const stopZoeken = () => {
    setZoektVoor(undefined);
    setPlusHint(false);
    setZoek('');
  };
  // Verdwijnt de regel op een andere manier (Gebruik, Overslaan), dan wordt er ook niet meer voor gezocht.
  useEffect(() => {
    if (zoektVoor && !nakijken.includes(zoektVoor)) {
      setZoektVoor(undefined);
      // WEEK-328: ook de zoekterm van die regel weg (bv. na Overslaan bleef "laurierblaadjes" staan).
      setZoek('');
      setPlusHint(false);
    }
  }, [nakijken, zoektVoor]);

  // WEEK-328: het soort volgt de ingrediënten (ook die nog na te kijken zijn) zolang de gebruiker het niet zelf koos.
  useEffect(() => {
    const codes = [...rijen.flatMap((r) => (r.code ? [r.code] : [])), ...nakijken.flatMap((n) => (n.code ? [n.code] : []))];
    setSoort((huidig) => soortNaWijziging(huidig, codes, soortGekozen));
  }, [rijen, nakijken, soortGekozen]);

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
      // WEEK-328: opzoeken werkt weer: de melding 'tijdelijk niet beschikbaar' klopt niet meer.
      setLinkMelding((m) => (m?.opzoekenTijdelijk ? { ...m, opzoekenTijdelijk: false } : m));
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
      setLinkMelding((m) => (m?.opzoekenTijdelijk ? { ...m, opzoekenTijdelijk: false } : m));
      setZoek('');
      kiesTreffer({ code, naam: ingredientNaam(code, taal) });
    } finally {
      setNieuwBezig(false);
    }
  };

  const verwijderRij = (index: number) => setRijen((r) => r.filter((_, i) => i !== index));

  /** Wat een rij toont naast de naam: hoeveelheid, eenheid en categorie. */
  const rijDetail = (r: Rij) => {
    const afd = afdelingVanEigen(r);
    const m = zichtbareMaat(r);
    return `${String(m.hoeveelheid).replace('.', ',')} ${eenheidNaam(taal, m.eenheid)} · ${t(`afdeling.${afd ?? 'overig'}` as Sleutel)}`;
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

  const bewaar = async (nakijkenBevestigd = false) => {
    if (bezig) return;
    const resultaat = valideer({ naam, soort, minuten, stijlen, seizoenen, ingredienten: rijen, stappen });
    if (!resultaat.ok) {
      setFouten(resultaat.fouten);
      return;
    }
    setFouten([]);
    if (moetNakijkenMelden(nakijken.length, nakijkenBevestigd)) {
      setVraagNakijken(true);
      return;
    }
    setVraagNakijken(false);
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

  // WEEK-276: enkel de beheerder beheert de gerechten; de andere leden kunnen ze enkel lezen.
  // WEEK-320: deze hook staat vóór de vroege return; een hook erna liet het scherm crashen als `geladen` wisselde.
  const magBeheren = useMagGerechtenBeheren();

  if (!geladen) return null;

  // WEEK-246: een getoonde melding verdwijnt zodra het probleem opgelost is.
  const getoond = nogGeldigeFouten(fouten, { naam, soort, minuten, stijlen, seizoenen, ingredienten: rijen, stappen });

  const fout = (f: Fout) => (getoond.includes(f) ? <Text style={s.fout}>{t(FOUT_TEKST[f] as never, { max: MAX_KOOKTIJD_MIN })}</Text> : null);

  return (
    <ScrollView ref={scrollRef} contentContainerStyle={s.scherm} keyboardShouldPersistTaps="handled">
      {!magBeheren && <Text style={s.alleenLezen}>{t('recept.alleenBeheerder')}</Text>}
      <View style={s.formulier} pointerEvents={magBeheren ? 'auto' : 'none'} onLayout={(e) => setFormulierY(e.nativeEvent.layout.y)}>
      {/* WEEK-245: de hoeveelheden zijn voor één volwassene; de app rekent om voor het gezin. */}
      <View style={s.uitleg}>
        <Text style={s.uitlegTekst}>{t('recept.uitlegVolwassene')}</Text>
      </View>

      {/* WEEK-247/251/260: een recept inlezen via de link van een receptensite of via een foto: één kaart, twee tegels. */}
      {magBeheren && !bestaand && !linkOpen && !fotoOpen && (
        <View style={s.inlezenKaart}>
          <Text style={s.inlezenTitel}>{t('recept.inlezen.titel')}</Text>
          <Text style={s.inlezenSub}>{t('recept.inlezen.sub')}</Text>
          <View style={s.tegels}>
            <Pressable
              style={({ pressed }) => [s.tegel, pressed && s.tegelGedrukt]}
              onPress={() => setLinkOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t('recept.link.knop')}
            >
              <View style={s.tegelIcoon}>
                <Ionicons name="link" size={22} color={KLEUR} />
              </View>
              <Text style={s.tegelTitel}>{t('recept.link.tegel')}</Text>
              <Text style={s.tegelSub}>{t('recept.link.tegelSub')}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [s.tegel, pressed && s.tegelGedrukt]}
              onPress={() => setFotoOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t('recept.foto.knop')}
            >
              <View style={s.tegelIcoon}>
                <Ionicons name="camera" size={22} color={KLEUR} />
              </View>
              <Text style={s.tegelTitel}>{t('recept.foto.tegel')}</Text>
              <Text style={s.tegelSub}>{t('recept.foto.tegelSub')}</Text>
            </Pressable>
          </View>
        </View>
      )}
      {!bestaand && fotoOpen && (
        <View style={s.inlezenKaart}>
          <View style={s.paneelKop}>
            <TerugKnop
              onPress={() => {
                setFotoOpen(false);
                setFotoFout(undefined);
              }}
              style={s.paneelTerug}
            />
            <View style={s.tegelIcoonKlein}>
              <Ionicons name="camera" size={18} color={KLEUR} />
            </View>
            <Text style={s.paneelTitel}>{t('recept.foto.tegel')}</Text>
          </View>
          <Text style={s.paneelUitleg}>{t('recept.foto.uitleg')}</Text>
          {/* WEEK-258: de AI is tijdelijk onbereikbaar: duidelijk zeggen en de andere werkwijzen aanbieden. */}
          {fotoTijdelijkOnbereikbaar(fotoFout === 'filmpje' ? undefined : fotoFout) ? (
            <View style={s.tijdelijkVak}>
              <Text style={s.fout}>{t('recept.foto.tijdelijk')}</Text>
              <View style={s.rijChips}>
                <Pressable
                  style={s.chip}
                  onPress={() => {
                    setFotoOpen(false);
                    setFotoFout(undefined);
                    setLinkOpen(true);
                  }}
                  accessibilityRole="button"
                >
                  <Text style={s.chipTekst}>{t('recept.foto.viaLink')}</Text>
                </Pressable>
                <Pressable
                  style={s.chip}
                  onPress={() => {
                    setFotoOpen(false);
                    setFotoFout(undefined);
                  }}
                  accessibilityRole="button"
                >
                  <Text style={s.chipTekst}>{t('recept.foto.zelf')}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            fotoFout && <Text style={s.fout}>{t(fotoFout === 'geenToestemming' ? 'recept.foto.geenToestemming' : (`recept.foto.fout.${fotoFout}` as Sleutel))}</Text>
          )}
          {fotoBezig ? (
            <View style={s.fotoBezig} accessibilityLiveRegion="polite">
              <ActivityIndicator color={KLEUR} />
              <Text style={s.linkUitleg}>{t('recept.foto.bezig')}</Text>
            </View>
          ) : (
            <View style={s.fotoKnoppen}>
              <Pressable style={({ pressed }) => [s.fotoKnop, pressed && s.tegelGedrukt]} onPress={() => leesFoto('camera')} accessibilityRole="button">
                <Ionicons name="camera-outline" size={20} color="#fff" />
                <Text style={s.fotoKnopTekst}>{t('recept.foto.camera')}</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [s.fotoKnopLicht, pressed && s.tegelGedrukt]} onPress={() => leesFoto('galerij')} accessibilityRole="button">
                <Ionicons name="images-outline" size={20} color={KLEUR} />
                <Text style={s.fotoKnopLichtTekst}>{t('recept.foto.galerij')}</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
      {!bestaand && linkOpen && (
        <View style={s.inlezenKaart}>
          <View style={s.paneelKop}>
            <TerugKnop onPress={() => !linkBezig && setLinkOpen(false)} style={s.paneelTerug} />
            <View style={s.tegelIcoonKlein}>
              <Ionicons name="link" size={18} color={KLEUR} />
            </View>
            <Text style={s.paneelTitel}>{t('recept.link.tegel')}</Text>
          </View>
          <Text style={s.paneelUitleg}>{t('recept.link.uitleg')}</Text>
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
          {/* WEEK-260: terug via de pijl in de kop; één duidelijke knop om in te lezen. */}
          <Pressable
            style={[s.fotoKnop, (linkBezig || !link.trim()) && { opacity: 0.6 }]}
            onPress={leesLink}
            disabled={linkBezig || !link.trim()}
            accessibilityRole="button"
            accessibilityLabel={t(linkBezig ? 'recept.link.bezig' : 'recept.link.lees')}
          >
            {linkBezig ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="download-outline" size={20} color="#fff" />
                <Text style={s.fotoKnopTekst}>{t('recept.link.lees')}</Text>
              </>
            )}
          </Pressable>
        </View>
      )}
      {linkMelding && (
        // WEEK-328: elke boodschap op een eigen regel met een icoon; wat aandacht vraagt in oranje.
        <View style={s.melding}>
          <MeldingRegel icoon="checkmark-circle" kleur={KLEUR} vet tekst={t('recept.link.klaar', { aantal: linkMelding.aantal })} />
          <MeldingRegel
            icoon="people-outline"
            kleur={KLEUR}
            tekst={t(linkMelding.vanSite ? 'recept.link.personen' : linkMelding.bron === 'foto' ? 'recept.foto.personenGeschat' : 'recept.link.personenGeschat', { n: linkMelding.personen })}
          />
          {linkMelding.teLang !== undefined && <MeldingRegel icoon="time-outline" kleur={ORANJE_MELDING} tekst={t('recept.link.teLang', { minuten: linkMelding.teLang })} />}
          {linkMelding.opzoekenTijdelijk && <MeldingRegel icoon="cloud-offline-outline" kleur={ORANJE_MELDING} tekst={t('recept.link.opzoekenTijdelijk')} />}
        </View>
      )}
      <Text style={s.label}>{t('recept.naam')}</Text>
      <TextInput style={s.veld} value={naam} onChangeText={setNaam} accessibilityLabel={t('recept.naam')} />
      {fout('naam')}

      <Text style={s.label}>{t('recept.soort')}</Text>
      <View style={s.rijChips}>
        {SOORTEN.map((k) => (
          <Chip key={k} tekst={t(`soort.${k}`)} actief={soort === k} onPress={() => { setSoort(k); setSoortGekozen(true); }} />
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
        <View style={s.nakijkVak} onLayout={(e) => setNakijkY(e.nativeEvent.layout.y)}>
          <Text style={s.nakijkKop}>{t('recept.link.nakijken')}</Text>
          <Text style={s.nakijkUitleg}>{t('recept.link.nakijkUitleg')}</Text>
          {nakijken.map((n, i) => n === zoektVoor ? (
            // WEEK-326: de regel waarvoor de gebruiker nu zelf een ingrediënt kiest: duidelijk gemarkeerd, met de weg naar beneden.
            <View key={`${n.tekst}-${i}`} style={[s.nakijkRij, s.nakijkRijActief]}>
              <Text style={s.nakijkTekst}>{n.tekst}</Text>
              <Text style={s.nakijkZoekt}>{t('recept.link.zoektHieronder')}</Text>
              <View style={s.rijChips}>
                <Pressable style={s.chip} onPress={stopZoeken} accessibilityRole="button">
                  <Text style={s.chipTekst}>{t('recept.link.stopZoeken')}</Text>
                </Pressable>
                <Pressable style={s.chip} onPress={() => slaNakijkOver(i)} accessibilityRole="button">
                  <Text style={s.chipTekst}>{t('recept.link.sla')}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
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

      {zoektVoor && (
        <View style={s.zoektVoor}>
          <Ionicons name="search" size={16} color={KLEUR} />
          <Text style={s.zoektVoorTekst}>{t('recept.link.zoektVoor', { tekst: zoektVoor.tekst })}</Text>
        </View>
      )}
      <View style={s.invoerRij} onLayout={(e) => setZoekVeldY(e.nativeEvent.layout.y)}>
        <TextInput
          ref={zoekVeldRef}
          style={[s.veld, s.invoerVeld, zoektVoor && s.invoerVeldActief]}
          value={zoek}
          onChangeText={(x) => {
            setZoek(x);
            setPlusHint(false);
            // Een oude melding over opzoeken (WEEK-254) hoort niet bij een nieuwe zoekterm.
            setNieuwFout(undefined);
          }}
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
      {plusHint && zoekTreffers.length > 1 && <Text style={s.plusHint}>{t('recept.kiesTreffer')}</Text>}
      {zoekTreffers.map((k) => (
        <Pressable key={`${k.code ?? k.naam}`} style={s.treffer} onPress={() => kiesTreffer(k)} accessibilityRole="button">
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
      </View>

      {magBeheren && (
      <View style={s.knoppen}>
        <Pressable style={s.annuleer} onPress={terug} disabled={bezig} accessibilityRole="button">
          <Text style={s.annuleerTekst}>{t('recept.annuleer')}</Text>
        </Pressable>
        <Pressable style={[s.bewaar, bezig && { opacity: 0.6 }]} onPress={() => void bewaar()} disabled={bezig} accessibilityRole="button">
          <Text style={s.bewaarTekst}>{t('recept.bewaar')}</Text>
        </Pressable>
      </View>
      )}
      {magBeheren && vraagNakijken && nakijken.length > 0 && (
        <View style={s.bevestig}>
          <Text style={s.bevestigTekst}>
            {tn('recept.nakijkenVraag', nakijken.length)}
          </Text>
          <View style={s.knoppen}>
            <Pressable
              style={s.annuleer}
              onPress={() => {
                setVraagNakijken(false);
                // Het vak staat in het formulier: zijn plaats is relatief tegenover het formulier.
                scrollRef.current?.scrollTo({ y: Math.max(0, formulierY + nakijkY - 16), animated: true });
              }}
              accessibilityRole="button"
            >
              <Text style={s.annuleerTekst}>{t('recept.nakijkenTerug')}</Text>
            </Pressable>
            <Pressable style={s.bewaar} onPress={() => void bewaar(true)} disabled={bezig} accessibilityRole="button">
              <Text style={s.bewaarTekst}>{t('recept.nakijkenToch')}</Text>
            </Pressable>
          </View>
        </View>
      )}
      {magBeheren && bestaand && !bevestigVerwijder && (
        <Pressable style={s.verwijderKnop} onPress={() => setBevestigVerwijder(true)} accessibilityRole="button">
          <Text style={s.verwijderTekst}>{t('recept.verwijder')}</Text>
        </Pressable>
      )}
      {magBeheren && bestaand && bevestigVerwijder && (
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

/** WEEK-328: één regel in de melding na het inlezen: icoon en tekst. */
function MeldingRegel({ icoon, kleur, tekst, vet }: { icoon: ComponentProps<typeof Ionicons>['name']; kleur: string; tekst: string; vet?: boolean }) {
  return (
    <View style={s.meldingRegel}>
      <Ionicons name={icoon} size={18} color={kleur} style={s.meldingIcoon} />
      <Text style={[s.meldingTekst, vet && s.meldingVet]}>{tekst}</Text>
    </View>
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
  // WEEK-276
  formulier: { gap: 14 },
  alleenLezen: { backgroundColor: '#FFF4E5', color: '#7a3a06', borderRadius: 10, padding: 10, fontSize: 13 },
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
  melding: { backgroundColor: '#F2F8F4', borderRadius: 14, borderWidth: 1, borderColor: '#D6E9DD', paddingVertical: 10, paddingHorizontal: 12, gap: 8, marginBottom: 4 },
  meldingRegel: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  meldingIcoon: { marginTop: 1 },
  meldingTekst: { flex: 1, color: '#1f3d2b', fontSize: 14, lineHeight: 20 },
  meldingVet: { fontWeight: '700' },
  uitlegTekst: { color: '#1f5c38', fontSize: 14, lineHeight: 20 },
  geenTreffer: { color: '#666', marginTop: 6 },
  verwijderTekst: { color: '#c62828', fontWeight: '600' },
  linkKnop: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: KLEUR, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#fff' },
  linkKnopTekst: { color: KLEUR, fontWeight: '700', fontSize: 15 },
  fotoBezig: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  fotoAnnuleer: { alignSelf: 'center', paddingVertical: 6 },
  // WEEK-260: kaart "Recept inlezen" met twee tegels, en de panelen met een kop.
  inlezenKaart: { backgroundColor: '#F3F8F5', borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: '#DCEBE1' },
  inlezenTitel: { fontSize: 16, fontWeight: '800', color: '#17201A' },
  inlezenSub: { fontSize: 13, lineHeight: 18, color: '#5E6B63', marginTop: -6 },
  tegels: { flexDirection: 'row', gap: 10 },
  tegel: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12, gap: 6, borderWidth: 1, borderColor: '#DCEBE1', minHeight: 116 },
  tegelGedrukt: { opacity: 0.75 },
  tegelIcoon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E1F0E6', alignItems: 'center', justifyContent: 'center' },
  tegelIcoonKlein: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#E1F0E6', alignItems: 'center', justifyContent: 'center' },
  tegelTitel: { fontSize: 15, fontWeight: '700', color: '#17201A' },
  tegelSub: { fontSize: 12, lineHeight: 16, color: '#5E6B63' },
  paneelKop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paneelTerug: { paddingRight: 4, paddingVertical: 4 },
  paneelTitel: { fontSize: 16, fontWeight: '800', color: '#17201A', flex: 1 },
  paneelUitleg: { fontSize: 13, lineHeight: 19, color: '#5E6B63' },
  fotoKnoppen: { gap: 10 },
  fotoKnop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: KLEUR, borderRadius: 12, minHeight: 50, paddingHorizontal: 14 },
  fotoKnopTekst: { color: '#fff', fontWeight: '700', fontSize: 15 },
  fotoKnopLicht: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, minHeight: 50, paddingHorizontal: 14, borderWidth: 1.5, borderColor: KLEUR },
  fotoKnopLichtTekst: { color: KLEUR, fontWeight: '700', fontSize: 15 },
  tijdelijkVak: { gap: 8, marginTop: 4 },
  linkVak: { borderWidth: 1, borderColor: '#cfe3d6', borderRadius: 14, padding: 12, gap: 8, backgroundColor: '#fff' },
  linkUitleg: { color: '#333', fontSize: 14, lineHeight: 20 },
  nakijkVak: { borderWidth: 1, borderColor: '#f0d9a8', backgroundColor: '#fff9ec', borderRadius: 14, padding: 12, gap: 8 },
  nakijkKop: { fontWeight: '800', color: '#7a5200', fontSize: 15 },
  nakijkUitleg: { color: '#7a5200', fontSize: 13 },
  nakijkRij: { backgroundColor: '#fff', borderRadius: 12, padding: 10, gap: 6, borderWidth: 1, borderColor: '#f3e3bf' },
  nakijkTekst: { fontSize: 15, fontWeight: '600', color: '#17201A' },
  nakijkDetail: { fontSize: 13, color: '#5E6B63' },
  // WEEK-326: de regel waarvoor nu gezocht wordt, en de verwijzing ernaar bij het zoekveld.
  nakijkRijActief: { borderColor: KLEUR, borderWidth: 2, backgroundColor: '#f1f8f4' },
  nakijkZoekt: { fontSize: 14, fontWeight: '700', color: KLEUR },
  zoektVoor: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f1f8f4', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
  zoektVoorTekst: { flex: 1, fontSize: 14, color: '#17201A' },
  invoerVeldActief: { borderColor: KLEUR, borderWidth: 2 },
  plusHint: { fontSize: 14, fontWeight: '600', color: KLEUR, marginTop: 4 },
});
