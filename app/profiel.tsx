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
import { laadBeheerderId, laadGezin, ikId } from '@/opslag/sync';
import { magGezinsprofielWijzigen } from '@/lib/gezinbeheer';
import { zoekPlaats } from '@/opslag/winkels';
import { KEUZE_TALEN, Sleutel, vertaal } from '@/i18n';
import { useTaal } from '@/ui/taal';
import { GezinsRuimte } from '@/ui/gezinsruimte';
import { Inklapbaar } from '@/ui/inklapbaar';
import { gezinsruimteBeschikbaar } from '@/opslag/supabase';
import { wisselGroep } from '@/lib/groepen';

const KLEUR = '#2e7d4f';

const FOUT_MAX: Record<ProfielFout, number | undefined> = {
  volwassenen: MAX_VOLWASSENEN,
  kinderen: MAX_KINDEREN,
  postcodeLeeg: undefined,
  postcode: undefined,
  gemeente: undefined,
  land: undefined,
};

function Teller({ waarde, min, max, onChange, uit = false }: { waarde: number; min: number; max: number; onChange: (n: number) => void; uit?: boolean }) {
  return (
    <View style={s.teller}>
      <Pressable style={[s.tellerKnop, (waarde <= min || uit) && s.uit]} disabled={uit || waarde <= min} onPress={() => onChange(waarde - 1)}>
        <Text style={s.tellerTekst}>−</Text>
      </Pressable>
      <Text style={s.tellerWaarde}>{waarde}</Text>
      <Pressable style={[s.tellerKnop, (waarde >= max || uit) && s.uit]} disabled={uit || waarde >= max} onPress={() => onChange(waarde + 1)}>
        <Text style={s.tellerTekst}>+</Text>
      </Pressable>
    </View>
  );
}

export default function ProfielScherm() {
  const { t, tn, voorkeur, zetVoorkeur } = useTaal();
  // Welke secties open staan (WEEK-126); standaard zijn ze allemaal ingeklapt.
  const [uitgeklapt, setUitgeklapt] = useState<Set<string>>(new Set());
  const wissel = (sleutel: string) => setUitgeklapt((o) => wisselGroep(o, sleutel));
  const [profiel, setProfiel] = useState<Profiel>(standaardProfiel());
  // WEEK-168: enkel de beheerder van het gezin past het gezinsprofiel aan. Tot het geladen is: niet wijzigen.
  const [mag, setMag] = useState(false);
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
      laadGezin()
        .then(async (gezin) => (gezin ? magGezinsprofielWijzigen(true, await laadBeheerderId(), await ikId()) : true))
        .catch(() => false)
        .then(setMag);
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

      {/* Taal (WEEK-126): de taal van dit toestel kiezen; standaard volgt de app de taal van het toestel. */}
      <Inklapbaar titel={t('profiel.taal')} open={uitgeklapt.has('taal')} onWissel={() => wissel('taal')}>
        <View style={s.kaart}>
          <Text style={s.hint}>{t('profiel.taalHint')}</Text>
          <Pressable style={s.taalRij} onPress={() => zetVoorkeur(undefined)} accessibilityRole="radio" accessibilityState={{ selected: voorkeur === undefined }}>
            <Text style={s.label}>{t('profiel.taalToestel')}</Text>
            {voorkeur === undefined && <Text style={s.vinkje}>✓</Text>}
          </Pressable>
          {KEUZE_TALEN.map((code) => (
            <Pressable key={code} style={s.taalRij} onPress={() => zetVoorkeur(code)} accessibilityRole="radio" accessibilityState={{ selected: voorkeur === code }}>
              <Text style={s.label}>{vertaal(code, 'taal.naam')}</Text>
              {voorkeur === code && <Text style={s.vinkje}>✓</Text>}
            </Pressable>
          ))}
        </View>
      </Inklapbaar>

      {gezinsruimteBeschikbaar() && (
        <Inklapbaar titel={t('gezin.titel')} open={uitgeklapt.has('gezinsruimte')} onWissel={() => wissel('gezinsruimte')}>
          <GezinsRuimte kopTonen={false} />
        </Inklapbaar>
      )}

      <Inklapbaar titel={t('profiel.gezin')} open={uitgeklapt.has('gezin')} onWissel={() => wissel('gezin')}>
      <View style={s.kaart}>
        {!mag && <Text style={s.hint}>{t('profiel.alleenBeheerder')}</Text>}
        <View style={s.rij}>
          <Text style={s.label}>{t('profiel.volwassenen')}</Text>
          <Teller waarde={profiel.volwassenen} min={1} max={MAX_VOLWASSENEN} uit={!mag} onChange={(n) => wijzig({ volwassenen: n })} />
        </View>
        <View style={s.rij}>
          <View>
            <Text style={s.label}>{t('profiel.kinderen')}</Text>
            <Text style={s.hint}>{t('profiel.kinderHint')}</Text>
          </View>
          <Teller waarde={profiel.kinderen} min={0} max={MAX_KINDEREN} uit={!mag} onChange={(n) => wijzig({ kinderen: n })} />
        </View>
        <Text style={s.totaal}>{t('profiel.samen', { personen: tn('algemeen.personen', aantalPersonen(profiel)) })}</Text>
      </View>
      </Inklapbaar>

      <View style={s.waarom}>
        <Text style={s.waromKop}>{t('profiel.waarom.titel')}</Text>
        <Text style={s.hint}>{t('profiel.waarom.tekst')}</Text>
      </View>

      <Inklapbaar titel={t('profiel.adres')} open={uitgeklapt.has('adres')} onWissel={() => wissel('adres')}>
      <View style={s.kaart}>
        {!mag && <Text style={s.hint}>{t('profiel.alleenBeheerder')}</Text>}
        <View style={s.info}>
          <Text style={s.waromKop}>{t('profiel.winkelsTitel')}</Text>
          <Text style={s.hint}>{t('profiel.winkelsTekst')}</Text>
        </View>
        <Text style={s.hint}>{t('profiel.plaatsVoorstel')}</Text>
        {plaatsFout && <Text style={s.fout}>{t('profiel.plaatsNietGevonden')}</Text>}
        <View style={s.rijVelden}>
          <View style={{ width: 100, gap: 4 }}>
            <Text style={s.label}>{t('profiel.postcode')}</Text>
            <TextInput style={s.veld} value={profiel.adres.postcode} onChangeText={wijzigPostcode} keyboardType="number-pad" editable={mag} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.label}>{t('profiel.gemeente')}</Text>
            <TextInput style={s.veld} value={profiel.adres.gemeente} onChangeText={(t) => wijzigAdres({ gemeente: t })} editable={mag} />
          </View>
        </View>
        <View style={{ gap: 4 }}>
          <Text style={s.label}>{t('profiel.land')}</Text>
          <TextInput style={s.veld} value={profiel.adres.land} onChangeText={(t) => wijzigAdres({ land: t })} editable={mag} />
        </View>
      </View>
      </Inklapbaar>

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
  taalRij: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  vinkje: { color: '#2e7d4f', fontWeight: '800', fontSize: 16 },
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
