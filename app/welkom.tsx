import { useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TerugKnop } from '@/ui/terugKnop';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Sleutel } from '@/i18n';
import { zetWelkomGezien } from '@/opslag/welkom';
import { inlogMet, isAnoniem, koppel, stuurAanmeldMail } from '@/opslag/aanmelden';
import { AANBIEDERS, AANMELDEN_MET_MAIL, Aanbieder, isGeldigEmail } from '@/lib/aanmelden';
import { ROUTE_AANGEMELD, ROUTE_NA_WELKOM, UITLEG_SCHERMEN } from '@/lib/welkom';
import { dagKort, kaartVerhouding, uitlegFoto, WEEKPLAN_BLAADJES } from '@/lib/welkomFotos';
import { WELKOM_FOTO } from '@/ui/welkomFotos';
import { useTaal } from '@/ui/taal';

const KLEUR = '#0F6B66';
const KLEUR_ZACHT = '#D5EDEA';
// WEEK-289: warme crème als achtergrond, oranje als warme accentkleur.
const PAPIER = '#FBF6EE';
const ORANJE = '#E8710A';
const BLAADJE_KLEUREN = [KLEUR, ORANJE, '#2E7D4F'];
const INKT = '#17201A';
const MUTED = '#5E6B63';
const LIJN = '#E4E8E1';
const FOUT = '#B3261E';

type Stap = 'start' | 'uitleg' | 'aanmelden' | 'mail';

// Icoon en tekst per aanbieder; welke er op het scherm staan, bepaalt AANBIEDERS (WEEK-225).
const KNOP: Record<Aanbieder, { icoon: 'logo-google' | 'logo-apple' | 'logo-facebook'; tekst: Sleutel }> = {
  google: { icoon: 'logo-google', tekst: 'aanmelden.metGoogle' },
  apple: { icoon: 'logo-apple', tekst: 'aanmelden.metApple' },
  facebook: { icoon: 'logo-facebook', tekst: 'aanmelden.metFacebook' },
};

/**
 * Opstart bij de eerste opening (WEEK-79, WEEK-185): startscherm met Get started en Login,
 * dan de uitlegschermen, dan aanmelden. Geen taal- en naamscherm meer: de taal volgt het toestel,
 * en de naam en het gezin stel je in de instellingen in.
 */
