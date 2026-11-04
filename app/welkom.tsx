import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Sleutel } from '@/i18n';
import { zetWelkomGezien } from '@/opslag/welkom';
import { inlogMet, isAnoniem, koppel, stuurAanmeldMail } from '@/opslag/aanmelden';
import { Aanbieder, isGeldigEmail } from '@/lib/aanmelden';
import { ROUTE_NA_INLOGGEN, ROUTE_NA_WELKOM, UITLEG_SCHERMEN } from '@/lib/welkom';
import { useTaal } from '@/ui/taal';

const KLEUR = '#A9472A';
const KLEUR_ZACHT = '#F6E0D3';
const PAPIER = '#F8F8F4';
const INKT = '#17201A';
const MUTED = '#5E6B63';
const LIJN = '#E4E8E1';
const FOUT = '#B3261E';

type Stap = 'start' | 'uitleg' | 'aanmelden' | 'mail';

/**
 * Opstart bij de eerste opening (WEEK-79, WEEK-185): startscherm met Get started en Login,
 * dan de uitlegschermen, dan aanmelden. Geen taal- en naamscherm meer: de taal volgt het toestel,
 * en de naam en het gezin stel je in de instellingen in.
 */
export default function Welkom() {
  const { t } = useTaal();
  const [stap, setStap] = useState<Stap>('start');
  const [uitlegIndex, setUitlegIndex] = useState(0);
  const [bezig, setBezig] = useState(false);
  const [aanmeldFout, setAanmeldFout] = useState(false);
  const [email, setEmail] = useState('');
  const [mailFout, setMailFout] = useState(false);
  const [mailVerzonden, setMailVerzonden] = useState(false);

  // Eenmaal het startscherm verlaten telt als gezien: het komt niet meer terug, ook als de app daarna dicht gaat.
  const klaar = () => zetWelkomGezien();

  const metAanbieder = async (aanbieder: Aanbieder) => {
    setAanmeldFout(false);
    setBezig(true);
    await klaar();
    try {
      // Een anoniem toestel koppelt zijn gegevens aan het account; anders meldt het aan bij een bestaand account.
      if (await isAnoniem()) {
        await koppel(aanbieder);
        router.replace(ROUTE_NA_WELKOM);
      } else {
        await inlogMet(aanbieder);
        router.replace(ROUTE_NA_INLOGGEN);
      }
    } catch {
      setAanmeldFout(true);
    } finally {
      setBezig(false);
    }
  };

  const verderZonder = async () => {
    await klaar();
    router.replace(ROUTE_NA_WELKOM);
  };

  const stuurMail = async () => {
    if (!isGeldigEmail(email)) {
      setMailFout(true);
      return;
    }
    setMailFout(false);
    setBezig(true);
    await klaar();
    try {
      await stuurAanmeldMail(email.trim(), await isAnoniem());
      setMailVerzonden(true);
    } catch {
      setMailFout(true);
    } finally {
      setBezig(false);
    }
  };

  const stippen = (actief: number, totaal: number) => (
    <View style={s.stippen} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: totaal }, (_, i) => (
        <View key={i} style={[s.stip, i === actief && s.stipActief]} />
      ))}
    </View>
  );

  if (stap === 'start') {
    return (
      <ScrollView contentContainerStyle={s.startContainer}>
        <View style={s.glans} pointerEvents="none" />
        <View style={s.hero}>
          <Image source={require('../assets/icon.png')} style={s.logo} accessibilityLabel="Logo van Gezond Boodschappen" />
          <Text style={s.merk}>{t('welkom.merk')}</Text>
          <Text style={s.slogan}>{t('welkom.slogan')}</Text>
          {/* Sfeerbeeld met de vijf kernthema's; wordt vervangen door een eigen foto of gif zodra die er is. */}
          <View style={s.sfeer} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {UITLEG_SCHERMEN.slice(0, 4).map((scherm) => (
              <View key={scherm.icoon} style={[s.sfeerTegel, { backgroundColor: scherm.kleur }]}>
                <Ionicons name={scherm.icoon as 'home-outline'} size={26} color="#fff" />
              </View>
            ))}
          </View>
        </View>
        <View style={s.onderaan}>
          <Pressable style={s.knop} onPress={() => { void klaar(); setStap('uitleg'); }} accessibilityRole="button">
            <Text style={s.knopTekst}>{t('welkom.getStarted')}</Text>
          </Pressable>
          <Pressable style={s.knopZacht} onPress={() => { void klaar(); setStap('aanmelden'); }} accessibilityRole="button">
            <Text style={s.knopZachtTekst}>{t('welkom.login')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  if (stap === 'uitleg') {
    const scherm = UITLEG_SCHERMEN[uitlegIndex];
    const laatste = uitlegIndex === UITLEG_SCHERMEN.length - 1;
    const naAanmelden = () => setStap('aanmelden');
    return (
      <ScrollView contentContainerStyle={s.uitlegContainer}>
        <View style={s.uitlegBovenaan}>
          <Pressable onPress={naAanmelden} accessibilityRole="button" hitSlop={12}>
            <Text style={s.linkTekst}>{t('uitleg.overslaan')}</Text>
          </Pressable>
        </View>
        <View style={s.uitlegMidden}>
          <View style={[s.beeld, { backgroundColor: scherm.kleur }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Ionicons name={scherm.icoon as 'home-outline'} size={96} color="#fff" />
          </View>
          <Text style={s.titel}>{t(scherm.titel as Sleutel)}</Text>
          <Text style={s.tekst}>{t(scherm.tekst as Sleutel)}</Text>
        </View>
        <View style={s.onderaan}>
          {stippen(uitlegIndex, UITLEG_SCHERMEN.length)}
          <Pressable
            style={s.knop}
            onPress={() => (laatste ? naAanmelden() : setUitlegIndex(uitlegIndex + 1))}
            accessibilityRole="button"
          >
            <Text style={s.knopTekst}>{t('uitleg.volgende')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  if (stap === 'mail') {
    return (
      <ScrollView contentContainerStyle={s.schermContainer}>
        <Pressable onPress={() => setStap('aanmelden')} accessibilityRole="button" hitSlop={12}>
          <Text style={s.linkTekst}>{t('aanmelden.terug')}</Text>
        </Pressable>
        <View style={s.kop}>
          <Text style={s.titel}>{t('aanmelden.mailTitel')}</Text>
          <Text style={s.tekst}>{t('aanmelden.mailTekst')}</Text>
        </View>
        {mailVerzonden ? (
          <Text style={s.tekst} accessibilityRole="alert">
            {t('aanmelden.mailVerzonden')}
          </Text>
        ) : (
          <View style={s.veldBlok}>
            <TextInput
              style={[s.veld, mailFout && s.veldFout]}
              value={email}
              onChangeText={(tekst) => {
                setEmail(tekst);
                setMailFout(false);
              }}
              placeholder={t('aanmelden.mailVeld')}
              accessibilityLabel={t('aanmelden.mailVeld')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="send"
              onSubmitEditing={stuurMail}
            />
            {mailFout && (
              <Text style={s.fout} accessibilityRole="alert">
                {t('aanmelden.mailFout')}
              </Text>
            )}
          </View>
        )}
        {!mailVerzonden && (
          <View style={s.onderaan}>
            <Pressable style={[s.knop, bezig && s.uit]} onPress={stuurMail} disabled={bezig} accessibilityRole="button">
              <Text style={s.knopTekst}>{t('aanmelden.mailVerstuur')}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    );
  }

  // stap 'aanmelden': Google, Apple, Facebook of e-mail, en het alternatief zonder account.
  return (
    <ScrollView contentContainerStyle={s.schermContainer}>
      <Pressable onPress={() => setStap('start')} accessibilityRole="button" hitSlop={12}>
        <Text style={s.linkTekst}>{t('aanmelden.terug')}</Text>
      </Pressable>
      <View style={s.kop}>
        <Text style={s.titel}>{t('aanmelden.titel')}</Text>
        <Text style={s.tekst}>{t('aanmelden.tekst')}</Text>
      </View>
      {aanmeldFout && (
        <Text style={s.fout} accessibilityRole="alert">
          {t('aanmelden.fout')}
        </Text>
      )}
      <View style={s.onderaan}>
        <Pressable style={[s.knopMetIcoon, bezig && s.uit]} onPress={() => metAanbieder('google')} disabled={bezig} accessibilityRole="button">
          <Ionicons name="logo-google" size={18} color="#fff" />
          <Text style={s.knopTekst}>{t('aanmelden.metGoogle')}</Text>
        </Pressable>
        <Pressable style={[s.knopMetIcoon, bezig && s.uit]} onPress={() => metAanbieder('apple')} disabled={bezig} accessibilityRole="button">
          <Ionicons name="logo-apple" size={18} color="#fff" />
          <Text style={s.knopTekst}>{t('aanmelden.metApple')}</Text>
        </Pressable>
        <Pressable style={[s.knopMetIcoon, bezig && s.uit]} onPress={() => metAanbieder('facebook')} disabled={bezig} accessibilityRole="button">
          <Ionicons name="logo-facebook" size={18} color="#fff" />
          <Text style={s.knopTekst}>{t('aanmelden.metFacebook')}</Text>
        </Pressable>
        <Pressable style={[s.knopZacht, bezig && s.uit]} onPress={() => setStap('mail')} disabled={bezig} accessibilityRole="button">
          <Ionicons name="mail-outline" size={18} color={KLEUR} />
          <Text style={s.knopZachtTekst}>{t('aanmelden.metMail')}</Text>
        </Pressable>
      </View>

      <View style={s.alternatief}>
        <Pressable style={s.linkKnop} onPress={verderZonder} disabled={bezig} accessibilityRole="button">
          <Text style={s.linkTekst}>{t('welkom.alternatief')}</Text>
        </Pressable>
        <Text style={s.waarschuwing}>{t('welkom.alternatiefWaarschuwing')}</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  startContainer: { flexGrow: 1, padding: 24, paddingTop: 72, paddingBottom: 40, backgroundColor: PAPIER, justifyContent: 'space-between', gap: 24 },
  glans: { position: 'absolute', top: 0, left: 0, right: 0, height: 300, backgroundColor: KLEUR_ZACHT, opacity: 0.6 },
  hero: { alignItems: 'center', gap: 16, marginTop: 24 },
  logo: { width: 124, height: 124, borderRadius: 30 },
  merk: { fontSize: 30, fontWeight: '800', color: INKT, textAlign: 'center', lineHeight: 34 },
  slogan: { fontSize: 15, color: MUTED, textAlign: 'center', maxWidth: 300, lineHeight: 22 },
  sfeer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 8, maxWidth: 300 },
  sfeerTegel: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  uitlegContainer: { flexGrow: 1, padding: 24, paddingTop: 64, paddingBottom: 32, backgroundColor: PAPIER, justifyContent: 'space-between', gap: 24 },
  uitlegBovenaan: { alignItems: 'flex-end' },
  uitlegMidden: { alignItems: 'center', gap: 16 },
  beeld: { width: 220, height: 220, borderRadius: 48, alignItems: 'center', justifyContent: 'center', maxWidth: '100%' },
  schermContainer: { flexGrow: 1, padding: 24, paddingTop: 64, paddingBottom: 32, backgroundColor: PAPIER, gap: 20 },
  kop: { gap: 8 },
  onderaan: { gap: 14 },
  stippen: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  stip: { width: 8, height: 6, borderRadius: 999, backgroundColor: '#C9D6CF' },
  stipActief: { width: 26, backgroundColor: KLEUR },
  titel: { fontSize: 28, fontWeight: '800', color: INKT, textAlign: 'center' },
  tekst: { fontSize: 16, color: MUTED, lineHeight: 23, textAlign: 'center' },
  knop: { backgroundColor: KLEUR, borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
  knopMetIcoon: { backgroundColor: KLEUR, borderRadius: 16, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  knopTekst: { color: '#fff', fontWeight: '700', fontSize: 17 },
  knopZacht: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: KLEUR, borderRadius: 16, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  knopZachtTekst: { color: KLEUR, fontWeight: '700', fontSize: 17 },
  linkKnop: { alignItems: 'center', paddingVertical: 8 },
  linkTekst: { color: KLEUR, fontWeight: '700', fontSize: 16 },
  alternatief: { gap: 8, alignItems: 'center', marginTop: 8 },
  waarschuwing: { fontSize: 13, color: MUTED, lineHeight: 18, textAlign: 'center' },
  uit: { opacity: 0.6 },
  veldBlok: { gap: 8 },
  veld: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: LIJN, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, fontSize: 17, color: INKT },
  veldFout: { borderColor: FOUT },
  fout: { fontSize: 13, color: FOUT, lineHeight: 18, textAlign: 'center' },
});
