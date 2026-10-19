import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { onthoudVertrekUitGezinsprofiel } from '@/lib/planner/startfase';
import {
  aantalPersonen,
  MAX_KINDEREN,
  MAX_VOLWASSENEN,
  Profiel,
  ProfielFout,
  standaardProfiel,
  valideerProfiel,
} from '@/lib/profiel';
import { bewaarProfiel, laadProfiel } from '@/opslag/profiel';
import { zoekPlaats } from '@/opslag/winkels';
import { Sleutel } from '@/i18n';
import { useTaal } from '@/ui/taal';
import { GezinsRuimte } from '@/ui/gezinsruimte';

const KLEUR = '#2e7d4f';

const FOUT_MAX: Record<ProfielFout, number | undefined> = {
  volwassenen: MAX_VOLWASSENEN,
  kinderen: MAX_KINDEREN,
  postcodeLeeg: undefined,
  postcode: undefined,
  gemeente: undefined,
  land: undefined,
};

function Teller({ waarde, min, max, onChange }: { waarde: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <View style={s.teller}>
      <Pressable style={[s.tellerKnop, waarde <= min && s.uit]} disabled={waarde <= min} onPress={() => onChange(waarde - 1)}>
        <Text style={s.tellerTekst}>−</Text>
      </Pressable>
      <Text style={s.tellerWaarde}>{waarde}</Text>
      <Pressable style={[s.tellerKnop, waarde >= max && s.uit]} disabled={waarde >= max} onPress={() => onChange(waarde + 1)}>
        <Text style={s.tellerTekst}>+</Text>
      </Pressable>
    </View>
  );
}

