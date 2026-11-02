import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { KEUZE_TALEN, Taal, vertaal } from '@/i18n';
import { zetWelkomGezien } from '@/opslag/welkom';
import { koppel } from '@/opslag/aanmelden';
import { zetVoornaam } from '@/opslag/voornaam';
import { valideerVoornaam, VoornaamFout, MAX_VOORNAAM } from '@/lib/voornaam';
import { ROUTE_NA_WELKOM } from '@/lib/welkom';
import { useTaal } from '@/ui/taal';

const KLEUR = '#0F6B66';
const KLEUR_ZACHT = '#D5EDEA';
const PAPIER = '#F8F8F4';
const INKT = '#17201A';
const MUTED = '#5E6B63';
const LIJN = '#E4E8E1';
const MIST = '#EEF1EC';

/** Welkomstscherm (WEEK-79, visual WEEK-82): eerst het welkomstbeeld, dan de taalkeuze; daarna de gezinsruimte. */
export default function Welkom() {
  const { t, taal, zetVoorkeur } = useTaal();
  const [stap, setStap] = useState<'welkom' | 'taal' | 'naam' | 'account'>('welkom');
  const [gekozen, setGekozen] = useState<Taal>(taal);
  // WEEK-163: de voornaam wordt na de taalkeuze gevraagd, vóór het gezin.
  const [voornaamInvoer, setVoornaamInvoer] = useState('');
  const [naamFout, setNaamFout] = useState<VoornaamFout | null>(null);
  // WEEK-174: de startkeuze (Google of verder zonder account).
  const [bezig, setBezig] = useState(false);
  const [aanmeldFout, setAanmeldFout] = useState(false);

  const naarNaam = () => {
    // Enkel op dit toestel (WEEK-80): de taal gaat niet naar het gezin of naar andere toestellen.
    zetVoorkeur(gekozen);
    setStap('naam');
  };

  const doorgaan = async () => {
    const r = valideerVoornaam(voornaamInvoer);
    if (!r.ok) {
      setNaamFout(r.fout);
      return;
    }
    setNaamFout(null);
    await zetVoornaam(r.naam);
    setStap('account');
  };

  // WEEK-174: met Google koppelen, of verder zonder account. Daarna is het welkomstscherm eenmalig klaar.
  const metGoogle = async () => {
    setAanmeldFout(false);
    setBezig(true);
    // Eerst markeren: bij de terugkeer van Google mag het welkomstscherm niet opnieuw verschijnen.
    await zetWelkomGezien();
    try {
      await koppel('google');
      router.replace(ROUTE_NA_WELKOM);
    } catch {
      setAanmeldFout(true);
    } finally {
      setBezig(false);
    }
  };

  const verderZonder = async () => {
    await zetWelkomGezien();
    router.replace(ROUTE_NA_WELKOM);
  };

  const stapIndicator = (actief: number) => (
    <View style={s.stippen} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[s.stip, i === actief && s.stipActief]} />
      ))}
    </View>
  );

  if (stap === 'welkom') {
    return (
      <ScrollView contentContainerStyle={s.welkomContainer}>
        <View style={s.glans} pointerEvents="none" />
        <View style={s.hero}>
          <Image source={require('../assets/icon.png')} style={s.logo} accessibilityLabel="Logo van Gezond Boodschappen" />
          <Text style={s.merk}>Gezond{'\n'}Boodschappen</Text>
          <Text style={s.slogan}>{t('welkom.slogan')}</Text>
        </View>
        <View style={s.onderaan}>
          {stapIndicator(0)}
          <Pressable style={s.knop} onPress={() => setStap('taal')} accessibilityRole="button">
            <Text style={s.knopTekst}>{t('welkom.knop')}</Text>
          </Pressable>
          <Text style={s.stap}>{t('welkom.stap')}</Text>
        </View>
      </ScrollView>
    );
  }

  if (stap === 'account') {
    return (
      <ScrollView contentContainerStyle={s.taalContainer}>
        <View style={s.taalKop}>
          <Image source={require('../assets/icon.png')} style={s.logoKlein} accessibilityElementsHidden importantForAccessibility="no" />
          <Text style={s.titel}>{vertaal(gekozen, 'welkom.accountTitel')}</Text>
          <Text style={s.tekst}>{vertaal(gekozen, 'welkom.accountTekst')}</Text>
        </View>
        {aanmeldFout && (
          <Text style={s.fout} accessibilityRole="alert">
            {vertaal(gekozen, 'aanmelden.fout')}
          </Text>
        )}
        <View style={s.onderaan}>
          <Pressable style={[s.knop, bezig && s.uit]} onPress={metGoogle} disabled={bezig} accessibilityRole="button">
            <Text style={s.knopTekst}>{vertaal(gekozen, 'welkom.accountGoogle')}</Text>
          </Pressable>
          <Pressable style={[s.knopZacht, bezig && s.uit]} onPress={verderZonder} disabled={bezig} accessibilityRole="button">
            <Text style={s.knopZachtTekst}>{vertaal(gekozen, 'welkom.accountVerder')}</Text>
          </Pressable>
          {stapIndicator(3)}
        </View>
      </ScrollView>
    );
  }

  if (stap === 'naam') {
    return (
      <ScrollView contentContainerStyle={s.taalContainer}>
        <View style={s.taalKop}>
          <Image source={require('../assets/icon.png')} style={s.logoKlein} accessibilityElementsHidden importantForAccessibility="no" />
          <Text style={s.titel}>{vertaal(gekozen, 'welkom.naamTitel')}</Text>
          <Text style={s.tekst}>{vertaal(gekozen, 'welkom.naamTekst')}</Text>
        </View>
        <View style={s.veldBlok}>
          <TextInput
            style={[s.veld, naamFout && s.veldFout]}
            value={voornaamInvoer}
            onChangeText={(tekst) => {
              setVoornaamInvoer(tekst);
              setNaamFout(null);
            }}
            placeholder={vertaal(gekozen, 'welkom.naamVeld')}
            accessibilityLabel={vertaal(gekozen, 'welkom.naamVeld')}
            maxLength={MAX_VOORNAAM + 5}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={doorgaan}
          />
          {naamFout && <Text style={s.fout} accessibilityRole="alert">{vertaal(gekozen, `naam.fout.${naamFout}` as 'naam.fout.leeg')}</Text>}
        </View>
        <View style={s.onderaan}>
          <Pressable style={s.knop} onPress={doorgaan} accessibilityRole="button">
            <Text style={s.knopTekst}>{vertaal(gekozen, 'welkom.doorgaan')}</Text>
          </Pressable>
          {stapIndicator(2)}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.taalContainer}>
      <View style={s.taalKop}>
        <Image source={require('../assets/icon.png')} style={s.logoKlein} accessibilityElementsHidden importantForAccessibility="no" />
        {/* WEEK-98: de vraag volgt de gekozen taal, niet de taal die nog in de app staat. */}
        <Text style={s.titel}>{vertaal(gekozen, 'welkom.knop')}</Text>
        <Text style={s.tekst}>{vertaal(gekozen, 'welkom.tekst')}</Text>
      </View>

      <View style={s.lijst}>
        {KEUZE_TALEN.map((code) => {
          const actief = gekozen === code;
          return (
            <Pressable
              key={code}
              style={[s.keuze, actief && s.keuzeActief]}
              onPress={() => setGekozen(code)}
              accessibilityRole="button"
              accessibilityState={{ selected: actief }}
            >
              <View style={[s.code, actief && s.codeActief]}>
                <Text style={[s.codeTekst, actief && s.codeTekstActief]}>{code.toUpperCase()}</Text>
              </View>
              <Text style={[s.keuzeTekst, actief && s.keuzeTekstActief]}>{vertaal(code, 'taal.naam')}</Text>
              {actief ? <Text style={s.vinkje}>✓</Text> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={s.onderaan}>
        <Pressable style={s.knop} onPress={naarNaam} accessibilityRole="button">
          <Text style={s.knopTekst}>{vertaal(gekozen, 'welkom.doorgaan')}</Text>
        </Pressable>
        {stapIndicator(1)}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  welkomContainer: { flexGrow: 1, padding: 24, paddingTop: 72, paddingBottom: 40, backgroundColor: PAPIER, justifyContent: 'space-between', gap: 24 },
  glans: { position: 'absolute', top: 0, left: 0, right: 0, height: 300, backgroundColor: KLEUR_ZACHT, opacity: 0.6 },
  hero: { alignItems: 'center', gap: 18, marginTop: 24 },
  logo: { width: 132, height: 132, borderRadius: 32 },
  merk: { fontSize: 30, fontWeight: '800', color: INKT, textAlign: 'center', lineHeight: 34 },
  slogan: { fontSize: 15, color: MUTED, textAlign: 'center', maxWidth: 300, lineHeight: 22 },
  onderaan: { gap: 14 },
  stippen: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  stip: { width: 8, height: 6, borderRadius: 999, backgroundColor: '#C9D6CF' },
  stipActief: { width: 26, backgroundColor: KLEUR },
  knop: { backgroundColor: KLEUR, borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
  knopTekst: { color: '#fff', fontWeight: '700', fontSize: 17 },
  knopZacht: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: KLEUR, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  knopZachtTekst: { color: KLEUR, fontWeight: '700', fontSize: 17 },
  uit: { opacity: 0.6 },
  stap: { fontSize: 12, color: MUTED, textAlign: 'center' },
  taalContainer: { flexGrow: 1, padding: 24, paddingTop: 64, paddingBottom: 32, backgroundColor: PAPIER, gap: 20 },
  taalKop: { gap: 8 },
  logoKlein: { width: 44, height: 44, borderRadius: 12, marginBottom: 8 },
  titel: { fontSize: 28, fontWeight: '800', color: INKT },
  tekst: { fontSize: 15, color: MUTED, lineHeight: 22 },
  lijst: { gap: 10 },
  keuze: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderWidth: 1.5, borderColor: LIJN, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16 },
  keuzeActief: { backgroundColor: KLEUR_ZACHT, borderColor: KLEUR, borderWidth: 2 },
  code: { width: 44, height: 44, borderRadius: 12, backgroundColor: MIST, alignItems: 'center', justifyContent: 'center' },
  codeActief: { backgroundColor: KLEUR },
  codeTekst: { fontWeight: '800', fontSize: 15, color: INKT },
  codeTekstActief: { color: '#fff' },
  keuzeTekst: { flex: 1, fontSize: 17, fontWeight: '600', color: INKT },
  keuzeTekstActief: { fontWeight: '700' },
  veldBlok: { gap: 8 },
  veld: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: LIJN, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, fontSize: 17, color: INKT },
  veldFout: { borderColor: '#B3261E' },
  fout: { fontSize: 13, color: '#B3261E', lineHeight: 18 },
  vinkje: { width: 26, height: 26, borderRadius: 999, backgroundColor: KLEUR, color: '#fff', textAlign: 'center', lineHeight: 26, fontWeight: '700' },
});