export default function Welkom() {
  const { t } = useTaal();
  const { height: schermHoogte } = useWindowDimensions();
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
      if (await isAnoniem()) await koppel(aanbieder);
      else await inlogMet(aanbieder);
      // WEEK-231: op het web vertrekt de pagina nu naar Google en komt ze terug op /aangemeld; hier niets meer
      // tonen, anders is de weekplanner even zichtbaar. In de app opent Google in de browser: wacht op /aangemeld.
      if (Platform.OS !== 'web') router.replace(ROUTE_AANGEMELD);
    } catch {
      setAanmeldFout(true);
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
        <View>
        {/* WEEK-289: sfeerfoto bovenaan (een gedeelde tafel) met afgeronde onderkant; het logo ligt half over de foto. */}
        <View style={[s.heroFoto, { height: Math.max(260, Math.round(schermHoogte * 0.54)) }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Image source={WELKOM_FOTO.start} style={s.vulFoto} resizeMode="cover" />
          <LinearGradient colors={['rgba(23,32,26,0.22)', 'rgba(23,32,26,0)', 'rgba(23,32,26,0)', 'rgba(23,32,26,0.28)']} locations={[0, 0.28, 0.6, 1]} style={StyleSheet.absoluteFill} />
        </View>
        <View style={s.hero}>
          <View style={s.logoBadge}>
            <Image source={require('../assets/icon.png')} style={s.logo} accessibilityLabel="Logo van Gezond Boodschappen" />
          </View>
          <Text style={s.merk}>{t('welkom.merk')}</Text>
          <Text style={s.slogan}>{t('welkom.slogan')}</Text>
        </View>
        </View>
        <View style={[s.onderaan, s.startKnoppen]}>
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
    const foto = uitlegFoto(scherm);
    const naAanmelden = () => setStap('aanmelden');
    return (
      <ScrollView contentContainerStyle={s.uitlegContainer}>
        <View style={s.uitlegBovenaan}>
          <View style={s.stapChip}>
            <Text style={s.stapChipTekst}>{`${uitlegIndex + 1}/${UITLEG_SCHERMEN.length}`}</Text>
          </View>
          <Pressable onPress={naAanmelden} accessibilityRole="button" hitSlop={12}>
            <Text style={s.linkTekst}>{t('uitleg.overslaan')}</Text>
          </Pressable>
        </View>
        <View style={s.uitlegMidden}>
          {/* WEEK-289: een fotokaart per scherm, met het icoon van het scherm als badge onderaan. */}
          <View style={s.kaartWrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={[s.fotoKaart, foto ? { aspectRatio: kaartVerhouding(foto) } : { backgroundColor: scherm.kleur, aspectRatio: 1.3 }]}>
              {foto && <Image source={WELKOM_FOTO[foto]} style={s.vulFoto} resizeMode="cover" />}
              <LinearGradient colors={['rgba(23,32,26,0)', 'rgba(23,32,26,0.22)']} locations={[0.6, 1]} style={StyleSheet.absoluteFill} />
              {/* Plan je week: een kalenderblaadje met de dag op elk bord; de dagnaam volgt de taal van de app. */}
              {foto === 'weekplan' &&
                WEEKPLAN_BLAADJES.map((b, i) => (
                  <View
                    key={b.dag}
                    style={[s.blaadje, { left: `${b.x}%`, top: `${b.y}%`, transform: [{ translateX: -26 }, { translateY: -24 }, { rotate: `${b.kanteling}deg` }] }]}
                  >
                    <View style={[s.blaadjeKop, { backgroundColor: BLAADJE_KLEUREN[i % BLAADJE_KLEUREN.length] }]}>
                      <Text style={s.blaadjeKort}>{dagKort(t(`dag.${b.dag}` as Sleutel))}</Text>
                    </View>
                    <Text style={s.blaadjeNaam} numberOfLines={1}>{t(`dag.${b.dag}` as Sleutel).toLocaleLowerCase()}</Text>
                  </View>
                ))}
            </View>
            <View style={[s.badge, { backgroundColor: scherm.kleur }]}>
              <Ionicons name={scherm.icoon as 'home-outline'} size={26} color="#fff" />
            </View>
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
        <TerugKnop onPress={() => setStap('aanmelden')} kleur={KLEUR} style={s.terug} />
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

  // stap 'aanmelden': de aanbieders die aanstaan (WEEK-225: enkel Google), e-mail als dat aanstaat, en zonder account.
  return (
    <ScrollView contentContainerStyle={s.schermContainer}>
      <TerugKnop onPress={() => setStap('start')} kleur={KLEUR} style={s.terug} />
      <View style={s.kop}>
        <Text style={s.titel}>{t('aanmelden.titel')}</Text>
      </View>
      {aanmeldFout && (
        <Text style={s.fout} accessibilityRole="alert">
          {t('aanmelden.fout')}
        </Text>
      )}
      <View style={s.onderaan}>
        {AANBIEDERS.map((aanbieder) => (
          <Pressable
            key={aanbieder}
            style={[s.knopMetIcoon, bezig && s.uit]}
            onPress={() => metAanbieder(aanbieder)}
            disabled={bezig}
            accessibilityRole="button"
          >
            <Ionicons name={KNOP[aanbieder].icoon} size={18} color="#fff" />
            <Text style={s.knopTekst}>{t(KNOP[aanbieder].tekst)}</Text>
          </Pressable>
        ))}
        {AANMELDEN_MET_MAIL && (
          <Pressable style={[s.knopZacht, bezig && s.uit]} onPress={() => setStap('mail')} disabled={bezig} accessibilityRole="button">
            <Ionicons name="mail-outline" size={18} color={KLEUR} />
            <Text style={s.knopZachtTekst}>{t('aanmelden.metMail')}</Text>
          </Pressable>
        )}
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
  startContainer: { flexGrow: 1, paddingBottom: 40, backgroundColor: PAPIER, justifyContent: 'space-between' },
  // WEEK-289: op het web neemt een Image anders de grootte van het bestand aan in plaats van die van de kaart.
  vulFoto: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  heroFoto: { width: '100%', borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden', backgroundColor: KLEUR_ZACHT },
  hero: { alignItems: 'center', gap: 10, marginTop: -58, paddingHorizontal: 24 },
  logoBadge: { padding: 6, borderRadius: 30, backgroundColor: '#fff', shadowColor: '#3A2A12', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6, marginBottom: 6 },
  logo: { width: 92, height: 92, borderRadius: 24 },
  merk: { fontSize: 30, fontWeight: '800', color: INKT, textAlign: 'center', lineHeight: 34 },
  slogan: { fontSize: 15, color: MUTED, textAlign: 'center', maxWidth: 300, lineHeight: 22 },
  startKnoppen: { paddingHorizontal: 24, marginTop: 28 },
  uitlegContainer: { flexGrow: 1, padding: 24, paddingTop: 56, paddingBottom: 32, backgroundColor: PAPIER, justifyContent: 'space-between', gap: 24 },
  uitlegBovenaan: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stapChip: { backgroundColor: '#fff', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12, borderWidth: 1, borderColor: '#EDE3D3' },
  stapChipTekst: { color: INKT, fontWeight: '700', fontSize: 13 },
  uitlegMidden: { alignItems: 'center', gap: 14 },
  kaartWrap: { width: '100%', maxWidth: 440, marginBottom: 14 },
  fotoKaart: { width: '100%', borderRadius: 28, overflow: 'hidden', backgroundColor: KLEUR_ZACHT, shadowColor: '#3A2A12', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  badge: { position: 'absolute', left: 18, bottom: -22, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: PAPIER },
  blaadje: { position: 'absolute', width: 52, borderRadius: 8, backgroundColor: '#fff', overflow: 'hidden', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  blaadjeKop: { width: '100%', alignItems: 'center', paddingVertical: 2 },
  blaadjeKort: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  blaadjeNaam: { fontSize: 8, color: '#444', fontWeight: '600', paddingVertical: 3, paddingHorizontal: 1 },
  schermContainer: { flexGrow: 1, padding: 24, paddingTop: 64, paddingBottom: 32, backgroundColor: PAPIER, gap: 20 },
  kop: { gap: 8 },
  onderaan: { gap: 14 },
  stippen: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  stip: { width: 8, height: 6, borderRadius: 999, backgroundColor: '#C9D6CF' },
  stipActief: { width: 26, backgroundColor: KLEUR },
  titel: { fontSize: 27, fontWeight: '800', color: INKT, textAlign: 'center', marginTop: 8 },
  tekst: { fontSize: 16, color: MUTED, lineHeight: 23, textAlign: 'center' },
  knop: { backgroundColor: KLEUR, borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
  knopMetIcoon: { backgroundColor: KLEUR, borderRadius: 16, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  knopTekst: { color: '#fff', fontWeight: '700', fontSize: 17 },
  knopZacht: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: KLEUR, borderRadius: 16, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  knopZachtTekst: { color: KLEUR, fontWeight: '700', fontSize: 17 },
  linkKnop: { alignItems: 'center', paddingVertical: 8 },
  linkTekst: { color: KLEUR, fontWeight: '700', fontSize: 16 },
  terug: { alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 16 },
  alternatief: { gap: 8, alignItems: 'center', marginTop: 8 },
  waarschuwing: { fontSize: 13, color: MUTED, lineHeight: 18, textAlign: 'center' },
  uit: { opacity: 0.6 },
  veldBlok: { gap: 8 },
  veld: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: LIJN, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, fontSize: 17, color: INKT },
  veldFout: { borderColor: FOUT },
  fout: { fontSize: 13, color: FOUT, lineHeight: 18, textAlign: 'center' },
});
