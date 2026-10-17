import { useCallback, useRef, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { afdelingUitCategorieen, beoordeel, Oordeel, Product, scanNaam, zoekProduct } from '@/lib/openfoodfacts';
import { voegProductToe, voegZelfToe } from '@/lib/frigo';
import { GRATIS_SCANS_PER_DAG, magScannen, minutenTotReset, resterendeScans, ScanTeller } from '@/lib/scanteller';
import { laadScanTeller, registreerScan } from '@/opslag/scanteller';
import { laadFrigo, wijzigFrigo } from '@/opslag/frigo';
import { laadLijst, wijzigLijst } from '@/opslag/lijst';
import { pasFrigoAan, type FrigoItem } from '@/lib/frigo';
import { vinkAf, type LijstItem } from '@/lib/lijst';
import { passendeNamen, zoekOpLijst } from '@/lib/scanLijst';
import { werkOntbrekendBij } from '@/lib/planner/status';
import { wijzigPlan } from '@/opslag/plan';
import { getal, Sleutel } from '@/i18n';
import { useTaal } from '@/ui/taal';

const KLEUR = '#2e7d4f';
const LABEL_KLEUR: Record<Oordeel['label'], string> = { goed: '#2e7d4f', matig: '#f9a825', slecht: '#c62828' };

type Status =
  | { soort: 'scannen' }
  | { soort: 'laden'; barcode: string }
  | { soort: 'gevonden'; product: Product; oordeel: Oordeel }
  | { soort: 'niet-gevonden'; barcode: string }
  | { soort: 'fout' };

export default function Scan() {
  const { t, taal } = useTaal();
  const [toestemming, vraagToestemming] = useCameraPermissions();
  const [status, setStatus] = useState<Status>({ soort: 'scannen' });
  const bezig = useRef(false);
  // Scanlimiet (WEEK-34): 3 per dag.
  const [teller, setTeller] = useState<ScanTeller | null>(null);
  // Gescand vanaf de boodschappenlijst (WEEK-46): dan kan een product direct afgevinkt worden.
  // Met `item` (WEEK-49) worden de details van een product dat al in de frigo staat, gescand.
  const { van, item } = useLocalSearchParams<{ van?: string; item?: string }>();
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

  const opnieuw = () => {
    bezig.current = false;
    setStatus({ soort: 'scannen' });
  };

  const accepteer = async (product: Product) => {
    const naam = scanNaam(product, t('scan.onbekend'));
    await wijzigLijst((lijst) => [...lijst, { id: `scan-${product.barcode}-${Date.now()}`, naam, categorie: 'gescand', afgevinkt: true }]);
    opnieuw();
  };

  // Het gescande product rechtstreeks in de frigo, in de juiste afdeling (WEEK-35).
  const naarFrigo = async (product: Product) => {
    const naam = scanNaam(product, t('scan.onbekend'));
    await wijzigFrigo((f) => voegZelfToe(f, naam, new Date(), { afdeling: afdelingUitCategorieen(product.categorieen) }));
    Alert.alert(t('scan.inFrigo'), t('scan.inFrigoGedaan', { naam }));
    opnieuw();
    if (van === 'frigo') router.navigate('/frigo');
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

  if (status.soort === 'scannen' && rest === 0) {
    const reset = minutenTotReset(new Date());
    return (
      <View style={s.midden}>
        <Text style={s.tekst}>{t('scan.limiet', { limiet: GRATIS_SCANS_PER_DAG })}</Text>
        {/* Aftelling tot de reset om middernacht (WEEK-51). */}
        <Text style={s.tekst}>{t('scan.reset', { uren: String(Math.floor(reset / 60)), minuten: String(reset % 60) })}</Text>
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
        <View style={s.overlay}>
          <View style={s.kader} />
          <Text style={s.hint}>{t('scan.richt')}</Text>
          <Text style={s.hint}>{t('scan.resterend', { n: rest })}</Text>
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

  const { product: p, oordeel } = status;
  const waarde = (v?: number, eenheid = 'g') => (v === undefined ? '–' : `${getal(taal, v)} ${eenheid}`);

  return (
    <ScrollView contentContainerStyle={s.resultaat}>
      <Text style={s.productNaam}>{p.naam || t('scan.onbekend')}</Text>
      {p.merk ? <Text style={s.merk}>{p.merk}</Text> : null}

      <View style={[s.oordeel, { backgroundColor: LABEL_KLEUR[oordeel.label] }]}>
        <Text style={s.score}>{oordeel.score}</Text>
        <Text style={s.label}>{t(`oordeel.${oordeel.label}`)}</Text>
      </View>
      {oordeel.redenen.map((r) => (
        <Text key={r.code} style={s.reden}>
          • {t(`reden.${r.code}` as Sleutel, { waarde: typeof r.waarde === 'number' ? getal(taal, r.waarde) : r.waarde ?? '' })}
        </Text>
      ))}

      <Text style={s.kop}>{t('scan.per100')}</Text>
      <View style={s.tabel}>
        {[
          [t('voeding.kcal'), waarde(p.kcal, 'kcal')],
          [t('voeding.suikers'), waarde(p.suikers)],
          [t('voeding.eiwitten'), waarde(p.eiwitten)],
          [t('voeding.vet'), waarde(p.vet)],
          [t('voeding.zout'), waarde(p.zout)],
        ].map(([k, v]) => (
          <View key={k} style={s.tabelRij}><Text>{k}</Text><Text style={{ fontWeight: '600' }}>{v}</Text></View>
        ))}
      </View>

      <Text style={s.kop}>{t('scan.additieven')}</Text>
      <Text style={s.tekstLinks}>{p.additieven.length ? p.additieven.join(', ') : t('scan.geenAdditieven')}</Text>

      {van === 'lijst' && (() => {
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
              <Pressable style={[s.knop, { backgroundColor: '#c62828' }]} onPress={() => verwijderVanLijst(naam, matches)}>
                <Text style={s.knopTekst}>{t('scan.verwijderVanLijst')}</Text>
              </Pressable>
            )}
          </View>
        );
      })()}
      {/* Details van een frigo-item (WEEK-49): enkel de gegevens koppelen, het item zelf blijft zoals het is. */}
      {item ? (
        <View style={s.knoppen}>
          <Pressable style={[s.knop, { flex: 1, backgroundColor: '#c62828' }]} onPress={opnieuw}>
            <Text style={s.knopTekst}>{t('scan.afwijzen')}</Text>
          </Pressable>
          <Pressable style={[s.knop, { flex: 1 }]} onPress={() => bewaarDetails(item, p)}>
            <Text style={s.knopTekst}>{t('scan.detailsBewaren')}</Text>
          </Pressable>
        </View>
      ) : van === 'frigo' ? (
        /* Scannen vanaf de frigo (WEEK-47): het product gaat direct in de frigo. */
        <View style={s.knoppen}>
          <Pressable style={[s.knop, { flex: 1, backgroundColor: '#c62828' }]} onPress={opnieuw}>
            <Text style={s.knopTekst}>{t('scan.afwijzen')}</Text>
          </Pressable>
          <Pressable style={[s.knop, { flex: 1 }]} onPress={() => naarFrigo(p)}>
            <Text style={s.knopTekst}>{t('scan.inFrigo')}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={s.knoppen}>
            <Pressable style={[s.knop, { flex: 1, backgroundColor: '#c62828' }]} onPress={opnieuw}>
              <Text style={s.knopTekst}>{t('scan.afwijzen')}</Text>
            </Pressable>
            <Pressable style={[s.knop, { flex: 1 }]} onPress={() => accepteer(p)}>
              <Text style={s.knopTekst}>{t('scan.accepteren')}</Text>
            </Pressable>
          </View>
          <Pressable style={[s.knop, s.frigoKnop]} onPress={() => naarFrigo(p)}>
            <Text style={[s.knopTekst, { color: KLEUR }]}>{t('scan.inFrigo')}</Text>
          </Pressable>
        </>
      )}
      <Text style={s.bron}>{t('scan.bron')}</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  midden: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  tekst: { fontSize: 16, textAlign: 'center', color: '#444' },
  tekstLinks: { fontSize: 15, color: '#444' },
  knop: { backgroundColor: KLEUR, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center' },
  knopTekst: { color: '#fff', fontWeight: '700', fontSize: 16 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  kader: { width: 260, height: 150, borderWidth: 3, borderColor: '#fff', borderRadius: 16 },
  hint: { color: '#fff', marginTop: 16, fontWeight: '600', textShadowColor: '#000', textShadowRadius: 4 },
  resultaat: { padding: 16, gap: 8 },
  productNaam: { fontSize: 22, fontWeight: '700' },
  merk: { color: '#777' },
  oordeel: { borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 8 },
  score: { color: '#fff', fontSize: 36, fontWeight: '800' },
  label: { color: '#fff', fontSize: 20, fontWeight: '700' },
  reden: { color: '#444' },
  kop: { fontWeight: '700', marginTop: 12 },
  tabel: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e5e5' },
  tabelRij: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#e5e5e5' },
  knoppen: { flexDirection: 'row', gap: 10, marginTop: 16 },
  frigoKnop: { backgroundColor: '#fff', borderWidth: 2, borderColor: KLEUR, marginTop: 4 },
  bron: { color: '#999', fontSize: 12, marginTop: 12, textAlign: 'center' },
});
