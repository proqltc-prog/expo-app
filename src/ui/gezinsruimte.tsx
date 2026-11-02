// Blok "Gezinsruimte" op het tabblad Gezin (WEEK-8): een gezinsruimte maken, lid worden met een code,
// de code delen, de leden zien en de gezinsruimte verlaten.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { leesGezinFout, leesGezinscode, toonGezinscode } from '@/lib/sync';
import { anderenLeden, APP_LINK, ikBeheerder, vraagtOpvolgerBijVertrek } from '@/lib/gezinbeheer';
import { wijsPlanBeheerderAan } from '@/opslag/plan';
import { laadVoornaam, zetVoornaam } from '@/opslag/voornaam';
import { valideerVoornaam, VoornaamFout } from '@/lib/voornaam';
import { gezinsruimteBeschikbaar } from '@/opslag/supabase';
import { isAnoniem, koppel } from '@/opslag/aanmelden';
import { aanbiedingen, Aanbieder } from '@/lib/aanmelden';
import {
  bijWijziging,
  Gezin,
  GezinsLid,
  heffGezinOp,
  ikId,
  laadBeheerderId,
  laadGezin,
  laadLeden,
  maakBeheerder,
  maakGezin,
  syncStatus,
  SyncStatus,
  verlaatGezin,
  verlaatMetOpvolger,
  wordLid,
  zetLidNaam,
} from '@/opslag/sync';
import { Sleutel } from '@/i18n';
import { useTaal } from '@/ui/taal';

const KLEUR = '#2e7d4f';

// WEEK-104: het gezin krijgt een standaardnaam. De voornaam van het lid komt van het toestel (WEEK-163).
const GEZINSNAAM_STANDAARD = 'Gezin';

