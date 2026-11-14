// Het resultaat van een gescand product (WEEK-220): onze eigen berekening bovenaan, dan Nutri-Score en NOVA,
// de voedingstabel gegroepeerd in plus- en minpunten, en de additieven (ingeklapt, met EU-waarschuwing: WEEK-224).
// Gedeeld door het scanscherm en de productdetails in de frigo.
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { additiefWeergave, type AdditiefWeergave } from '@/data/additieven';
import { additievenMetRegel, telEuRegels, type EuStatus } from '@/data/euAdditieven';
import { Sleutel, voedingGetal } from '@/i18n';
import { isDrank, type Oordeel, type Product } from '@/lib/openfoodfacts';
import { voedingstabel, type Beoordeling, type Grens, type RijSleutel, type TabelRij } from '@/lib/voedingstabel';
import { useTaal } from '@/ui/taal';

const INKT = '#17201A';
const MUTED = '#5E6B63';
const LIJN = '#E3E3DC';
const ACCENT = '#A9472A';

// Kleuren van de officiële Nutri-Score; tekst donker op de lichte vakken voor het contrast.
const NUTRI: { letter: string; bg: string; tekst: string }[] = [
  { letter: 'a', bg: '#038141', tekst: '#fff' },
  { letter: 'b', bg: '#85BB2F', tekst: '#1c2b08' },
  { letter: 'c', bg: '#FECB02', tekst: '#3a2f00' },
  { letter: 'd', bg: '#EE8100', tekst: '#fff' },
  { letter: 'e', bg: '#E63E11', tekst: '#fff' },
];
const NOVA: { groep: number; bg: string; tekst: string }[] = [
  { groep: 1, bg: '#2e7d4f', tekst: '#fff' },
  { groep: 2, bg: '#A8C23D', tekst: '#1c2b08' },
  { groep: 3, bg: '#E8A33D', tekst: '#3a2400' },
  { groep: 4, bg: '#B3402A', tekst: '#fff' },
];
const SCHAAL = { slecht: '#B3402A', matig: '#E8A33D', goed: '#2e7d4f' };

// Icoon en kleur per beoordeling in de tabel: vierkantje met icoon en een gekleurd label voor de waarde.
const STIJL: Record<Beoordeling, { icoon: keyof typeof Ionicons.glyphMap; bg: string; tekst: string }> = {
  goed: { icoon: 'checkmark', bg: '#DCEFE3', tekst: '#1D5A38' },
  gemiddeld: { icoon: 'remove', bg: '#FBEBCF', tekst: '#7A4A06' },
  teVeel: { icoon: 'arrow-up', bg: '#F8DCD3', tekst: '#8A2C14' },
  info: { icoon: 'information', bg: '#EEEEE8', tekst: MUTED },
};

// Additieven waar de EU-wet iets over zegt (WEEK-224): rood = niet meer toegelaten, oranje = verplichte waarschuwing.
const EU_STIJL: Record<EuStatus, { rand: string; bg: string; tekst: string }> = {
  verboden: { rand: '#B3402A', bg: '#F8DCD3', tekst: '#8A2C14' },
  waarschuwing: { rand: '#E8A33D', bg: '#FBEBCF', tekst: '#7A4A06' },
};

const LABEL: Record<RijSleutel, Sleutel> = {
  kcal: 'voeding.kcal',
  vet: 'voeding.vet',
  verzadigd: 'voeding.waarvanVerzadigd',
  koolhydraten: 'voeding.koolhydraten',
  suikers: 'voeding.waarvanSuikers',
  vezels: 'voeding.vezels',
  eiwitten: 'voeding.eiwitten',
  zout: 'voeding.zout',
};

function Balk({ vakken, actief }: { vakken: { sleutel: string; tekst: string; bg: string; kleur: string }[]; actief?: string }) {
  return (
    <View style={s.balk}>
      {vakken.map((v) => {
        const aan = v.sleutel === actief;
        return (
          <View
            key={v.sleutel}
            style={[s.vak, { backgroundColor: v.bg }, aan && s.vakActief, aan && { flex: 1.5 }]}
            accessibilityState={{ selected: aan }}
          >
            <Text style={[s.vakTekst, { color: v.kleur }, aan && { fontSize: 24 }]}>{v.tekst}</Text>
          </View>
        );
      })}
    </View>
  );
}

