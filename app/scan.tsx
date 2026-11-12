import { useCallback, useRef, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TerugKnop } from '@/ui/terugKnop';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { afdelingUitCategorieen, beoordeel, Oordeel, Product, scanNaam, zoekProduct } from '@/lib/openfoodfacts';
import { voegProductToe, voegZelfToe } from '@/lib/frigo';
import { GRATIS_SCANS_PER_DAG, magScannen, resterendeScans, ScanTeller } from '@/lib/scanteller';
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
  | { soort: 'gevonden'; product: Product; oordeel: Oordeel }
  | { soort: 'niet-gevonden'; barcode: string }
  | { soort: 'fout' };

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
  // Scanlimiet (WEEK-34, WEEK-38): 10 gratis per dag (GRATIS_SCANS_PER_DAG), plus bonusscans van het reclamefilmpje.
  const [teller, setTeller] = useState<ScanTeller | null>(null);
  // Reclamefilmpje voor extra scans (WEEK-38): knop uitgeschakeld tijdens het laden.
  const [filmpjeBezig, setFilmpjeBezig] = useState(false);
  // Gescand vanaf de boodschappenlijst (WEEK-46): dan kan een product direct afgevinkt worden.
  // Met `item` (WEEK-49) worden de details van een product dat al in de frigo staat, gescand.
  const { van, item, lijstItem } = useLocalSearchParams<{ van?: string; item?: string; lijstItem?: string }>();
  const [lijstItems, setLijstItems] = useState<LijstItem[]>([]);
  const [frigoItems, setFrigoItems] = useState<FrigoItem[]>([]);
  useFocusEffect(
    useCallback(() => {
      laadScanTeller().then(setTeller);
      laadLijst().then(setLijstItems);
      laadFrigo().then(setFrigoItems);
    }, [])
  );

  if (!toestemming) return <View style={s.midden}><ActivityIndicator /></View>;

  if (!toestemming.granted) {
    return (
      <View style={s.midden}>
        <Text style={s.tekst}>{t('scan.cameraNodig')}</Text>
        <Pressable style={s.knop} onPress={vraagToestemming}>
          <Text style={s.knopTekst}>{t('scan.cameraToestaan')}</Text>
        </Pressable>
      </View>
    );
  }

  const opScan = async ({ data }: BarcodeScanningResult) => {
    if (bezig.current) return;
    bezig.current = true;
    if (!magScannen(teller, new Date())) {
      bezig.current = false;
      return;
    }
    setTeller(await registreerScan());
    setStatus({ soort: 'laden', barcode: data });
    try {
      const product = await zoekProduct(data, taal);
      setStatus(product ? { soort: 'gevonden', product, oordeel: beoordeel(product) } : { soort: 'niet-gevonden', barcode: data });
    } catch {
      setStatus({ soort: 'fout' });
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
    setStatus({ soort: 'scannen' });
  };

  // Het gescande product rechtstreeks in de frigo, in de juiste afdeling (WEEK-35).
  const naarFrigo = async (product: Product) => {
    const naam = scanNaam(product, t('scan.onbekend'));
    await wijzigFrigo((f) => voegZelfToe(f, naam, new Date(), { afdeling: afdelingUitCategorieen(product.categorieen) }));
    Alert.alert(t('scan.inFrigo'), t('scan.inFrigoGedaan', { naam }));
    opnieuw(); // WEEK-120: de gebruiker blijft op de scanner
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
    Alert.alert(naam, t('scan.afgevinkt', { naam }));
    opnieuw();
    router.navigate('/lijst');
  };

  // Product staat al in de frigo (WEEK-48): van de lijst halen; de frigo blijft ongewijzigd.
  const verwijderVanLijst = async (naam: string, matches: LijstItem[]) => {
    const ids = matches.map((i) => i.id);
    await wijzigLijst((huidig) => huidig.filter((i) => !ids.includes(i.id)));
    Alert.alert(naam, t('scan.verwijderdVanLijst', { naam }));
    opnieuw();
    router.navigate('/lijst');
  };

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
    return (
      <View style={s.midden}>
        <Text style={s.tekst}>{t('scan.limiet', { limiet: GRATIS_SCANS_PER_DAG })}</Text>
        <Pressable style={s.knop} onPress={kijkFilmpje} disabled={filmpjeBezig}>
          <Text style={s.knopTekst}>{t('scan.filmpje', { n: BELONING_SCANS })}</Text>
        </Pressable>
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
        <View style={s.overlay} pointerEvents="none">
          <View style={s.kader} />
          <Text style={s.hint}>{t('scan.richt')}</Text>
          <Text style={s.hint}>{t('scan.resterend', { n: rest })}</Text>
        </View>
        {/* WEEK-102: de scan sluiten. WEEK-120: enkel bij scannen vanuit de lijst of de frigo.
            WEEK-177: staat ná de overlay, zodat de overlay de knop niet meer afdekt. */}
        {scanTerug(van) !== undefined && (
          <TerugKnop onPress={annuleer} kleur="#fff" style={s.annuleer} />
        )}
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

  const { product: p, oordeel } = status;

  return (
    <ScrollView contentContainerStyle={s.resultaat}>
      <Text style={s.productNaam}>{p.naam || t('scan.onbekend')}</Text>
      {p.merk ? <Text style={s.merk}>{p.merk}</Text> : null}

      {/* WEEK-220: Nutri-Score, NOVA, onze berekening, tabel en additieven (standaard ingeklapt). */}
      <ScanBlokken product={p} oordeel={oordeel} />

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
      {/* Details van een frigo-item (WEEK-49): enkel de gegevens koppelen, het item zelf blijft zoals het is. */}
      {item ? (
        <View style={s.knoppen}>
          <Pressable style={[s.knop, { flex: 1, backgroundColor: ORANJE }]} onPress={opnieuw}>
            <Text style={s.knopTekst}>{t('scan.afwijzen')}</Text>
          </Pressable>
          <Pressable style={[s.knop, { flex: 1 }]} onPress={() => bewaarDetails(item, p)}>
            <Text style={s.knopTekst}>{t('scan.detailsBewaren')}</Text>
          </Pressable>
        </View>
      ) : van === 'frigo' ? (
        /* Scannen vanaf de frigo (WEEK-47): het product gaat direct in de frigo. */
        <View style={s.knoppen}>
          <Pressable style={[s.knop, { flex: 1, backgroundColor: ORANJE }]} onPress={opnieuw}>
            <Text style={s.knopTekst}>{t('scan.afwijzen')}</Text>
          </Pressable>
          <Pressable style={[s.knop, { flex: 1 }]} onPress={() => naarFrigo(p)}>
            <Text style={s.knopTekst}>{t('scan.inFrigo')}</Text>
          </Pressable>
        </View>
      ) : (
        /* Gewoon scannen (WEEK-71): enkel terug naar de camera, geen afwijzen of op de lijst zetten. */
        <Pressable style={s.knop} onPress={opnieuw} accessibilityRole="button">
          <Text style={s.knopTekst}>{t('scan.terug')}</Text>
        </Pressable>
      )}
      <Text style={s.bron}>{t('scan.bron')}</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  midden: { flex: 1, backgroundColor: PAPIER, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  tekst: { fontSize: 16, textAlign: 'center', color: INKT },
  knop: { backgroundColor: KLEUR, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center' },
  knopTekst: { color: '#fff', fontWeight: '700', fontSize: 16 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  annuleer: { position: 'absolute', top: 16, left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  kader: { width: 260, height: 150, borderWidth: 3, borderColor: '#fff', borderRadius: 16 },
  hint: { color: '#fff', marginTop: 16, fontWeight: '600', textShadowColor: '#000', textShadowRadius: 4 },
  resultaat: { padding: 16, gap: 8, backgroundColor: PAPIER },
  productNaam: { fontSize: 22, fontWeight: '700' },
  merk: { color: MUTED },
  knoppen: { flexDirection: 'row', gap: 10, marginTop: 16 },
  bron: { color: MUTED, fontSize: 12, marginTop: 12, textAlign: 'center' },
});
