import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { beoordeel, Oordeel, Product, zoekProduct } from '@/lib/openfoodfacts';
import { bewaarLijst, laadLijst } from '@/opslag/lijst';

const KLEUR = '#2e7d4f';
const LABEL_KLEUR: Record<Oordeel['label'], string> = { Goed: '#2e7d4f', Matig: '#f9a825', 'Liever niet': '#c62828' };

type Status =
  | { soort: 'scannen' }
  | { soort: 'laden'; barcode: string }
  | { soort: 'gevonden'; product: Product; oordeel: Oordeel }
  | { soort: 'niet-gevonden'; barcode: string }
  | { soort: 'fout' };

export default function Scan() {
  const [toestemming, vraagToestemming] = useCameraPermissions();
  const [status, setStatus] = useState<Status>({ soort: 'scannen' });
  const bezig = useRef(false);

  if (!toestemming) return <View style={s.midden}><ActivityIndicator /></View>;

  if (!toestemming.granted) {
    return (
      <View style={s.midden}>
        <Text style={s.tekst}>De camera is nodig om barcodes te scannen.</Text>
        <Pressable style={s.knop} onPress={vraagToestemming}>
          <Text style={s.knopTekst}>Camera toestaan</Text>
        </Pressable>
      </View>
    );
  }

  const opScan = async ({ data }: BarcodeScanningResult) => {
    if (bezig.current) return;
    bezig.current = true;
    setStatus({ soort: 'laden', barcode: data });
    try {
      const product = await zoekProduct(data);
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
    const lijst = await laadLijst();
    const naam = [product.merk, product.naam].filter(Boolean).join(' – ');
    await bewaarLijst([...lijst, { id: `scan-${product.barcode}-${Date.now()}`, naam, categorie: 'Gescand', afgevinkt: true }]);
    opnieuw();
  };

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
          <Text style={s.hint}>Richt de camera op de barcode</Text>
        </View>
      </View>
    );
  }

  if (status.soort === 'laden') {
    return <View style={s.midden}><ActivityIndicator size="large" /><Text style={s.tekst}>Product opzoeken…</Text></View>;
  }

  if (status.soort !== 'gevonden') {
    return (
      <View style={s.midden}>
        <Text style={s.tekst}>
          {status.soort === 'fout' ? 'Er ging iets mis. Controleer je internetverbinding.' : `Product ${status.barcode} niet gevonden in Open Food Facts.`}
        </Text>
        <Pressable style={s.knop} onPress={opnieuw}><Text style={s.knopTekst}>Opnieuw scannen</Text></Pressable>
      </View>
    );
  }

  const { product: p, oordeel } = status;
  const waarde = (v?: number, eenheid = 'g') => (v === undefined ? '–' : `${Math.round(v * 10) / 10} ${eenheid}`);

  return (
    <ScrollView contentContainerStyle={s.resultaat}>
      <Text style={s.productNaam}>{p.naam}</Text>
      {p.merk ? <Text style={s.merk}>{p.merk}</Text> : null}

      <View style={[s.oordeel, { backgroundColor: LABEL_KLEUR[oordeel.label] }]}>
        <Text style={s.score}>{oordeel.score}</Text>
        <Text style={s.label}>{oordeel.label}</Text>
      </View>
      {oordeel.redenen.map((r) => <Text key={r} style={s.reden}>• {r}</Text>)}

      <Text style={s.kop}>Per 100 g</Text>
      <View style={s.tabel}>
        {[
          ['Calorieën', waarde(p.kcal, 'kcal')],
          ['Suikers', waarde(p.suikers)],
          ['Eiwitten', waarde(p.eiwitten)],
          ['Vet', waarde(p.vet)],
          ['Zout', waarde(p.zout)],
        ].map(([k, v]) => (
          <View key={k} style={s.tabelRij}><Text>{k}</Text><Text style={{ fontWeight: '600' }}>{v}</Text></View>
        ))}
      </View>

      <Text style={s.kop}>Additieven</Text>
      <Text style={s.tekstLinks}>{p.additieven.length ? p.additieven.join(', ') : 'Geen gekend'}</Text>

      <View style={s.knoppen}>
        <Pressable style={[s.knop, { flex: 1, backgroundColor: '#c62828' }]} onPress={opnieuw}>
          <Text style={s.knopTekst}>Afwijzen</Text>
        </Pressable>
        <Pressable style={[s.knop, { flex: 1 }]} onPress={() => accepteer(p)}>
          <Text style={s.knopTekst}>Accepteren</Text>
        </Pressable>
      </View>
      <Text style={s.bron}>Gegevens: Open Food Facts (openfoodfacts.org). Geen medisch advies.</Text>
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
  bron: { color: '#999', fontSize: 12, marginTop: 12, textAlign: 'center' },
});
