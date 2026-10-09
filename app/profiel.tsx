import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  aantalPersonen,
  leesBedrag,
  MAX_KINDEREN,
  MAX_LEEFTIJD_KIND,
  MAX_VOLWASSENEN,
  Profiel,
  ProfielFout,
  standaardProfiel,
  valideerProfiel,
} from '@/lib/profiel';
import { bewaarProfiel, laadProfiel } from '@/opslag/profiel';

const KLEUR = '#2e7d4f';

const FOUTMELDING: Record<ProfielFout, string> = {
  volwassenen: `Kies tussen 1 en ${MAX_VOLWASSENEN} volwassenen.`,
  kinderen: `Maximaal ${MAX_KINDEREN} kinderen.`,
  leeftijd: `De leeftijd van een kind ligt tussen 0 en ${MAX_LEEFTIJD_KIND} jaar.`,
  budget: 'Vul een geldig bedrag in, of laat het budget leeg.',
  postcode: 'Deze postcode lijkt niet te kloppen.',
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
  const [profiel, setProfiel] = useState<Profiel>(standaardProfiel());
  const [budgetTekst, setBudgetTekst] = useState('');
  const [fouten, setFouten] = useState<ProfielFout[]>([]);

  useFocusEffect(
    useCallback(() => {
      laadProfiel().then((p) => {
        setProfiel(p);
        setBudgetTekst(p.weekbudget === undefined ? '' : String(p.weekbudget).replace('.', ','));
        setFouten([]);
      });
    }, [])
  );

  const wijzig = (deel: Partial<Profiel>) => setProfiel((p) => ({ ...p, ...deel }));
  const wijzigAdres = (deel: Partial<Profiel['adres']>) => setProfiel((p) => ({ ...p, adres: { ...p.adres, ...deel } }));

  const bewaar = async () => {
    const volledig: Profiel = { ...profiel, weekbudget: leesBedrag(budgetTekst) };
    const gevonden = valideerProfiel(volledig);
    setFouten(gevonden);
    if (gevonden.length) return;
    await bewaarProfiel(volledig);
    setProfiel(volledig);
    Alert.alert('Bewaard', `Het profiel geldt nu voor elke weekplanning (${aantalPersonen(volledig)} personen).`);
  };

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <Text style={s.intro}>
        Deze gegevens vul je één keer in. Ze gaan automatisch mee bij elke weekplanning, zodat je ze niet telkens moet herhalen.
      </Text>

      <Text style={s.kop}>Gezin</Text>
      <View style={s.kaart}>
        <View style={s.rij}>
          <Text style={s.label}>Volwassenen</Text>
          <Teller waarde={profiel.volwassenen} min={1} max={MAX_VOLWASSENEN} onChange={(n) => wijzig({ volwassenen: n })} />
        </View>
        <View style={s.rij}>
          <Text style={s.label}>Kinderen</Text>
          <Teller
            waarde={profiel.kinderen.length}
            min={0}
            max={MAX_KINDEREN}
            onChange={(n) =>
              wijzig({ kinderen: n > profiel.kinderen.length ? [...profiel.kinderen, 6] : profiel.kinderen.slice(0, n) })
            }
          />
        </View>
        {profiel.kinderen.map((leeftijd, i) => (
          <View key={i} style={[s.rij, s.subRij]}>
            <Text style={s.subLabel}>Kind {i + 1} – leeftijd</Text>
            <Teller
              waarde={leeftijd}
              min={0}
              max={MAX_LEEFTIJD_KIND}
              onChange={(n) => wijzig({ kinderen: profiel.kinderen.map((l, j) => (j === i ? n : l)) })}
            />
          </View>
        ))}
        <Text style={s.totaal}>Samen {aantalPersonen(profiel)} personen</Text>
      </View>

      <Text style={s.kop}>Budget</Text>
      <View style={s.kaart}>
        <Text style={s.label}>Boodschappenbudget per week (€)</Text>
        <TextInput
          style={s.veld}
          value={budgetTekst}
          onChangeText={setBudgetTekst}
          keyboardType="decimal-pad"
          placeholder="bv. 150 – leeg laten als je geen budget wil"
        />
      </View>

      <Text style={s.kop}>Gezinssamenstelling</Text>
      <View style={s.kaart}>
        <TextInput
          style={[s.veld, s.meerRegels]}
          value={profiel.samenstelling}
          onChangeText={(t) => wijzig({ samenstelling: t })}
          multiline
          placeholder="bv. kinderen eten kleine porties, niemand lust spruitjes, één persoon eet geen varkensvlees…"
        />
      </View>

      <Text style={s.kop}>Adres</Text>
      <View style={s.kaart}>
        <Text style={s.hint}>Optioneel. Enkel je gemeente en land worden aan de AI doorgegeven.</Text>
        <TextInput style={s.veld} value={profiel.adres.straat} onChangeText={(t) => wijzigAdres({ straat: t })} placeholder="Straat en nummer" />
        <View style={s.rijVelden}>
          <TextInput
            style={[s.veld, { width: 100 }]}
            value={profiel.adres.postcode}
            onChangeText={(t) => wijzigAdres({ postcode: t })}
            placeholder="Postcode"
            keyboardType="number-pad"
          />
          <TextInput style={[s.veld, { flex: 1 }]} value={profiel.adres.gemeente} onChangeText={(t) => wijzigAdres({ gemeente: t })} placeholder="Gemeente" />
        </View>
        <TextInput style={s.veld} value={profiel.adres.land} onChangeText={(t) => wijzigAdres({ land: t })} placeholder="Land" />
      </View>

      {fouten.map((f) => (
        <Text key={f} style={s.fout}>• {FOUTMELDING[f]}</Text>
      ))}

      <Pressable style={s.knop} onPress={bewaar}>
        <Text style={s.knopTekst}>Profiel bewaren</Text>
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
  subRij: { paddingLeft: 12 },
  label: { fontSize: 16 },
  subLabel: { fontSize: 14, color: '#555' },
  totaal: { color: '#777', fontSize: 13 },
  teller: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tellerKnop: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: KLEUR, alignItems: 'center', justifyContent: 'center' },
  uit: { opacity: 0.3 },
  tellerTekst: { color: KLEUR, fontSize: 20, fontWeight: '700' },
  tellerWaarde: { fontSize: 17, fontWeight: '600', minWidth: 24, textAlign: 'center' },
  veld: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, minHeight: 44, backgroundColor: '#fafafa' },
  meerRegels: { minHeight: 80, paddingTop: 10, textAlignVertical: 'top' },
  rijVelden: { flexDirection: 'row', gap: 8 },
  hint: { color: '#777', fontSize: 13 },
  fout: { color: '#c62828' },
  knop: { backgroundColor: KLEUR, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  knopTekst: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
