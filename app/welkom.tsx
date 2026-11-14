import { useState } from 'react';
import { Image, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TerugKnop } from '@/ui/terugKnop';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Sleutel } from '@/i18n';
import { zetWelkomGezien } from '@/opslag/welkom';
import { inlogMet, isAnoniem, koppel, stuurAanmeldMail } from '@/opslag/aanmelden';
import { AANBIEDERS, AANMELDEN_MET_MAIL, Aanbieder, isGeldigEmail } from '@/lib/aanmelden';
import { ROUTE_AANGEMELD, ROUTE_NA_WELKOM, uitlegNaar, UITLEG_SCHERMEN, veegRichting } from '@/lib/welkom';
import { BORDEN_BOVEN, heroHoogte, merkDelen, START_KENMERKEN, uitlegFoto, WEEKPLAN_BORDEN } from '@/lib/welkomFotos';
import { WEEK_BORD, WELKOM_FOTO } from '@/ui/welkomFotos';
import { useTaal } from '@/ui/taal';

const KLEUR = '#0F6B66';
const KLEUR_ZACHT = '#D5EDEA';
// WEEK-289: warme crème als achtergrond, oranje als warme accentkleur.
const PAPIER = '#FBF6EE';
const ORANJE = '#E8710A';
const GROEN = '#2E7D4F';
const ACCENTEN = [KLEUR, ORANJE, GROEN];
const ZACHTE_RAND = '#EDE3D3';
// Plan je week: deze dag staat uitgelicht als volle pil, zoals vandaag in een agenda-app.
const DAG_UITGELICHT = 'woensdag';
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
  const { height: schermHoogte, width: schermBreedte } = useWindowDimensions();
  const hero = heroHoogte(schermHoogte);
  // Aan de slag: het fotovlak is hoger dan op de start, want er staan geen logo en knoppen onder.
  const heroUitleg = Math.round(hero * 1.18);
  const [merkFa, merkMenu] = merkDelen(t('welkom.merk'));
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
        {/* WEEK-289: sfeerfoto bovenaan (een gedeelde tafel), rechte onderrand die zacht overloopt; het logo ligt half over de foto. */}
        <View style={[s.heroFoto, { height: hero }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Image source={WELKOM_FOTO.start} style={s.vulFoto} resizeMode="cover" />
          <LinearGradient colors={['rgba(23,32,26,0.20)', 'rgba(23,32,26,0)', 'rgba(251,246,238,0)', PAPIER]} locations={[0, 0.3, 0.8, 1]} style={StyleSheet.absoluteFill} />
        </View>
        <View style={s.hero}>
          <View style={s.logoBadge}>
            <Image source={require('../assets/icon.png')} style={s.logo} accessibilityLabel="Logo van Gezond Boodschappen" />
          </View>
          {/* WEEK-289: woordmerk in twee kleuren: Fa (familie) en menu. */}
          <Text style={s.merk} accessibilityRole="header">
            <Text style={{ color: KLEUR }}>{merkFa}</Text>
            <Text style={{ color: ORANJE }}>{merkMenu}</Text>
          </Text>
          <View style={s.scheiding} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={s.scheidingLijn} />
            <Ionicons name="leaf" size={14} color={ORANJE} />
            <View style={s.scheidingLijn} />
          </View>
          <Text style={s.slogan}>{t('welkom.slogan')}</Text>
          {/* Wat de app doet, in één rustige regel: gekleurd icoon en tekst, met een puntje ertussen. */}
          <View style={s.kenmerken}>
            {START_KENMERKEN.map((k, i) => (
              <View key={k.tekst} style={s.kenmerk}>
                {i > 0 && <View style={s.kenmerkPunt} />}
                <Ionicons name={k.icoon as 'leaf-outline'} size={14} color={ACCENTEN[i % ACCENTEN.length]} />
                <Text style={s.kenmerkTekst}>{t(k.tekst)}</Text>
              </View>
            ))}
          </View>
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
    const foto = uitlegFoto(scherm);
    const naAanmelden = () => setStap('aanmelden');
    // WEEK-289: vorige en volgende, met de knoppen of door te vegen (naar links = volgende, naar rechts = vorige).
    const ga = (richting: 'vorige' | 'volgende') => {
      const naar = uitlegNaar(uitlegIndex, richting, UITLEG_SCHERMEN.length);
      if (naar.soort === 'scherm') setUitlegIndex(naar.index);
      else if (naar.soort === 'start') setStap('start');
      else naAanmelden();
    };
    const veeg = PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 15 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        const richting = veegRichting(g.dx, g.dy);
        if (richting) ga(richting);
      },
    });
    return (
      <View style={s.vol} {...veeg.panHandlers}>
      <ScrollView contentContainerStyle={s.uitlegContainer}>
        <View style={[s.uitlegHero, { height: heroUitleg }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {foto && foto !== 'weekplan' ? (
            <>
              <Image source={WELKOM_FOTO[foto]} style={s.vulFoto} resizeMode="cover" />
              <LinearGradient colors={['rgba(23,32,26,0.30)', 'rgba(23,32,26,0)', 'rgba(251,246,238,0)', PAPIER]} locations={[0, 0.3, 0.8, 1]} style={StyleSheet.absoluteFill} />
            </>
          ) : foto === 'weekplan' ? (
            // WEEK-289: zeven borden, volledig zichtbaar, met de dag eronder (niets op het eten).
            <View style={s.borden}>
              {[WEEKPLAN_BORDEN.slice(0, BORDEN_BOVEN), WEEKPLAN_BORDEN.slice(BORDEN_BOVEN)].map((rij, r) => (
                <View key={r} style={s.bordenRij}>
                  {rij.map((dag, i) => {
                    const maat = Math.min(Math.round((Math.min(schermBreedte, 520) - 32 - 3 * 10) / 4), Math.round((heroUitleg - 200) / 2));
                    return (
                      <View key={dag} style={[s.bord, { width: maat + 8 }]}>
                        <View style={[s.bordRand, { width: maat, height: maat, borderRadius: maat / 2 }]}>
                          <Image source={WEEK_BORD[dag]} style={s.vulFoto} resizeMode="cover" />
                        </View>
                        {/* De dag voluit in kleine, strakke letters onder het bord (niets op het eten); één dag als volle pil, zoals "vandaag" in een agenda. */}
                        <View style={[s.dagPil, dag === DAG_UITGELICHT && s.dagPilAan]}>
                          <Text style={[s.dagTekst, dag === DAG_UITGELICHT && s.dagTekstAan]}>{t(`dag.${dag}` as Sleutel)}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
              <LinearGradient colors={['rgba(251,246,238,0)', PAPIER]} style={s.bordenOvergang} pointerEvents="none" />
            </View>
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: scherm.kleur }]} />
          )}
          <View style={s.uitlegBovenaan}>
            <View style={s.stapChip}>
              <Text style={s.stapChipTekst}>{`${uitlegIndex + 1}/${UITLEG_SCHERMEN.length}`}</Text>
            </View>
          </View>
        </View>
        <Pressable onPress={naAanmelden} accessibilityRole="button" hitSlop={12} style={s.overslaan}>
          <Text style={s.overslaanTekst}>{t('uitleg.overslaan')}</Text>
        </Pressable>
        <View style={s.uitlegTekst}>
          <View style={[s.badge, { backgroundColor: scherm.kleur }]}>
            <Ionicons name={scherm.icoon as 'home-outline'} size={26} color="#fff" />
          </View>
          <Text style={s.titel}>{t(scherm.titel as Sleutel)}</Text>
          <Text style={s.tekst}>{t(scherm.tekst as Sleutel)}</Text>
        </View>
        {/* WEEK-289: slanke navigatie onderaan: rond terugknopje, de stippen, en een rond knopje met pijl (vinkje op het laatste scherm). */}
        <View style={s.navBalk}>
          <Pressable style={s.navTerug} onPress={() => ga('vorige')} accessibilityRole="button" accessibilityLabel={t('algemeen.terug')} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={INKT} />
          </Pressable>
          {stippen(uitlegIndex, UITLEG_SCHERMEN.length)}
          <Pressable style={s.navVolgende} onPress={() => ga('volgende')} accessibilityRole="button" accessibilityLabel={t('uitleg.volgende')} hitSlop={8}>
            <Ionicons name={uitlegIndex === UITLEG_SCHERMEN.length - 1 ? 'checkmark' : 'arrow-forward'} size={26} color="#fff" />
          </Pressable>
        </View>
      </ScrollView>
      </View>
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

  // stap 'aanmelden' (WEEK-289: nieuw ontwerp): foto bovenaan, logo en woordmerk, de aanbieders (WEEK-225: enkel Google),
  // e-mail als dat aanstaat, en verder zonder account met de waarschuwing in een kaartje.
  return (
    <ScrollView contentContainerStyle={s.aanmeldContainer}>
      <View style={[s.heroFoto, { height: Math.round(hero * 0.95) }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Image source={WELKOM_FOTO.start} style={s.vulFoto} resizeMode="cover" />
        <LinearGradient colors={['rgba(23,32,26,0.30)', 'rgba(23,32,26,0)', 'rgba(251,246,238,0)', PAPIER]} locations={[0, 0.35, 0.75, 1]} style={StyleSheet.absoluteFill} />
      </View>
      <View style={s.terugRond}>
        <TerugKnop onPress={() => setStap('start')} kleur={INKT} style={s.terugInRond} />
      </View>
      <View style={s.aanmeldKop}>
        <View style={s.logoBadgeKlein}>
          <Image source={require('../assets/icon.png')} style={s.logoKlein} accessibilityLabel="Logo van Gezond Boodschappen" />
        </View>
        <Text style={s.titelGroot} accessibilityRole="header">{t('aanmelden.titel')}</Text>
      </View>
      {aanmeldFout && (
        <Text style={s.fout} accessibilityRole="alert">
          {t('aanmelden.fout')}
        </Text>
      )}
      <View style={[s.onderaan, s.aanmeldKnoppen]}>
        {AANBIEDERS.map((aanbieder) => (
          <Pressable
            key={aanbieder}
            style={[s.knopWit, bezig && s.uit]}
            onPress={() => metAanbieder(aanbieder)}
            disabled={bezig}
            accessibilityRole="button"
          >
            <Ionicons name={KNOP[aanbieder].icoon} size={20} color={aanbieder === 'google' ? '#4285F4' : INKT} />
            <Text style={s.knopWitTekst}>{t(KNOP[aanbieder].tekst)}</Text>
          </Pressable>
        ))}
        {AANMELDEN_MET_MAIL && (
          <Pressable style={[s.knopWit, bezig && s.uit]} onPress={() => setStap('mail')} disabled={bezig} accessibilityRole="button">
            <Ionicons name="mail-outline" size={20} color={KLEUR} />
            <Text style={s.knopWitTekst}>{t('aanmelden.metMail')}</Text>
          </Pressable>
        )}
        <Pressable style={[s.knop, bezig && s.uit]} onPress={verderZonder} disabled={bezig} accessibilityRole="button">
          <Text style={s.knopTekst}>{t('welkom.alternatief')}</Text>
        </Pressable>
        <View style={s.infoKaart}>
          <Ionicons name="information-circle-outline" size={20} color={ORANJE} />
          <Text style={s.infoTekst}>{t('welkom.alternatiefWaarschuwing')}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  startContainer: { flexGrow: 1, paddingBottom: 28, backgroundColor: PAPIER, justifyContent: 'space-between' },
  // WEEK-289: op het web neemt een Image anders de grootte van het bestand aan in plaats van die van de kaart.
  vulFoto: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  heroFoto: { width: '100%', overflow: 'hidden', backgroundColor: KLEUR_ZACHT },
  hero: { alignItems: 'center', gap: 8, marginTop: -46, paddingHorizontal: 24 },
  logoBadge: { padding: 5, borderRadius: 24, backgroundColor: '#fff', shadowColor: '#3A2A12', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6, marginBottom: 6 },
  logo: { width: 72, height: 72, borderRadius: 19 },
  merk: { fontSize: 42, fontWeight: '900', color: INKT, textAlign: 'center', lineHeight: 46, letterSpacing: -1 },
  scheiding: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  scheidingLijn: { width: 44, height: 1.5, borderRadius: 1, backgroundColor: '#E6D8C2' },
  slogan: { fontSize: 17, color: '#3E4A43', textAlign: 'center', maxWidth: 330, lineHeight: 25, fontWeight: '500' },
  kenmerken: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', rowGap: 6, marginTop: 10 },
  kenmerk: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kenmerkPunt: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#D9C9AE', marginHorizontal: 5 },
  kenmerkTekst: { fontSize: 12.5, fontWeight: '600', color: '#3E4A43' },
  startKnoppen: { paddingHorizontal: 24, marginTop: 22 },
  uitlegContainer: { flexGrow: 1, paddingBottom: 28, backgroundColor: PAPIER },
  uitlegHero: { width: '100%', overflow: 'hidden', backgroundColor: '#E3EEEC' },
  uitlegBovenaan: { position: 'absolute', top: 48, left: 20 },
  stapChip: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  stapChipTekst: { color: INKT, fontWeight: '800', fontSize: 13 },
  overslaan: { position: 'absolute', top: 48, right: 20, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14 },
  overslaanTekst: { color: KLEUR, fontWeight: '800', fontSize: 13 },
  borden: { flex: 1, justifyContent: 'center', gap: 18, paddingTop: 84, paddingBottom: 30 },
  bordenRij: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  bord: { alignItems: 'center' },
  bordRand: { overflow: 'hidden', borderWidth: 3, borderColor: '#fff', backgroundColor: '#fff', shadowColor: '#3A2A12', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  bordenOvergang: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 36 },
  dagPil: { marginTop: 10, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9 },
  dagPilAan: { backgroundColor: KLEUR },
  dagTekst: { fontSize: 12, fontWeight: '700', color: KLEUR },
  dagTekstAan: { color: '#fff' },
  uitlegTekst: { alignItems: 'center', gap: 10, paddingHorizontal: 24, marginTop: -26, flex: 1 },
  badge: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: PAPIER },
  vol: { flex: 1 },
  navBalk: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginTop: 20 },
  navTerug: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', borderWidth: 1, borderColor: ZACHTE_RAND, alignItems: 'center', justifyContent: 'center' },
  navVolgende: { width: 64, height: 64, borderRadius: 32, backgroundColor: KLEUR, alignItems: 'center', justifyContent: 'center', shadowColor: KLEUR, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  aanmeldContainer: { flexGrow: 1, paddingBottom: 28, backgroundColor: PAPIER },
  terugRond: { position: 'absolute', top: 44, left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  terugInRond: { padding: 0, margin: 0 },
  aanmeldKop: { alignItems: 'center', gap: 6, marginTop: -40, paddingHorizontal: 24 },
  logoBadgeKlein: { padding: 4, borderRadius: 20, backgroundColor: '#fff', shadowColor: '#3A2A12', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6, marginBottom: 6 },
  logoKlein: { width: 60, height: 60, borderRadius: 16 },
  titelGroot: { fontSize: 30, fontWeight: '900', color: INKT, textAlign: 'center', letterSpacing: -0.5 },
  aanmeldKnoppen: { paddingHorizontal: 24, marginTop: 28 },
  knopWit: { backgroundColor: '#fff', borderWidth: 1, borderColor: ZACHTE_RAND, borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#3A2A12', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  knopWitTekst: { color: INKT, fontWeight: '700', fontSize: 17 },
  infoKaart: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#FFF3E6', borderRadius: 14, padding: 14, marginTop: 4 },
  infoTekst: { flex: 1, fontSize: 13, lineHeight: 19, color: '#6B4A23' },
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
