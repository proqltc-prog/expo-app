import { useCallback, useRef, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { afdelingUitCategorieen, Alternatief, Product, scanNaam, zoekProduct, zoektAlternatief } from '@/lib/openfoodfacts';
import { vorigeVanZelfdeSoort, type HistoriekItem } from '@/lib/scanHistoriek';
import { deelTekst } from '@/lib/scanDelen';
import { bewaarInHistoriek, laadHistoriek, wisHistoriek } from '@/opslag/scanHistoriek';
import { Alternatieven, HistoriekScherm, NutriLetter, VergelijkScherm } from '@/ui/scanExtra';
import { voegProductToe, voegZelfToe } from '@/lib/frigo';
import { GRATIS_SCANS_PER_DAG, magScannen, resterendeScans, ScanTeller } from '@/lib/scanteller';
import { maakScanSessie } from '@/lib/scanSessie';
import { scanActies } from '@/lib/scanActies';
import { laadScanTeller, registreerBonusScans, registreerScan } from '@/opslag/scanteller';
import { bekijkBeloondFilmpje } from '@/opslag/advertentie';
import { BELONING_SCANS, beloningVoor } from '@/lib/beloning';
import { laadFrigo, wijzigFrigo } from '@/opslag/frigo';
import { laadLijst, wijzigLijst } from '@/opslag/lijst';
import { pasFrigoAan, type FrigoItem } from '@/lib/frigo';
import { vinkAf, type LijstItem } from '@/lib/lijst';
import { passendeNamen, zoekOpLijst } from '@/lib/scanLijst';
import { werkOntbrekendBij } from '@/lib/planner/status';
import { wijzigPlan } from '@/opslag/plan';
import { useTaal } from '@/ui/taal';
import { usePaginaInfo } from '@/ui/paginaInfo';
import { ScanBlokken } from '@/ui/scanBlokken';
import { Ionicons } from '@expo/vector-icons';
import { scanTerug } from '@/lib/scanBestemming';

// Thema (WEEK-71): dezelfde kleuren als frigo en lijst. Petrol voor de hoofdacties, oranje voor afwijzen.
const KLEUR = '#0F6B66';
const PAPIER = '#F8F8F4';
const ORANJE = '#E8680F';
const INKT = '#17201A';
const MUTED = '#5E6B63';
const LIJN = '#E4E8E1';

type Status =
  | { soort: 'scannen' }
  | { soort: 'laden'; barcode: string }
  | { soort: 'gevonden'; product: Product }
  | { soort: 'niet-gevonden'; barcode: string }
  | { soort: 'fout' }
  // WEEK-302/303: de historiek (eventueel met een product al gekozen om te vergelijken) en de vergelijking.
  | { soort: 'historiek'; voorgekozen?: string }
  | { soort: 'vergelijk'; a: Product; b: Product; terug?: Product };

// WEEK-177: de uitleg zit in de koptekst; de popup hangt in de wrapper, zodat elke weergave hem kan tonen.
export default function Scan() {
  const { t } = useTaal();
  const { popup } = usePaginaInfo({ tekst: t('pagina.scanInfo'), kleur: '#2e7d4f', infoLabel: t('pagina.infoKnop'), sluitLabel: t('pagina.sluiten') });
  return (
    <>
      <ScanInhoud />
      {popup}
    </>
  );
}

function ScanInhoud() {
  const { t, taal } = useTaal();
  const [toestemming, vraagToestemming] = useCameraPermissions();
  const [status, setStatus] = useState<Status>({ soort: 'scannen' });
  const bezig = useRef(false);
  const sessie = useRef(maakScanSessie()); // WEEK-297
  // Scanlimiet (WEEK-34, WEEK-38, WEEK-298): 5 gratis per dag (GRATIS_SCANS_PER_DAG), plus bonusscans van het reclamefilmpje.
  const [teller, setTeller] = useState<ScanTeller | null>(null);
  // Reclamefilmpje voor extra scans (WEEK-38): knop uitgeschakeld tijdens het laden.
  const [filmpjeBezig, setFilmpjeBezig] = useState(false);
  // WEEK-274: korte bevestiging bovenaan de scanner (bv. "Melk staat bij In huis."); weg bij de volgende scan.
  const [bevestiging, setBevestiging] = useState<string | null>(null);
  // Gescand vanaf de boodschappenlijst (WEEK-46): dan kan een product direct afgevinkt worden.
  // Met `item` (WEEK-49) worden de details van een product dat al in de frigo staat, gescand.
  const { van, item, lijstItem } = useLocalSearchParams<{ van?: string; item?: string; lijstItem?: string }>();
  const [lijstItems, setLijstItems] = useState<LijstItem[]>([]);
  const [frigoItems, setFrigoItems] = useState<FrigoItem[]>([]);
  const [historiek, setHistoriek] = useState<HistoriekItem[]>([]); // WEEK-302
  useFocusEffect(
    useCallback(() => {
      // WEEK-297: een vorige scan wordt niet bewaard: telkens de scanner opent, start hij bij de camera.
      bezig.current = false;
      sessie.current.nieuw(); // een scan die nog bezig is, toont zijn resultaat niet meer
      setStatus({ soort: 'scannen' });
      setBevestiging(null);
      laadScanTeller().then(setTeller);
      laadLijst().then(setLijstItems);
      laadFrigo().then(setFrigoItems);
      laadHistoriek().then(setHistoriek);
      // WEEK-297: ook bij het verlaten van de scanner het resultaat wissen, zodat het de volgende keer
      // (bv. via het camera-icoon in In huis) zelfs geen ogenblik meer te zien is.
      return () => {
        sessie.current.nieuw();
        setStatus({ soort: 'scannen' });
      };
    }, [van, item, lijstItem])
  );

  const opScan = async ({ data }: BarcodeScanningResult) => {
    setBevestiging(null);
    if (bezig.current) return;
    bezig.current = true;
    if (!magScannen(teller, new Date())) {
      bezig.current = false;
      return;
    }
    const mijnSessie = sessie.current.huidig();
    setTeller(await registreerScan());
    if (!sessie.current.actueel(mijnSessie)) return;
    setStatus({ soort: 'laden', barcode: data });
    try {
      const product = await zoekProduct(data, taal);
      if (!sessie.current.actueel(mijnSessie)) return; // WEEK-297: de scanner werd intussen opnieuw geopend
      setStatus(product ? { soort: 'gevonden', product } : { soort: 'niet-gevonden', barcode: data });
      if (product) bewaarInHistoriek(product).then(setHistoriek); // WEEK-302
    } catch {
      if (sessie.current.actueel(mijnSessie)) setStatus({ soort: 'fout' });
    }
  };

  // Scan sluiten (WEEK-102): terug naar het vorige scherm, of naar het menu als er geen vorig scherm is.
  // WEEK-110: met de herkomst (van) gaat het kruisje naar het scherm waar gescand werd, niet naar de taalkeuze.
  const annuleer = () => {
    const terug = scanTerug(van);
    if (terug) router.navigate(terug);
    else if (router.canGoBack()) router.back();
    else router.navigate('/');
  };

  const opnieuw = () => {
    bezig.current = false;
    sessie.current.nieuw();
    setStatus({ soort: 'scannen' });
  };

  // Het gescande product rechtstreeks in de frigo, in de juiste afdeling (WEEK-35).
  const naarFrigo = async (product: Product) => {
    const naam = scanNaam(product, t('scan.onbekend'));
    await wijzigFrigo((f) => voegZelfToe(f, naam, new Date(), { afdeling: afdelingUitCategorieen(product.categorieen) }));
    opnieuw(); // WEEK-120: de gebruiker blijft op de scanner
    setBevestiging(t('scan.inFrigoGedaan', { naam }));
  };

  // Details van een product dat al in de frigo staat (WEEK-49): het item krijgt de gescande gegevens.
  const bewaarDetails = async (id: string, product: Product) => {
    await wijzigFrigo((f) => voegProductToe(f, id, product));
    opnieuw();
    router.navigate('/frigo');
  };

  // Afvinken op de lijst (WEEK-46): zoals afvinken in de lijst zelf; het product gaat dan in de frigo.
  const vinkOpLijstAf = async (naam: string, matches: LijstItem[], product: Product) => {
    const ids = matches.map((i) => i.id);
    await wijzigLijst((huidig) => vinkAf(huidig, ids, true));
    // De gescande details gaan mee naar de frigo-items (WEEK-50): zo kan het gerecht later zijn totaal tonen.
    const frigo = await wijzigFrigo((f) =>
      matches.reduce((na, i) => voegProductToe(na, `lijst:${i.id}`, product), pasFrigoAan(f, matches, true, new Date()))
    );
    await wijzigPlan((plan) => werkOntbrekendBij(plan, frigo));
    // WEEK-274: geen melding; het vinkje staat op de boodschappenlijst.
    opnieuw();
    router.navigate('/lijst');
  };

  // Product staat al in de frigo (WEEK-48): van de lijst halen; de frigo blijft ongewijzigd.
  const verwijderVanLijst = async (naam: string, matches: LijstItem[]) => {
    const ids = matches.map((i) => i.id);
    await wijzigLijst((huidig) => huidig.filter((i) => !ids.includes(i.id)));
    // WEEK-274: geen melding; je ziet het op de boodschappenlijst.
    opnieuw();
    router.navigate('/lijst');
  };

  // WEEK-302: een product uit de historiek opnieuw bekijken; kost geen scan.
  const toonProduct = (product: Product) => {
    bezig.current = true;
    setBevestiging(null);
    setStatus({ soort: 'gevonden', product });
  };

  // WEEK-306: een alternatief opzoeken (kost geen scan) en in de historiek zetten, zodat je het kan vergelijken.
  const toonAlternatief = async (alt: Alternatief) => {
    bezig.current = true;
    const mijnSessie = sessie.current.nieuw();
    setStatus({ soort: 'laden', barcode: alt.barcode });
    try {
      const product = await zoekProduct(alt.barcode, taal);
      if (!sessie.current.actueel(mijnSessie)) return;
      setStatus(product ? { soort: 'gevonden', product } : { soort: 'niet-gevonden', barcode: alt.barcode });
      if (product) bewaarInHistoriek(product).then(setHistoriek);
    } catch {
      if (sessie.current.actueel(mijnSessie)) setStatus({ soort: 'fout' });
    }
  };

  // WEEK-304: delen via het deelmenu van het toestel.
  const deel = async (product: Product) => {
    try {
      await Share.share({ message: deelTekst(product, taal) });
    } catch {
      if (Platform.OS === 'web') window.alert(t('scan.deelNiet'));
      else Alert.alert(t('scan.delen'), t('scan.deelNiet'));
    }
  };

  const historiekKnop = (
    <Pressable style={s.historiekKnop} onPress={() => setStatus({ soort: 'historiek' })} accessibilityRole="button" accessibilityLabel={t('scan.historiek')}>
      <Ionicons name="time-outline" size={18} color="#fff" />
      <Text style={s.historiekTekst}>{t('scan.historiek')}</Text>
    </Pressable>
  );

  if (status.soort === 'historiek') {
    return (
      <HistoriekScherm
        historiek={historiek}
        voorgekozen={status.voorgekozen}
        onOpen={toonProduct}
        onVergelijk={(a, b) => setStatus({ soort: 'vergelijk', a, b })}
        onWis={async () => { await wisHistoriek(); setHistoriek([]); }}
        onSluit={opnieuw}
      />
    );
  }

  if (status.soort === 'vergelijk') {
    // WEEK-313: vanaf de balk "Vergelijk met" keert Sluiten terug naar het product; anders naar de historiek.
    const terug = status.terug;
    return <VergelijkScherm a={status.a} b={status.b} onOpen={toonProduct} onSluit={() => setStatus(terug ? { soort: 'gevonden', product: terug } : { soort: 'historiek' })} />;
  }

  if (!toestemming) return <View style={s.midden}><ActivityIndicator /></View>;

  // WEEK-302: zonder camera kan je de historiek nog bekijken.
  if (!toestemming.granted && status.soort === 'scannen') {
    return (
      <View style={s.midden}>
        <Text style={s.tekst}>{t('scan.cameraNodig')}</Text>
        <Pressable style={s.knop} onPress={vraagToestemming}>
          <Text style={s.knopTekst}>{t('scan.cameraToestaan')}</Text>
        </Pressable>
        {historiek.length > 0 && historiekKnop}
      </View>
    );
  }

  const rest = resterendeScans(teller, new Date());

  // Beloond filmpje (WEEK-38): pas na een volledig bekeken filmpje komen er extra scans bij.
  const kijkFilmpje = async () => {
    setFilmpjeBezig(true);
    try {
      const gezien = await bekijkBeloondFilmpje();
      if (gezien) setTeller(await registreerBonusScans(beloningVoor('scans')));
      else Alert.alert(t('scan.filmpjeTitel'), t('scan.filmpjeNiet'));
    } finally {
      setFilmpjeBezig(false);
    }
  };

  if (status.soort === 'scannen' && rest === 0) {
    // WEEK-149: geen reset meer om middernacht; het filmpje is de enige weg om verder te scannen.
    // WEEK-274: op de website bestaan geen reclamefilmpjes; daar enkel de uitleg dat de teller morgen opnieuw begint.
    if (Platform.OS === 'web') {
      return (
        <View style={s.midden}>
          <Text style={s.tekst}>{t('scan.limietWeb', { limiet: GRATIS_SCANS_PER_DAG })}</Text>
          {historiek.length > 0 && historiekKnop}
        </View>
      );
    }
    return (
      <View style={s.midden}>
        <Text style={s.tekst}>{t('scan.limiet', { limiet: GRATIS_SCANS_PER_DAG })}</Text>
        <Pressable style={s.knop} onPress={kijkFilmpje} disabled={filmpjeBezig}>
          <Text style={s.knopTekst}>{t('scan.filmpje', { n: BELONING_SCANS })}</Text>
        </Pressable>
        {historiek.length > 0 && historiekKnop}
      </View>
    );
  }

  if (status.soort === 'scannen') {
    return (
      <View style={{ flex: 1 }}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={opScan}
        />
        {bevestiging && (
          <View style={s.bevestiging} pointerEvents="none" accessibilityRole="alert">
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={s.bevestigingTekst}>{bevestiging}</Text>
          </View>
        )}
        <View style={s.overlay} pointerEvents="none">
          <View style={s.kader} />
          <Text style={s.hint}>{t('scan.richt')}</Text>
          <Text style={s.hint}>{t('scan.resterend', { n: rest })}</Text>
        </View>
        {/* WEEK-321: de scan sluiten gebeurt met de terugpijl in de kop (ScanKopTerug); geen tweede pijl op de camera. */}
        {/* WEEK-302/313: onderaan op de camera de laatste 3 scans (tik: openen, lang drukken: vergelijken) en "Alle". */}
        <View style={s.historiekPlaats}>
          {historiek.length > 0 ? (
            <View style={s.laatst}>
              <View style={s.laatstKop}>
                <Text style={s.laatstTitel}>{t('scan.laatstGescand')}</Text>
                <Pressable onPress={() => setStatus({ soort: 'historiek' })} accessibilityRole="button" hitSlop={8}>
                  <Text style={s.laatstAlle}>{t('scan.laatstAlle')} ›</Text>
                </Pressable>
              </View>
              <View style={s.laatstRij}>
                {historiek.slice(0, 3).map((h) => (
                  <Pressable
                    key={h.product.barcode}
                    style={s.laatstItem}
                    onPress={() => toonProduct(h.product)}
                    onLongPress={() => setStatus({ soort: 'historiek', voorgekozen: h.product.barcode })}
                    accessibilityRole="button"
                    accessibilityLabel={h.product.naam || t('scan.onbekend')}
                  >
                    <NutriLetter letter={h.product.nutriscore} />
                    <Text style={s.laatstNaam} numberOfLines={2}>{h.product.naam || t('scan.onbekend')}</Text>
                  </Pressable>
                ))}
              </View>
              {historiek.length > 1 && <Text style={s.laatstUitleg}>{t('scan.laatstUitleg')}</Text>}
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  if (status.soort === 'laden') {
    return <View style={s.midden}><ActivityIndicator size="large" /><Text style={s.tekst}>{t('scan.zoeken')}</Text></View>;
  }

  if (status.soort !== 'gevonden') {
    return (
      <View style={s.midden}>
        <Text style={s.tekst}>
          {status.soort === 'fout' ? t('scan.fout') : t('scan.nietGevonden', { barcode: status.barcode })}
        </Text>
        <Pressable style={s.knop} onPress={opnieuw}><Text style={s.knopTekst}>{t('scan.opnieuw')}</Text></Pressable>
      </View>
    );
  }

  const { product: p } = status;
  const acties = scanActies(van, item);
  const vorige = vorigeVanZelfdeSoort(historiek, p);

  return (
    <ScrollView contentContainerStyle={s.resultaat}>
      <Text style={s.productNaam}>{p.naam || t('scan.onbekend')}</Text>
      {p.merk ? <Text style={s.merk}>{p.merk}</Text> : null}

      {/* WEEK-313: een vorige scan van dezelfde soort (bv. yoghurt na yoghurt): meteen vergelijken. */}
      {vorige && (
        <Pressable style={s.vergelijkBalk} onPress={() => setStatus({ soort: 'vergelijk', a: vorige, b: p, terug: p })} accessibilityRole="button">
          <Ionicons name="git-compare-outline" size={20} color="#fff" />
          <Text style={s.vergelijkBalkTekst} numberOfLines={2}>{t('scan.vergelijkMet', { naam: vorige.naam || t('scan.onbekend') })}</Text>
          <NutriLetter letter={vorige.nutriscore} />
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </Pressable>
      )}

      {/* WEEK-220: Nutri-Score, NOVA, tabel en additieven (standaard ingeklapt). */}
      {/* WEEK-310: key per product, zodat elk product ingeklapt begint. */}
      <ScanBlokken key={p.barcode} product={p} />

      {/* WEEK-306: gezonder alternatief, enkel bij een gekende Nutri-Score C, D of E. Niet op de website: de zoekdienst
          van Open Food Facts laat geen vragen uit een webbrowser toe (CORS); in de app op het toestel werkt het wel. */}
      {Platform.OS !== 'web' && zoektAlternatief(p) && <Alternatieven key={p.barcode} product={p} onOpen={toonAlternatief} />}

      {/* WEEK-303/304: vergelijken met een ander gescand product, en delen. */}
      <View style={s.knoppen}>
        {historiek.some((h) => h.product.barcode !== p.barcode) && (
          <Pressable style={[s.knop, s.knopMetIcoon, s.knopZacht, { flex: 1 }]} onPress={() => setStatus({ soort: 'historiek', voorgekozen: p.barcode })} accessibilityRole="button">
            <Ionicons name="git-compare-outline" size={18} color={KLEUR} />
            <Text style={[s.knopTekst, s.knopZachtTekst]}>{t('scan.vergelijken')}</Text>
          </Pressable>
        )}
        <Pressable style={[s.knop, s.knopMetIcoon, s.knopZacht, { flex: 1 }]} onPress={() => deel(p)} accessibilityRole="button">
          <Ionicons name="share-social-outline" size={18} color={KLEUR} />
          <Text style={[s.knopTekst, s.knopZachtTekst]}>{t('scan.delen')}</Text>
        </Pressable>
      </View>

      {/* Per product (WEEK-70): het gescande product gaat enkel naar het lijstitem waarvandaan gescand werd. */}
      {van === 'lijst' && lijstItem && (() => {
        const ids = lijstItem.split(',');
        const doel = lijstItems.filter((i) => ids.includes(i.id));
        const naam = scanNaam(p, t('scan.onbekend'));
        if (!doel.length) return <Text style={s.bron}>{t('scan.nietOpLijst')}</Text>;
        return (
          <View style={s.knoppen}>
            <Pressable style={[s.knop, { flex: 1 }]} onPress={() => vinkOpLijstAf(naam, doel, p)} accessibilityRole="button">
              <Text style={s.knopTekst}>{t('scan.productToevoegen')}</Text>
            </Pressable>
            <Pressable style={[s.knop, { flex: 1, backgroundColor: MUTED }]} onPress={opnieuw} accessibilityRole="button">
              <Text style={s.knopTekst}>{t('scan.productWeigeren')}</Text>
            </Pressable>
          </View>
        );
      })()}
      {van === 'lijst' && !lijstItem && (() => {
        const naam = scanNaam(p, t('scan.onbekend'));
        const matches = zoekOpLijst(lijstItems, naam);
        if (!matches.length) return <Text style={s.bron}>{t('scan.nietOpLijst')}</Text>;
        const inFrigo = passendeNamen(frigoItems, naam).length > 0;
        return (
          <View style={{ gap: 8 }}>
            {inFrigo && <Text style={s.bron}>{t('scan.alInFrigo')}</Text>}
            <Pressable style={s.knop} onPress={() => vinkOpLijstAf(naam, matches, p)}>
              <Text style={s.knopTekst}>{t('scan.afvinkenOpLijst')}</Text>
            </Pressable>
            {inFrigo && (
              <Pressable style={[s.knop, { backgroundColor: ORANJE }]} onPress={() => verwijderVanLijst(naam, matches)}>
                <Text style={s.knopTekst}>{t('scan.verwijderVanLijst')}</Text>
              </Pressable>
            )}
          </View>
        );
      })()}
      {/* WEEK-298: pagina Scan: enkel Sluiten (terug naar de camera). Vanaf In huis: Sluiten (terug naar In huis) en
          Toevoegen (het product of de details gaan naar In huis). De boodschappenlijst houdt haar eigen knoppen. */}
      {acties !== 'lijst' && (
        <View style={s.knoppen}>
          <Pressable
            style={[s.knop, s.knopMetIcoon, { flex: 1 }, acties.includes('toevoegen') && s.knopZacht]}
            onPress={acties.includes('toevoegen') ? annuleer : opnieuw}
            accessibilityRole="button"
          >
            <Ionicons name="close" size={20} color={acties.includes('toevoegen') ? KLEUR : '#fff'} />
            <Text style={[s.knopTekst, acties.includes('toevoegen') && s.knopZachtTekst]}>{t('scan.sluiten')}</Text>
          </Pressable>
          {acties.includes('toevoegen') && (
            <Pressable style={[s.knop, s.knopMetIcoon, { flex: 1 }]} onPress={() => (item ? bewaarDetails(item, p) : naarFrigo(p))} accessibilityRole="button">
              <Ionicons name="add" size={22} color="#fff" />
              <Text style={s.knopTekst}>{t('scan.toevoegen')}</Text>
            </Pressable>
          )}
        </View>
      )}
      <Text style={s.bron}>{t('scan.bron')}</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  bevestiging: { position: 'absolute', top: 16, left: 64, right: 16, zIndex: 2, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(15,107,102,0.92)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  bevestigingTekst: { color: '#fff', fontWeight: '700', fontSize: 14, flex: 1 },
  midden: { flex: 1, backgroundColor: PAPIER, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  tekst: { fontSize: 16, textAlign: 'center', color: INKT },
  knop: { backgroundColor: KLEUR, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center' },
  knopMetIcoon: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  knopZacht: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: KLEUR },
  knopZachtTekst: { color: KLEUR },
  knopTekst: { color: '#fff', fontWeight: '700', fontSize: 16 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  kader: { width: 260, height: 150, borderWidth: 3, borderColor: '#fff', borderRadius: 16 },
  hint: { color: '#fff', marginTop: 16, fontWeight: '600', textShadowColor: '#000', textShadowRadius: 4 },
  resultaat: { padding: 16, gap: 8, backgroundColor: PAPIER },
  productNaam: { fontSize: 22, fontWeight: '700' },
  merk: { color: MUTED },
  knoppen: { flexDirection: 'row', gap: 10, marginTop: 16 },
  bron: { color: MUTED, fontSize: 12, marginTop: 12, textAlign: 'center' },
  historiekPlaats: { position: 'absolute', bottom: 24, left: 12, right: 12, alignItems: 'center' },
  laatst: { alignSelf: 'stretch', backgroundColor: 'rgba(15,107,102,0.92)', borderRadius: 14, padding: 10, gap: 8 },
  laatstKop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  laatstTitel: { color: '#fff', fontWeight: '700', fontSize: 14 },
  laatstAlle: { color: '#fff', fontWeight: '700', fontSize: 14, textDecorationLine: 'underline' },
  laatstRij: { flexDirection: 'row', gap: 8 },
  laatstItem: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 10, padding: 6 },
  laatstNaam: { flex: 1, minWidth: 0, color: INKT, fontSize: 12, fontWeight: '600' },
  laatstUitleg: { color: '#fff', fontSize: 12, opacity: 0.9 },
  vergelijkBalk: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: KLEUR, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, marginTop: 10 },
  vergelijkBalkTekst: { flex: 1, minWidth: 0, color: '#fff', fontWeight: '700', fontSize: 14 },
  historiekKnop: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(15,107,102,0.92)', borderRadius: 22, paddingVertical: 10, paddingHorizontal: 14 },
  historiekTekst: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