export default function ProfielScherm() {
  const { t, tn } = useTaal();
  const [profiel, setProfiel] = useState<Profiel>(standaardProfiel());
  const [fouten, setFouten] = useState<ProfielFout[]>([]);
  const [plaatsFout, setPlaatsFout] = useState(false);
  // Enkel het antwoord op de laatst ingevoerde postcode telt.
  const laatstePostcode = useRef('');

  useFocusEffect(
    useCallback(() => {
      laadProfiel().then((p) => {
        setProfiel(p);
        setFouten([]);
      });
      // WEEK-100: bij elk vertrek (knop, menu of bewaren) onthouden zodat de weekplanner opnieuw start.
      return () => onthoudVertrekUitGezinsprofiel();
    }, [])
  );

  const wijzig = (deel: Partial<Profiel>) => setProfiel((p) => ({ ...p, ...deel }));
  const wijzigAdres = (deel: Partial<Profiel['adres']>) => setProfiel((p) => ({ ...p, adres: { ...p.adres, ...deel } }));

  // WEEK-69: bij een volledige Belgische postcode stellen we de gemeente en het land voor.
  // Het antwoord wordt enkel gebruikt als de postcode dan nog steeds dezelfde is.
  // WEEK-104: lukt het opzoeken niet (geen verbinding of geen plaats), dan krijgt de gebruiker een melding.
  const wijzigPostcode = (postcode: string) => {
    wijzigAdres({ postcode });
    const pc = postcode.trim();
    laatstePostcode.current = pc;
    setPlaatsFout(false);
    if (!/^\d{4}$/.test(pc)) return;
    zoekPlaats(pc)
      .then((plaats) => {
        if (laatstePostcode.current !== pc) return;
        if (!plaats) {
          setPlaatsFout(true);
          return;
        }
        setProfiel((p) =>
          p.adres.postcode.trim() === pc ? { ...p, adres: { ...p.adres, gemeente: plaats.gemeente, land: plaats.land } } : p,
        );
      })
      .catch(() => {
        if (laatstePostcode.current === pc) setPlaatsFout(true);
      });
  };

  const bewaar = async () => {
    const gevonden = valideerProfiel(profiel);
    setFouten(gevonden);
    if (gevonden.length) return;
    await bewaarProfiel(profiel);
    // WEEK-100: na bewaren direct naar het menu.
    router.navigate('/');
  };

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <Text style={s.intro}>{t('profiel.intro')}</Text>

      {/* Hoe werkt het? (WEEK-56): korte uitleg van de app, bovenaan de instellingen. */}
      <View style={s.kaart}>
        <Text style={s.waromKop}>{t('howto.kop')}</Text>
        {['menu', 'lijst', 'frigo', 'scan', 'gezin'].map((k) => (
          <Text key={k} style={s.hint}>• {t(`howto.${k}` as Sleutel)}</Text>
        ))}
      </View>

      <GezinsRuimte />

      <Text style={s.kop}>{t('profiel.gezin')}</Text>
      <View style={s.kaart}>
        <View style={s.rij}>
          <Text style={s.label}>{t('profiel.volwassenen')}</Text>
          <Teller waarde={profiel.volwassenen} min={1} max={MAX_VOLWASSENEN} onChange={(n) => wijzig({ volwassenen: n })} />
        </View>
        <View style={s.rij}>
          <View>
            <Text style={s.label}>{t('profiel.kinderen')}</Text>
            <Text style={s.hint}>{t('profiel.kinderHint')}</Text>
          </View>
          <Teller waarde={profiel.kinderen} min={0} max={MAX_KINDEREN} onChange={(n) => wijzig({ kinderen: n })} />
        </View>
        <Text style={s.totaal}>{t('profiel.samen', { personen: tn('algemeen.personen', aantalPersonen(profiel)) })}</Text>
      </View>

      <View style={s.waarom}>
        <Text style={s.waromKop}>{t('profiel.waarom.titel')}</Text>
        <Text style={s.hint}>{t('profiel.waarom.tekst')}</Text>
      </View>

      <Text style={s.kop}>{t('profiel.adres')}</Text>
      <View style={s.kaart}>
        <View style={s.info}>
          <Text style={s.waromKop}>{t('profiel.winkelsTitel')}</Text>
          <Text style={s.hint}>{t('profiel.winkelsTekst')}</Text>
        </View>
        <Text style={s.hint}>{t('profiel.plaatsVoorstel')}</Text>
        {plaatsFout && <Text style={s.fout}>{t('profiel.plaatsNietGevonden')}</Text>}
        <View style={s.rijVelden}>
          <View style={{ width: 100, gap: 4 }}>
            <Text style={s.label}>{t('profiel.postcode')}</Text>
            <TextInput style={s.veld} value={profiel.adres.postcode} onChangeText={wijzigPostcode} keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.label}>{t('profiel.gemeente')}</Text>
            <TextInput style={s.veld} value={profiel.adres.gemeente} onChangeText={(t) => wijzigAdres({ gemeente: t })} />
          </View>
        </View>
        <View style={{ gap: 4 }}>
          <Text style={s.label}>{t('profiel.land')}</Text>
          <TextInput style={s.veld} value={profiel.adres.land} onChangeText={(t) => wijzigAdres({ land: t })} />
        </View>
      </View>

      {fouten.map((f) => (
        <Text key={f} style={s.fout}>• {t(`fout.${f}` as Sleutel, { max: FOUT_MAX[f] ?? '' })}</Text>
      ))}

      <Pressable style={s.knop} onPress={bewaar}>
        <Text style={s.knopTekst}>{t('profiel.bewaar')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, gap: 8, paddingBottom: 40 },
  intro: { color: '#555' },
  kop: { fontWeight: '700', fontSize: 15, color: '#333', marginTop: 10 },
  kaart: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e5e5', gap: 10 },
  rij: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 16 },
  waarom: { borderLeftWidth: 3, borderLeftColor: KLEUR, paddingLeft: 12, gap: 4, marginTop: 4 },
  waromKop: { fontWeight: '700', fontSize: 15, color: '#333' },
  totaal: { color: '#777', fontSize: 13 },
  teller: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tellerKnop: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: KLEUR, alignItems: 'center', justifyContent: 'center' },
  uit: { opacity: 0.3 },
  tellerTekst: { color: KLEUR, fontSize: 20, fontWeight: '700' },
  tellerWaarde: { fontSize: 17, fontWeight: '600', minWidth: 24, textAlign: 'center' },
  veld: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, minHeight: 44, backgroundColor: '#fafafa' },
  rijVelden: { flexDirection: 'row', gap: 8 },
  hint: { color: '#777', fontSize: 13 },
  info: { backgroundColor: '#eef6f1', borderRadius: 10, padding: 12, gap: 4 },
  fout: { color: '#c62828' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: KLEUR, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 6 },
  chipActief: { backgroundColor: KLEUR },
  chipTekst: { color: KLEUR, fontWeight: '600' },
  chipTekstActief: { color: '#fff' },
  knop: { backgroundColor: KLEUR, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  knopTekst: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