export function GezinsRuimte({ kopTonen = true }: { kopTonen?: boolean } = {}) {
  const { t } = useTaal();
  const [gezin, setGezin] = useState<Gezin | null | undefined>(undefined);
  const [leden, setLeden] = useState<GezinsLid[]>([]);
  const [status, setStatus] = useState<SyncStatus>(syncStatus());
  const [code, setCode] = useState('');
  const [uitlegOpen, setUitlegOpen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  // Beheer (WEEK-65): wie is beheerder van het gezin, wie ben ik, en kiest de beheerder nu een opvolger?
  const [beheerderId, setBeheerderId] = useState<string | undefined>(undefined);
  const [mijnId, setMijnId] = useState<string | undefined>(undefined);
  const [kiesOpvolger, setKiesOpvolger] = useState(false);
  // Voornaam van dit toestel (WEEK-163): zichtbaar bij "gekocht door" en "toegevoegd door".
  const [voornaam, setVoornaam] = useState('');
  const [voornaamInvoer, setVoornaamInvoer] = useState('');
  const [voornaamFout, setVoornaamFout] = useState<VoornaamFout | null>(null);
  const [voornaamOpgeslagen, setVoornaamOpgeslagen] = useState(false);
  // Aanmelden (WEEK-166): null = nog niet bekend.
  const [anoniem, setAnoniem] = useState<boolean | null>(null);
  const [aanmeldFout, setAanmeldFout] = useState(false);
  const [aanmeldBezig, setAanmeldBezig] = useState(false);

  // Aanmelden (WEEK-166): is het toestel nog anoniem?
  useEffect(() => {
    void isAnoniem().then(setAnoniem);
  }, []);

  useEffect(() => {
    laadVoornaam().then((n) => {
      setVoornaam(n);
      setVoornaamInvoer(n);
    });
  }, []);

  const bewaarVoornaam = () =>
    voerUit(async () => {
      const r = valideerVoornaam(voornaamInvoer);
      if (!r.ok) {
        setVoornaamFout(r.fout);
        setVoornaamOpgeslagen(false);
        return;
      }
      setVoornaamFout(null);
      // Eerst het toestel, dan het gezin. Lukt het gezin niet, dan blijft de nieuwe naam op dit toestel staan.
      await zetVoornaam(r.naam);
      setVoornaam(r.naam);
      setVoornaamInvoer(r.naam);
      await zetLidNaam(r.naam);
      setVoornaamOpgeslagen(true);
    });

  const vernieuw = useCallback(async () => {
    const g = await laadGezin();
    setGezin(g);
    setLeden(g ? await laadLeden().catch(() => []) : []);
    setBeheerderId(g ? await laadBeheerderId().catch(() => undefined) : undefined);
    setMijnId(await ikId());
  }, []);

  useEffect(() => {
    vernieuw();
    const stop = [
      bijWijziging('gezin', vernieuw),
      bijWijziging('leden', vernieuw),
      // De beheerder van het weekplan volgt de beheerder van het gezin (WEEK-65).
      bijWijziging('plan', vernieuw),
      bijWijziging('status', () => setStatus(syncStatus())),
    ];
    return () => stop.forEach((f) => f());
  }, [vernieuw]);

  if (!gezinsruimteBeschikbaar() || gezin === undefined) return null;

  const voerUit = async (actie: () => Promise<unknown>) => {
    setFout(null);
    setBezig(true);
    try {
      await actie();
      await vernieuw();
    } catch (e) {
      setFout(t(`gezin.fout.${leesGezinFout(e instanceof Error ? e.message : String(e))}` as Sleutel));
    } finally {
      setBezig(false);
      // Ook na een fout: bij "al_lid" is de koppeling intussen hersteld en moet het gezin zichtbaar worden (WEEK-129).
      await vernieuw().catch(() => undefined);
    }
  };

  const maak = () =>
    voerUit(async () => {
      await maakGezin(GEZINSNAAM_STANDAARD, await laadVoornaam());
      // Wie het gezin maakt, is ook beheerder van het weekplan (WEEK-65).
      const id = await ikId();
      if (id) await wijsPlanBeheerderAan(id);
    });

  const sluitAan = () => {
    const gelezen = leesGezinscode(code);
    if (!gelezen) {
      setFout(t('gezin.fout.code'));
      return;
    }
    voerUit(async () => wordLid(gelezen, await laadVoornaam()));
  };

  const deel = () => gezin && Share.share({ message: t('gezin.deelTekst', { code: toonGezinscode(gezin.code) }) });

  const beheerder = ikBeheerder(beheerderId, mijnId);
  const beheerderNaamTekst = leden.find((l) => l.id === beheerderId)?.naam;

  const verlaat = () => {
    // Een beheerder met andere leden kiest eerst een opvolger (WEEK-65).
    if (vraagtOpvolgerBijVertrek(beheerder, leden, mijnId)) {
      setKiesOpvolger(true);
      return;
    }
    Alert.alert(t('gezin.verlaat'), t('gezin.verlaatVraag'), [
      { text: t('gezin.annuleren'), style: 'cancel' },
      { text: t('gezin.verlaat'), style: 'destructive', onPress: () => voerUit(verlaatGezin) },
    ]);
  };

  const maakLidBeheerder = (lid: GezinsLid) =>
    Alert.alert(t('gezin.maakBeheerder'), t('gezin.maakBeheerderVraag', { naam: lid.naam || t('gezin.naamloos') }), [
      { text: t('gezin.annuleren'), style: 'cancel' },
      {
        text: t('gezin.maakBeheerder'),
        onPress: () =>
          voerUit(async () => {
            await maakBeheerder(lid.id);
            // Nog steeds beheerder van het plan, dus dit mag (WEEK-65).
            await wijsPlanBeheerderAan(lid.id);
          }),
      },
    ]);

  const naarOpvolger = (lid: GezinsLid) =>
    Alert.alert(t('gezin.verlaat'), t('gezin.verlaatOpvolgerVraag', { naam: lid.naam || t('gezin.naamloos') }), [
      { text: t('gezin.annuleren'), style: 'cancel' },
      {
        text: t('gezin.verlaat'),
        style: 'destructive',
        onPress: () => {
          setKiesOpvolger(false);
          voerUit(async () => {
            // Eerst het plan overdragen: daarna mag ik het niet meer wijzigen.
            await wijsPlanBeheerderAan(lid.id);
            try {
              await verlaatMetOpvolger(lid.id);
            } catch (e) {
              if (mijnId) await wijsPlanBeheerderAan(mijnId);
              throw e;
            }
          });
        },
      },
    ]);

  const heffOp = () =>
    Alert.alert(t('gezin.heffOp'), t('gezin.heffOpVraag'), [
      { text: t('gezin.annuleren'), style: 'cancel' },
      { text: t('gezin.heffOp'), style: 'destructive', onPress: () => voerUit(heffGezinOp) },
    ]);

  return (
    <>
      {kopTonen && <Text style={s.kop}>{t('gezin.titel')}</Text>}
      <View style={s.kaart}>
        <Text style={s.uitleg}>{t('naam.uitleg')}</Text>
        <Text style={s.label}>{t('naam.kop')}</Text>
        <View style={s.rij}>
          <TextInput
            style={[s.veld, s.naamVeld, voornaamFout && s.veldFout]}
            value={voornaamInvoer}
            onChangeText={(tekst) => {
              setVoornaamInvoer(tekst);
              setVoornaamFout(null);
              setVoornaamOpgeslagen(false);
            }}
            placeholder={t('welkom.naamVeld')}
            accessibilityLabel={t('naam.kop')}
            maxLength={25}
            autoCapitalize="words"
            autoCorrect={false}
          />
          <Pressable style={[s.knopKlein, (bezig || voornaamInvoer.trim() === voornaam) && s.uit]} onPress={bewaarVoornaam} disabled={bezig || voornaamInvoer.trim() === voornaam}>
            <Text style={s.knopKleinTekst}>{t('naam.opslaan')}</Text>
          </Pressable>
        </View>
        {voornaamFout && <Text style={s.fout} accessibilityRole="alert">{t(`naam.fout.${voornaamFout}` as 'naam.fout.leeg')}</Text>}
        {voornaamOpgeslagen && !voornaamFout && <Text style={s.status}>{t('naam.opgeslagen')}</Text>}
        {anoniem !== null && (
          <>
            <Text style={s.label}>{t('aanmelden.kop')}</Text>
            {aanbiedingen(anoniem).length > 0 ? (
              <>
                <Text style={s.uitleg}>{t('aanmelden.uitleg')}</Text>
                {aanbiedingen(anoniem).map((aanbieder: Aanbieder) => (
                  <Pressable
                    key={aanbieder}
                    style={[s.knop, aanmeldBezig && s.uit]}
                    disabled={aanmeldBezig}
                    onPress={async () => {
                      setAanmeldBezig(true);
                      setAanmeldFout(false);
                      try {
                        await koppel(aanbieder);
                      } catch {
                        setAanmeldFout(true);
                      } finally {
                        setAanmeldBezig(false);
                      }
                    }}
                  >
                    <Text style={s.knopTekst}>{t('aanmelden.google')}</Text>
                  </Pressable>
                ))}
                {aanmeldFout && <Text style={s.fout} accessibilityRole="alert">{t('aanmelden.fout')}</Text>}
              </>
            ) : (
              <Text style={s.status}>{t('aanmelden.gekoppeld')}</Text>
            )}
          </>
        )}
        {!gezin ? (
          <>
            <Text style={s.uitleg}>{t('gezin.uitleg')}</Text>
            <Pressable style={[s.knop, bezig && s.uit]} onPress={maak} disabled={bezig}>
              {bezig ? <ActivityIndicator color="#fff" /> : <Text style={s.knopTekst}>{t('gezin.maak')}</Text>}
            </Pressable>
            <Text style={s.uitleg}>{t('gezin.hebJeCode')}</Text>
            <View style={s.rij}>
              <TextInput
                style={[s.veld, s.codeVeld]}
                value={code}
                onChangeText={setCode}
                placeholder={t('gezin.codePlaceholder')}
                placeholderTextColor="#8a948e"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={8}
              />
              <Pressable style={[s.knopKlein, bezig && s.uit]} onPress={sluitAan} disabled={bezig}>
                <Text style={s.knopKleinTekst}>{t('gezin.wordLid')}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={s.gedeeld}>{t('gezin.gedeeldMet', { naam: gezin.naam })}</Text>
            <Text style={[s.status, status === 'offline' && s.statusOffline]}>{t(`gezin.status.${status}` as Sleutel)}</Text>
            <View style={s.rij}>
              <Text style={[s.label, { flex: 1 }]}>{t('gezin.code')}</Text>
              <Pressable onPress={() => setUitlegOpen((o) => !o)} accessibilityRole="button" accessibilityLabel={t('gezin.infoKnop')} accessibilityState={{ expanded: uitlegOpen }} hitSlop={8}>
                <Ionicons name={uitlegOpen ? 'information-circle' : 'information-circle-outline'} size={22} color={KLEUR} />
              </Pressable>
            </View>
            {uitlegOpen && (
              <View style={s.gezinsUitleg}>
                <Text style={s.uitlegTekst}>{t('gezin.infoTekst', { link: APP_LINK })}</Text>
                <Pressable onPress={() => Linking.openURL(APP_LINK)} accessibilityRole="link" style={s.uitlegKnop}>
                  <Text style={s.knopKleinTekst}>{t('gezin.openApp')}</Text>
                </Pressable>
              </View>
            )}
            <View style={s.rij}>
              <Text style={s.code} selectable>{toonGezinscode(gezin.code)}</Text>
              <Pressable style={s.knopKlein} onPress={deel}>
                <Text style={s.knopKleinTekst}>{t('gezin.deel')}</Text>
              </Pressable>
            </View>
            {beheerderNaamTekst && <Text style={s.label}>{t('gezin.beheerder', { naam: beheerderNaamTekst })}</Text>}
            {leden.length > 0 && (
              <>
                <Text style={s.label}>{t('gezin.leden')}</Text>
                {leden.map((l) => {
                  const naamLid = l.naam || t('gezin.naamloos');
                  return (
                    <View key={l.id} style={s.rij}>
                      <Text style={[s.lid, { flex: 1 }]}>• {l.ikZelf ? t('gezin.jij', { naam: naamLid }) : naamLid}</Text>
                      {beheerder && !l.ikZelf && (
                        <Pressable style={s.knopKlein} onPress={() => maakLidBeheerder(l)} disabled={bezig}>
                          <Text style={s.knopKleinTekst}>{t('gezin.maakBeheerder')}</Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </>
            )}
            {kiesOpvolger ? (
              <>
                <Text style={s.uitleg}>{t('gezin.kiesOpvolger')}</Text>
                {anderenLeden(leden, mijnId).map((l) => (
                  <Pressable key={l.id} style={s.knopKlein} onPress={() => naarOpvolger(l)} disabled={bezig}>
                    <Text style={s.knopKleinTekst}>{l.naam || t('gezin.naamloos')}</Text>
                  </Pressable>
                ))}
                <Pressable onPress={() => setKiesOpvolger(false)} style={s.verlaat}>
                  <Text style={s.uitleg}>{t('gezin.annuleren')}</Text>
                </Pressable>
              </>
            ) : (
              <Pressable onPress={verlaat} disabled={bezig} style={s.verlaat}>
                {bezig ? <ActivityIndicator color="#c62828" /> : <Text style={s.verlaatTekst}>{t('gezin.verlaat')}</Text>}
              </Pressable>
            )}
            {beheerder && (
              <Pressable onPress={heffOp} disabled={bezig} style={s.verlaat}>
                <Text style={s.verlaatTekst}>{t('gezin.heffOp')}</Text>
              </Pressable>
            )}
          </>
        )}
        {fout && <Text style={s.fout}>{fout}</Text>}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  kop: { fontWeight: '700', fontSize: 15, color: '#333', marginTop: 10 },
  kaart: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e5e5', gap: 10 },
  uitleg: { color: '#555' },
  veld: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, minHeight: 44, backgroundColor: '#fafafa' },
  naamVeld: { flex: 1, fontSize: 16, color: '#1d2420' },
  veldFout: { borderColor: '#B3261E' },
  codeVeld: { flex: 1, letterSpacing: 2, fontWeight: '600', color: '#1d2420' },
  rij: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  knop: { backgroundColor: KLEUR, borderRadius: 12, padding: 14, alignItems: 'center', minHeight: 50, justifyContent: 'center' },
  knopTekst: { color: '#fff', fontWeight: '700', fontSize: 16 },
  knopKlein: { borderWidth: 1.5, borderColor: KLEUR, borderRadius: 10, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  knopKleinTekst: { color: KLEUR, fontWeight: '700' },
  uit: { opacity: 0.6 },
  gedeeld: { fontSize: 16, fontWeight: '600' },
  status: { color: KLEUR, fontSize: 13 },
  statusOffline: { color: '#7a5b00' },
  label: { color: '#777', fontSize: 13, fontWeight: '600' },
  gezinsUitleg: { borderWidth: 1, borderColor: KLEUR, borderRadius: 10, padding: 12, gap: 10 },
  uitlegTekst: { color: '#1d2420', fontSize: 14, lineHeight: 20 },
  uitlegKnop: { alignSelf: 'flex-start', borderWidth: 1.5, borderColor: KLEUR, borderRadius: 10, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  code: { flex: 1, fontSize: 26, fontWeight: '700', letterSpacing: 4, color: '#1f5c3a' },
  lid: { fontSize: 15 },
  verlaat: { alignItems: 'center', padding: 8 },
  verlaatTekst: { color: '#c62828', fontWeight: '600' },
  fout: { color: '#c62828' },
});
