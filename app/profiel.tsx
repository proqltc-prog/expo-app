import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  aantalPersonen,
  leesBedrag,
  leesMaxKm,
  MAX_KINDEREN,
  MAX_KM,
  MAX_VOLWASSENEN,
  Profiel,
  ProfielFout,
  standaardProfiel,
  valideerProfiel,
} from '@/lib/profiel';
import { bewaarProfiel, laadProfiel } from '@/opslag/profiel';
import { Sleutel, Taal, TALEN, vertaal } from '@/i18n';
import { useTaal } from '@/ui/taal';
import { GezinsRuimte } from '@/ui/gezinsruimte';

const KLEUR = '#2e7d4f';

const FOUT_MAX: Record<ProfielFout, number | undefined> = {
  volwassenen: MAX_VOLWASSENEN,
  kinderen: MAX_KINDEREN,
  budget: undefined,
  postcode: undefined,
  maxKm: MAX_KM,
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
  const { t, tn, zetVoorkeur } = useTaal();
  const [profiel, setProfiel] = useState<Profiel>(standaardProfiel());
  const [budgetTekst, setBudgetTekst] = useState('');
  const [maxKmTekst, setMaxKmTekst] = useState('');
  const [fouten, setFouten] = useState<ProfielFout[]>([]);

  useFocusEffect(
    useCallback(() => {
      laadProfiel().then((p) => {
        setProfiel(p);
        setBudgetTekst(p.weekbudget === undefined ? '' : String(p.weekbudget).replace('.', ','));
        setMaxKmTekst(p.maxKm === undefined ? '' : String(p.maxKm));
        setFouten([]);
      });
    }, [])
  );

  const wijzig = (deel: Partial<Profiel>) => setProfiel((p) => ({ ...p, ...deel }));
  const wijzigAdres = (deel: Partial<Profiel['adres']>) => setProfiel((p) => ({ ...p, adres: { ...p.adres, ...deel } }));

  const bewaar = async () => {
    const volledig: Profiel = { ...profiel, weekbudget: leesBedrag(budgetTekst), maxKm: leesMaxKm(maxKmTekst) };
    const gevonden = valideerProfiel(volledig);
    setFouten(gevonden);
    if (gevonden.length) return;
    await bewaarProfiel(volledig);
    setProfiel(volledig);
    zetVoorkeur(volledig.taal);
    Alert.alert(t('profiel.bewaard.titel'), t('profiel.bewaard.tekst', { personen: tn('algemeen.personen', aantalPersonen(volledig)) }));
  };

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <Text style={s.intro}>{t('profiel.intro')}</Text>

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

      <Text style={s.kop}>{t('profiel.budget')}</Text>
      <View style={s.kaart}>
        <Text style={s.label}>{t('profiel.budgetLabel')}</Text>
        <TextInput
          style={s.veld}
          value={budgetTekst}
          onChangeText={setBudgetTekst}
          keyboardType="decimal-pad"
          placeholder={t('profiel.budgetPlaceholder')}
        />
        <Text style={s.label}>{t('profiel.maxKm')}</Text>
        <TextInput
          style={s.veld}
          value={maxKmTekst}
          onChangeText={setMaxKmTekst}
          keyboardType="number-pad"
          placeholder={t('profiel.maxKmPlaceholder')}
        />
      </View>

      <Text style={s.kop}>{t('profiel.adres')}</Text>
      <View style={s.kaart}>
        <Text style={s.hint}>{t('profiel.adresHint')}</Text>
        <View style={s.rijVelden}>
          <TextInput
            style={[s.veld, { width: 100 }]}
            value={profiel.adres.postcode}
            onChangeText={(t) => wijzigAdres({ postcode: t })}
            placeholder={t('profiel.postcode')}
            keyboardType="number-pad"
          />
          <TextInput style={[s.veld, { flex: 1 }]} value={profiel.adres.gemeente} onChangeText={(t) => wijzigAdres({ gemeente: t })} placeholder={t('profiel.gemeente')} />
        </View>
        <TextInput style={s.veld} value={profiel.adres.land} onChangeText={(t) => wijzigAdres({ land: t })} placeholder={t('profiel.land')} />
      </View>

      <Text style={s.kop}>{t('profiel.taal')}</Text>
      <View style={[s.kaart, s.chips]}>
        {([undefined, ...TALEN] as (Taal | undefined)[]).map((code) => {
          const actief = profiel.taal === code;
          return (
            <Pressable
              key={code ?? 'toestel'}
              style={[s.chip, actief && s.chipActief]}
              onPress={() => wijzig({ taal: code })}
              accessibilityState={{ selected: actief }}
            >
              <Text style={[s.chipTekst, actief && s.chipTekstActief]}>
                {code ? vertaal(code, 'taal.naam') : t('profiel.taalToestel')}
              </Text>
            </Pressable>
          );
        })}
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
  fout: { color: '#c62828' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: KLEUR, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 6 },
  chipActief: { backgroundColor: KLEUR },
  chipTekst: { color: KLEUR, fontWeight: '600' },
  chipTekstActief: { color: '#fff' },
  knop: { backgroundColor: KLEUR, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  knopTekst: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
