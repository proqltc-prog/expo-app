import { useCallback, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
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
import { landInTaal } from '@/lib/land';
import { KEUZE_TALEN, Sleutel, vertaal } from '@/i18n';
import { useTaal } from '@/ui/taal';
import { GezinsRuimte } from '@/ui/gezinsruimte';
import { Inklapbaar } from '@/ui/inklapbaar';
import { gezinsruimteBeschikbaar } from '@/opslag/supabase';
import { aangemeldAls, meldAf } from '@/opslag/aanmelden';
import { ROUTE_WELKOM } from '@/lib/welkom';
import { wisselGroep } from '@/lib/groepen';
import { usePaginaInfo } from '@/ui/paginaInfo';
import { howtoTekst } from '@/lib/howto';
import { heroHoogte } from '@/lib/welkomFotos';
import { WELKOM_FOTO } from '@/ui/welkomFotos';

// WEEK-289: zelfde huisstijl als de startpagina en Aan de slag (petrol, oranje accent, warme crème).
const KLEUR = '#0F6B66';
const KLEUR_ZACHT = '#D5EDEA';
const ORANJE = '#E8710A';
const PAPIER = '#FBF6EE';
const INKT = '#17201A';
const ZACHTE_RAND = '#EDE3D3';

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
  const { t, tn, taal, voorkeur, zetVoorkeur } = useTaal();
  const { height: schermHoogte } = useWindowDimensions();
  // Welke secties open staan (WEEK-126); standaard zijn ze allemaal ingeklapt.
  const [uitgeklapt, setUitgeklapt] = useState<Set<string>>(new Set());
  const wissel = (sleutel: string) => setUitgeklapt((o) => wisselGroep(o, sleutel));
  const [profiel, setProfiel] = useState<Profiel>(standaardProfiel());
  // WEEK-168: enkel de beheerder van het gezin past het gezinsprofiel aan. Tot het geladen is: niet wijzigen.
  const [mag, setMag] = useState(false);
  const [fouten, setFouten] = useState<ProfielFout[]>([]);
  const [plaatsFout, setPlaatsFout] = useState(false);
  // WEEK-314: met welk account dit toestel aangemeld is (undefined: anoniem of niet aangemeld, dan geen afmeldknop).
  const [account, setAccount] = useState<string | undefined>(undefined);
  const [afmeldVraag, setAfmeldVraag] = useState(false);
  const [afmeldBezig, setAfmeldBezig] = useState(false);
  const [afmeldFout, setAfmeldFout] = useState(false);
  // Enkel het antwoord op de laatst ingevoerde postcode telt.
  const laatstePostcode = useRef('');
  // WEEK-193: "Hoe werkt het?" zit achter het info-icoon rechtsboven, niet meer bovenaan de pagina.
  const { popup } = usePaginaInfo({
    tekst: howtoTekst((k) => t(k as Sleutel)),
    kleur: KLEUR,
    infoLabel: t('pagina.infoKnop'),
    sluitLabel: t('pagina.sluiten'),
    rond: true,
  });

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
      aangemeldAls().then(setAccount).catch(() => setAccount(undefined));
      setAfmeldVraag(false);
      setAfmeldFout(false);
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

  // WEEK-314: afmelden op dit toestel; daarna het startscherm om (eventueel met een ander account) aan te melden.
  const afmelden = async () => {
    setAfmeldFout(false);
    setAfmeldBezig(true);
    try {
      await meldAf();
      router.replace(ROUTE_WELKOM);
    } catch {
      setAfmeldFout(true);
    } finally {
      setAfmeldBezig(false);
      setAfmeldVraag(false);
    }
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
    <ScrollView style={s.scherm} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      {popup}
      {/* WEEK-289: sfeerfoto bovenaan (het gezin samen aan het werk) die zacht overloopt in de crème; de kop ligt erover. */}
      <View style={[s.hero, { height: Math.round(heroHoogte(schermHoogte) * 0.75) }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Image source={WELKOM_FOTO.huishouden} style={s.vulFoto} resizeMode="cover" />
        <LinearGradient colors={['rgba(23,32,26,0.30)', 'rgba(23,32,26,0)', 'rgba(251,246,238,0)', PAPIER]} locations={[0, 0.35, 0.75, 1]} style={StyleSheet.absoluteFill} />
      </View>
      <View style={s.kopBlok}>
        <View style={s.badge}>
          <Ionicons name="people-outline" size={28} color={KLEUR} />
        </View>
        <Text style={s.titel} accessibilityRole="header">{t('tab.gezin.titel')}</Text>
        <View style={s.scheiding} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={s.scheidingLijn} />
          <Ionicons name="leaf" size={14} color={ORANJE} />
          <View style={s.scheidingLijn} />
        </View>
        <Text style={s.intro}>{t('profiel.intro')}</Text>
      </View>
      <View style={s.blokken}>

      {/* Taal (WEEK-126, WEEK-179): enkel de vier ondersteunde talen. Zonder keuze gebruikt de app de taal van het toestel. */}
      <Inklapbaar titel={t('profiel.taal')} icoon="language-outline" open={uitgeklapt.has('taal')} onWissel={() => wissel('taal')}>
        <View style={s.kaart}>
          <Text style={s.hint}>{t('profiel.taalHint')}</Text>
          {KEUZE_TALEN.map((code) => (
            <Pressable key={code} style={s.taalRij} onPress={() => zetVoorkeur(code)} accessibilityRole="radio" accessibilityState={{ selected: voorkeur === code }}>
              <Text style={s.label}>{vertaal(code, 'taal.naam')}</Text>
              {voorkeur === code && <Text style={s.vinkje}>✓</Text>}
            </Pressable>
          ))}
        </View>
      </Inklapbaar>

      {/* WEEK-294: Gezin en Gezinsruimte in één blok: wie er mee eet, en (optioneel) samen delen. */}
      <Inklapbaar titel={t('profiel.gezin')} icoon="people-outline" open={uitgeklapt.has('gezin')} onWissel={() => wissel('gezin')}>
      <Text style={s.deelKop}>{t('profiel.wieEet')}</Text>
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
      {/* WEEK-250: de uitleg hoort bij het blok Gezin en klapt mee in, zoals de uitleg bij Adres. */}
      <View style={[s.waarom, s.waromInBlok]}>
        <Text style={s.waromKop}>{t('profiel.waarom.titel')}</Text>
        <Text style={s.hint}>{t('profiel.waarom.tekst')}</Text>
      </View>
      {gezinsruimteBeschikbaar() && (
        <>
          <View style={s.deelScheiding} />
          <Text style={s.deelKop}>{t('profiel.samenDelen')}</Text>
          <GezinsRuimte kopTonen={false} />
        </>
      )}
      </Inklapbaar>

      <Inklapbaar titel={t('profiel.adres')} icoon="location-outline" open={uitgeklapt.has('adres')} onWissel={() => wissel('adres')}>
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
          <TextInput style={s.veld} value={landInTaal(profiel.adres.land, taal)} onChangeText={(t) => wijzigAdres({ land: t })} editable={mag} />
        </View>
      </View>
      </Inklapbaar>

      {account !== undefined && (
        <Inklapbaar titel={t('profiel.account')} icoon="person-circle-outline" open={uitgeklapt.has('account')} onWissel={() => wissel('account')}>
          <View style={s.kaart}>
            {!!account && <Text style={s.label}>{t('account.aangemeldAls', { email: account })}</Text>}
            {afmeldVraag ? (
              <View style={s.info}>
                <Text style={s.hint}>{t('account.afmeldVraag')}</Text>
                <View style={s.chips}>
                  <Pressable style={[s.chip, s.chipActief]} onPress={afmelden} disabled={afmeldBezig} accessibilityRole="button">
                    <Text style={[s.chipTekst, s.chipTekstActief]}>{t('account.jaAfmelden')}</Text>
                  </Pressable>
                  <Pressable style={s.chip} onPress={() => setAfmeldVraag(false)} disabled={afmeldBezig} accessibilityRole="button">
                    <Text style={s.chipTekst}>{t('aangemeld.annuleren')}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable style={s.afmeldKnop} onPress={() => setAfmeldVraag(true)} accessibilityRole="button">
                <Ionicons name="log-out-outline" size={18} color={KLEUR} />
                <Text style={s.chipTekst}>{t('account.afmelden')}</Text>
              </Pressable>
            )}
            {afmeldFout && <Text style={s.fout}>{t('account.fout')}</Text>}
          </View>
        </Inklapbaar>
      )}

      {fouten.map((f) => (
        <Text key={f} style={s.fout}>• {t(`fout.${f}` as Sleutel, { max: FOUT_MAX[f] ?? '' })}</Text>
      ))}

      <Pressable style={s.knop} onPress={bewaar} accessibilityRole="button">
        <Text style={s.knopTekst}>{t('profiel.bewaar')}</Text>
      </Pressable>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scherm: { backgroundColor: PAPIER },
  container: { paddingBottom: 40 },
  vulFoto: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  hero: { width: '100%', overflow: 'hidden', backgroundColor: KLEUR_ZACHT },
  kopBlok: { alignItems: 'center', gap: 8, paddingHorizontal: 24, marginTop: -34 },
  badge: { width: 66, height: 66, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 6, shadowColor: '#3A2A12', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  titel: { fontSize: 32, fontWeight: '900', color: INKT, textAlign: 'center', lineHeight: 37, letterSpacing: -0.8 },
  scheiding: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  scheidingLijn: { width: 44, height: 1.5, borderRadius: 1, backgroundColor: '#E6D8C2' },
  intro: { fontSize: 17, color: '#3E4A43', textAlign: 'center', maxWidth: 340, lineHeight: 25, fontWeight: '500' },
  blokken: { paddingHorizontal: 16, gap: 12, marginTop: 24 },
  kop: { fontWeight: '700', fontSize: 15, color: '#333', marginTop: 10 },
  deelKop: { fontSize: 15, fontWeight: '800', color: INKT, paddingHorizontal: 4, marginTop: 2 },
  deelScheiding: { height: 1, backgroundColor: ZACHTE_RAND, marginVertical: 4 },
  kaart: { backgroundColor: '#fff', borderRadius: 14, padding: 4, gap: 12 },
  rij: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 16 },
  waarom: { backgroundColor: '#F4EFE6', borderRadius: 14, padding: 14, gap: 6 },
  waromInBlok: { marginTop: 12 },
  waromKop: { fontWeight: '700', fontSize: 15, color: '#333' },
  totaal: { color: '#777', fontSize: 13 },
  taalRij: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  vinkje: { color: KLEUR, fontWeight: '800', fontSize: 16 },
  teller: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tellerKnop: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: KLEUR, alignItems: 'center', justifyContent: 'center' },
  uit: { opacity: 0.3 },
  tellerTekst: { color: KLEUR, fontSize: 20, fontWeight: '700' },
  tellerWaarde: { fontSize: 17, fontWeight: '600', minWidth: 24, textAlign: 'center' },
  veld: { borderWidth: 1, borderColor: ZACHTE_RAND, borderRadius: 12, paddingHorizontal: 12, minHeight: 46, backgroundColor: '#FDFBF7', color: INKT },
  rijVelden: { flexDirection: 'row', gap: 8 },
  hint: { color: '#777', fontSize: 13 },
  info: { backgroundColor: '#F4EFE6', borderRadius: 12, padding: 12, gap: 4 },
  fout: { color: '#c62828' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: KLEUR, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 6, minHeight: 36, justifyContent: 'center' },
  chipActief: { backgroundColor: KLEUR },
  chipTekst: { color: KLEUR, fontWeight: '600' },
  chipTekstActief: { color: '#fff' },
  afmeldKnop: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', borderWidth: 1.5, borderColor: KLEUR, borderRadius: 18, paddingHorizontal: 14, minHeight: 40 },
  knop: { backgroundColor: KLEUR, borderRadius: 16, paddingVertical: 17, alignItems: 'center', marginTop: 12 },
  knopTekst: { color: '#fff', fontWeight: '700', fontSize: 17 },
});