function Kaart({ titel, kant, nadruk, children }: { titel: string; kant?: string; nadruk?: boolean; children: React.ReactNode }) {
  return (
    <View style={[s.kaart, nadruk && s.kaartNadruk]}>
      <View style={s.kaartKop}>
        <Text style={s.kaartTitel}>{titel}</Text>
        {kant ? <Text style={s.kant}>{kant}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export function ScanBlokken({ product: p, oordeel }: { product: Product; oordeel: Oordeel }) {
  const { t, tn, taal } = useTaal();
  const [additievenOpen, setAdditievenOpen] = useState(false); // standaard ingeklapt
  const telling = telEuRegels(p.additieven);
  const ernst: EuStatus | null = telling.verboden ? 'verboden' : telling.waarschuwing ? 'waarschuwing' : null;
  const drank = isDrank(p);
  const tabel = voedingstabel(p, drank);
  const g = (n: number) => voedingGetal(taal, n); // WEEK-291: geen afronding op 1 decimaal

  const waarde = (r: TabelRij) => (r.waarde === undefined ? '–' : `${g(r.waarde)} ${r.sleutel === 'kcal' ? 'kcal' : 'g'}`);
  const grensTekst = (grens: Grens) => {
    switch (grens.code) {
      case 'laag': return t('grens.laag', { max: g(grens.max) });
      case 'midden': return t('grens.midden', { min: g(grens.min), max: g(grens.max) });
      case 'hoog': return t('grens.hoog', { min: g(grens.min) });
      case 'vezels': return t('grens.vezels', { min: g(grens.min) });
      case 'eiwit': return t('grens.eiwit', { procent: grens.procent });
    }
  };

  const Rij = ({ r }: { r: TabelRij }) => {
    const stijl = STIJL[r.beoordeling];
    return (
      <View style={s.rij} accessibilityLabel={`${t(LABEL[r.sleutel])}: ${waarde(r)}${r.grens ? `, ${grensTekst(r.grens)}` : ''}`}>
        <View style={[s.icoon, { backgroundColor: stijl.bg }]}>
          <Ionicons name={stijl.icoon} size={17} color={stijl.tekst} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.rijNaam}>{t(LABEL[r.sleutel])}</Text>
          {r.grens ? <Text style={s.rijGrens}>{grensTekst(r.grens)}</Text> : null}
        </View>
        <View style={[s.waarde, r.beoordeling !== 'info' && { backgroundColor: stijl.bg }]}>
          <Text style={[s.waardeTekst, r.beoordeling !== 'info' && { color: stijl.tekst }]}>{waarde(r)}</Text>
        </View>
      </View>
    );
  };

  const groepen: { sleutel: keyof typeof tabel; titel: Sleutel; kleur: string }[] = [
    { sleutel: 'plus', titel: 'scan.groepPlus', kleur: STIJL.goed.tekst },
    { sleutel: 'min', titel: 'scan.groepMin', kleur: STIJL.teVeel.tekst },
    { sleutel: 'overig', titel: 'scan.groepOverig', kleur: MUTED },
  ];
  const zichtbaar = groepen.filter((gr) => tabel[gr.sleutel].length > 0); // een lege groep verdwijnt

  // WEEK-290: het EFSA-risico op te veel inname, in gewone taal, met de link naar het advies.
  const Efsa = ({ efsa }: { efsa: NonNullable<AdditiefWeergave['efsa']> }) => (
    <View style={s.efsa}>
      <Text style={s.efsaTekst}>{t(`efsa.${efsa.risico}`, { bron: efsa.jaar ? `EFSA (${efsa.jaar})` : 'EFSA' })}</Text>
      {efsa.url ? (
        <Pressable onPress={() => Linking.openURL(efsa.url!)} accessibilityRole="link" hitSlop={6}>
          <Text style={s.efsaLink}>{t('efsa.link')}</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <View style={s.root}>
      <Kaart titel={t('scan.eigenTitel')} kant={t('scan.eigenLabel')} nadruk>
        <View style={s.scoreRij}>
          <Text style={s.score}>{oordeel.score}</Text>
          <Text style={s.uitleg}>{t('scan.eigenVan')} · </Text>
          <Text style={[s.scoreLabel, { color: SCHAAL[oordeel.label] }]}>{t(`oordeel.${oordeel.label}`)}</Text>
        </View>
        <View style={s.schaalWrap}>
          <View style={s.schaal}>
            <View style={{ flex: 40, backgroundColor: SCHAAL.slecht }} />
            <View style={{ flex: 25, backgroundColor: SCHAAL.matig }} />
            <View style={{ flex: 35, backgroundColor: SCHAAL.goed }} />
          </View>
          <Text style={[s.pijl, { left: `${oordeel.score}%` }]}>▼</Text>
        </View>
        <View style={s.schaalGetallen}>
          <Text style={s.klein}>0</Text>
          <Text style={s.klein}>40</Text>
          <Text style={s.klein}>65</Text>
          <Text style={s.klein}>100</Text>
        </View>
        {/* WEEK-290: zeg waarom de score niet hoger kan. */}
        {oordeel.plafond && <Text style={s.plafond}>{t(`scan.plafond.${oordeel.plafond.reden}`)}</Text>}
      </Kaart>

      <Kaart titel={t('scan.nutriscoreTitel')} kant={t('scan.bronOff')}>
        {p.nutriscore ? (
          <Balk
            actief={p.nutriscore}
            vakken={NUTRI.map((n) => ({ sleutel: n.letter, tekst: n.letter.toUpperCase(), bg: n.bg, kleur: n.tekst }))}
          />
        ) : (
          <Text style={s.uitleg}>{t('scan.nutriscoreOnbekend')}</Text>
        )}
        <Text style={s.uitleg}>{t('scan.nutriscoreUitleg')}</Text>
      </Kaart>

      <Kaart titel={t('scan.novaTitel')} kant={t('scan.bronOff')}>
        {p.nova ? (
          <Balk
            actief={String(p.nova)}
            vakken={NOVA.map((n) => ({ sleutel: String(n.groep), tekst: String(n.groep), bg: n.bg, kleur: n.tekst }))}
          />
        ) : (
          <Text style={s.uitleg}>{t('scan.novaOnbekend')}</Text>
        )}
        <Text style={s.uitleg}>{t('scan.novaUitleg')}</Text>
      </Kaart>

      <Text style={s.kop}>{t(drank ? 'scan.per100ml' : 'scan.per100')}</Text>
      <View style={s.tabel}>
        {zichtbaar.map((gr, i) => (
          <View key={gr.sleutel} style={i > 0 && s.groepScheiding}>
            <Text style={[s.groepTitel, { color: gr.kleur }]} accessibilityRole="header">{t(gr.titel)}</Text>
            {tabel[gr.sleutel].map((r) => <Rij key={r.sleutel} r={r} />)}
          </View>
        ))}
      </View>

      {/* WEEK-224: ook ingeklapt zie je of er een additief tussen zit waar de EU-wet iets over zegt. */}
      <View style={[s.kaart, ernst && { borderColor: EU_STIJL[ernst].rand, borderWidth: 1.5 }]}>
        <Pressable
          style={s.additievenKop}
          onPress={() => setAdditievenOpen((o) => !o)}
          accessibilityRole="button"
          accessibilityState={{ expanded: additievenOpen }}
        >
          <Text style={s.kaartTitel}>{t('scan.additievenAantal', { n: p.additieven.length })}</Text>
          <Ionicons name={additievenOpen ? 'chevron-up' : 'chevron-down'} size={18} color={MUTED} />
        </Pressable>
        {(['verboden', 'waarschuwing'] as const).map((status) =>
          telling[status] ? (
            <View key={status} style={[s.euBalk, { backgroundColor: EU_STIJL[status].bg }]}>
              <Ionicons name="warning-outline" size={17} color={EU_STIJL[status].tekst} />
              <Text style={[s.euBalkTekst, { color: EU_STIJL[status].tekst }]}>
                {tn(status === 'verboden' ? 'scan.euVerboden' : 'scan.euWaarschuwing', telling[status])}
              </Text>
            </View>
          ) : null,
        )}
        {additievenOpen &&
          (p.additieven.length ? (
            additievenMetRegel(p.additieven).map(({ tag, regel }) => {
              const { code, omschrijving, efsa } = additiefWeergave(tag, taal);
              if (!regel) {
                return (
                  <View key={tag} style={s.additief}>
                    <Text style={s.additiefCode}>{code}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.additiefTekst}>{omschrijving ?? ''}</Text>
                      {efsa && <Efsa efsa={efsa} />}
                    </View>
                  </View>
                );
              }
              const stijl = EU_STIJL[regel.status];
              return (
                <View key={tag} style={[s.euAdditief, { backgroundColor: stijl.bg }]}>
                  <View style={[s.euIcoon, { backgroundColor: stijl.rand }]}>
                    <Ionicons name="warning-outline" size={15} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.additiefTekst}>
                      <Text style={{ fontWeight: '800', color: ACCENT }}>{code} </Text>
                      {omschrijving ?? ''}
                    </Text>
                    <Text style={[s.euTekst, { color: stijl.tekst }]}>{t(`eu.${regel.status}`)}</Text>
                    <Text style={s.klein}>{t(`eu.bron.${regel.bron}` as Sleutel)}</Text>
                    {efsa && <Efsa efsa={efsa} />}
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={s.uitleg}>{t('scan.geenAdditieven')}</Text>
          ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 12 },
  kaart: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: LIJN, padding: 14, gap: 10 },
  kaartNadruk: { borderWidth: 2, borderColor: INKT },
  kaartKop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  kaartTitel: { fontSize: 15, fontWeight: '700', color: INKT },
  kant: { fontSize: 12, color: MUTED },
  uitleg: { fontSize: 12, lineHeight: 17, color: MUTED },
  klein: { fontSize: 11, color: MUTED },
  balk: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 48 },
  vak: { flex: 1, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  vakActief: { height: 48, borderRadius: 10, borderWidth: 3, borderColor: INKT },
  vakTekst: { fontWeight: '800', fontSize: 16 },
  scoreRij: { flexDirection: 'row', alignItems: 'baseline' },
  score: { fontSize: 36, fontWeight: '800', color: INKT, marginRight: 8 },
  scoreLabel: { fontSize: 14, fontWeight: '700' },
  schaalWrap: { height: 34, justifyContent: 'flex-end' },
  schaal: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden' },
  pijl: { position: 'absolute', top: 0, marginLeft: -7, fontSize: 14, color: INKT },
  schaalGetallen: { flexDirection: 'row', justifyContent: 'space-between' },
  kop: { fontSize: 16, fontWeight: '700', color: INKT, marginTop: 4 },
  tabel: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: LIJN, paddingBottom: 6 },
  groepScheiding: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: LIJN, marginHorizontal: 12, marginTop: 6 },
  groepTitel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 },
  rij: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 12 },
  icoon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rijNaam: { fontSize: 14, color: INKT },
  rijGrens: { fontSize: 11, color: MUTED, marginTop: 1 },
  waarde: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 },
  waardeTekst: { fontSize: 13, fontWeight: '700', color: INKT },
  additievenKop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  additief: { flexDirection: 'row', alignItems: 'baseline', gap: 10, paddingVertical: 4 },
  additiefCode: { minWidth: 64, fontWeight: '800', color: ACCENT },
  additiefTekst: { flex: 1, color: INKT },
  plafond: { fontSize: 13, color: INKT, fontWeight: '600' },
  efsa: { marginTop: 3, gap: 2 },
  efsaTekst: { fontSize: 12, lineHeight: 17, color: '#7A4A06' },
  efsaLink: { fontSize: 12, fontWeight: '700', color: '#1D5A38', textDecorationLine: 'underline' },
  euBalk: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 10 },
  euBalkTekst: { flex: 1, fontSize: 13, fontWeight: '600' },
  euAdditief: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 8, padding: 10 },
  euIcoon: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  euTekst: { fontSize: 13, marginTop: 2 },
});
