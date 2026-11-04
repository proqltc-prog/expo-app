import { ACCENT } from '@/ui/kleuren';
// Blok "Gezinsruimte" op het tabblad Gezin (WEEK-8): een gezinsruimte maken, lid worden met een code,
// de code delen, de leden zien en de gezinsruimte verlaten.
// WEEK-174: het Google-blok is hier weg; aanmelden gebeurt bij het starten van de app.
// WEEK-176: verlaten staat bovenaan en is altijd zichtbaar; bevestigen gebeurt in de pagina zelf
// (een Alert doet op het web niets), en de kleine knoppen zijn icoontjes met een toegankelijkheidslabel.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { leesGezinFout, leesGezinscode, toonGezinscode } from '@/lib/sync';
import { anderenLeden, APP_LINK, ikBeheerder, vraagtOpvolgerBijVertrek } from '@/lib/gezinbeheer';
import { wijsPlanBeheerderAan } from '@/opslag/plan';
import { laadVoornaam, zetVoornaam } from '@/opslag/voornaam';
import { valideerVoornaam, VoornaamFout } from '@/lib/voornaam';
import { gezinsruimteBeschikbaar } from '@/opslag/supabase';
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
const GEVAAR = '#c62828';

// WEEK-104: het gezin krijgt een standaardnaam. De voornaam van het lid komt van het toestel (WEEK-163).
const GEZINSNAAM_STANDAARD = 'Gezin';

/** Een actie die eerst bevestigd moet worden, in de pagina zelf (WEEK-176). */
type Bevestiging = { actie: 'verlaat' } | { actie: 'heffOp' } | { actie: 'opvolger'; lid: GezinsLid } | { actie: 'beheerder'; lid: GezinsLid };

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
  const [bevestig, setBevestig] = useState<Bevestiging | null>(null);
  // Voornaam van dit toestel (WEEK-163): zichtbaar bij "gekocht door" en "toegevoegd door".
  const [voornaam, setVoornaam] = useState('');
  const [voornaamInvoer, setVoornaamInvoer] = useState('');
  const [voornaamFout, setVoornaamFout] = useState<VoornaamFout | null>(null);
  const [voornaamOpgeslagen, setVoornaamOpgeslagen] = useState(false);

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

  // WEEK-176: verlaten kan altijd, ook voor een niet-beheerder. Een beheerder met andere leden kiest eerst een opvolger (WEEK-65).
  const verlaat = () => {
    if (vraagtOpvolgerBijVertrek(beheerder, leden, mijnId)) {
      setKiesOpvolger(true);
      return;
    }
    setBevestig({ actie: 'verlaat' });
  };

  const naamVan = (lid: GezinsLid) => lid.naam || t('gezin.naamloos');

  const bevestigVraag = bevestig
    ? (() => {
        switch (bevestig.actie) {
          case 'verlaat':
            return { tekst: t('gezin.verlaatVraag'), knop: t('gezin.verlaat') };
          case 'heffOp':
            return { tekst: t('gezin.heffOpVraag'), knop: t('gezin.heffOp') };
          case 'opvolger':
            return { tekst: t('gezin.verlaatOpvolgerVraag', { naam: naamVan(bevestig.lid) }), knop: t('gezin.verlaat') };
          case 'beheerder':
            return { tekst: t('gezin.maakBeheerderVraag', { naam: naamVan(bevestig.lid) }), knop: t('gezin.maakBeheerder') };
        }
      })()
    : null;

  const bevestigDoe = () => {
    const b = bevestig;
    setBevestig(null);
    if (!b) return;
    if (b.actie === 'verlaat') {
      void voerUit(verlaatGezin);
    } else if (b.actie === 'heffOp') {
      void voerUit(heffGezinOp);
    } else if (b.actie === 'beheerder') {
      void voerUit(async () => {
        await maakBeheerder(b.lid.id);
        // Nog steeds beheerder van het plan, dus dit mag (WEEK-65).
        await wijsPlanBeheerderAan(b.lid.id);
      });
    } else {
      setKiesOpvolger(false);
      void voerUit(async () => {
        // Eerst het plan overdragen: daarna mag ik het niet meer wijzigen.
        await wijsPlanBeheerderAan(b.lid.id);
        try {
          await verlaatMetOpvolger(b.lid.id);
        } catch (e) {
          if (mijnId) await wijsPlanBeheerderAan(mijnId);
          throw e;
        }
      });
    }
  };

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
          <Pressable
            style={[s.icoonKnop, (bezig || voornaamInvoer.trim() === voornaam) && s.uit]}
            onPress={bewaarVoornaam}
            disabled={bezig || voornaamInvoer.trim() === voornaam}
            accessibilityRole="button"
            accessibilityLabel={t('naam.opslaan')}
          >
            <Ionicons name="checkmark" size={24} color={KLEUR} />
          </Pressable>
        </View>
        {voornaamFout && <Text style={s.fout} accessibilityRole="alert">{t(`naam.fout.${voornaamFout}` as 'naam.fout.leeg')}</Text>}
        {voornaamOpgeslagen && !voornaamFout && <Text style={s.status}>{t('naam.opgeslagen')}</Text>}
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
              <Pressable
                style={[s.icoonKnop, bezig && s.uit]}
                onPress={sluitAan}
                disabled={bezig}
                accessibilityRole="button"
                accessibilityLabel={t('gezin.wordLid')}
              >
                <Ionicons name="enter-outline" size={24} color={KLEUR} />
              </Pressable>
            </View>
          </>
        ) : (
          <>
            {/* WEEK-193: naam en verbindingsstatus in een kopregel; de status als pil. */}
            <View style={s.kopRij}>
              <Text style={s.gedeeld}>{t('gezin.gedeeldMet', { naam: gezin.naam })}</Text>
              <Text style={[s.statusPil, status === 'offline' && s.statusPilOffline]}>{t(`gezin.status.${status}` as Sleutel)}</Text>
            </View>

            {/* WEEK-176: verlaten staat bovenaan, zodat het altijd bereikbaar is voor elk lid. */}
            {kiesOpvolger ? (
              <View style={s.bevestig}>
                <Text style={s.uitleg}>{t('gezin.kiesOpvolger')}</Text>
                <View style={s.kiesRij}>
                  {anderenLeden(leden, mijnId).map((l) => (
                    <Pressable
                      key={l.id}
                      style={s.knopKlein}
                      onPress={() => {
                        setKiesOpvolger(false);
                        setBevestig({ actie: 'opvolger', lid: l });
                      }}
                      disabled={bezig}
                      accessibilityRole="button"
                    >
                      <Text style={s.knopKleinTekst}>{naamVan(l)}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable onPress={() => setKiesOpvolger(false)} accessibilityRole="button" style={s.annuleerKnop}>
                  <Text style={s.uitleg}>{t('gezin.annuleren')}</Text>
                </Pressable>
              </View>
            ) : bevestigVraag ? (
              <View style={s.bevestig}>
                <Text style={s.uitleg}>{bevestigVraag.tekst}</Text>
                <View style={s.kiesRij}>
                  <Pressable style={[s.knopGevaar, bezig && s.uit]} onPress={bevestigDoe} disabled={bezig} accessibilityRole="button">
                    <Text style={s.knopGevaarTekst}>{bevestigVraag.knop}</Text>
                  </Pressable>
                  <Pressable style={s.knopKlein} onPress={() => setBevestig(null)} accessibilityRole="button">
                    <Text style={s.knopKleinTekst}>{t('gezin.annuleren')}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={verlaat}
                disabled={bezig}
                style={[s.actieKnop, bezig && s.uit]}
                accessibilityRole="button"
                accessibilityLabel={t('gezin.verlaat')}
              >
                <Ionicons name="log-out-outline" size={22} color={GEVAAR} />
                <Text style={s.verlaatTekst}>{t('gezin.verlaat')}</Text>
              </Pressable>
            )}
            {fout && <Text style={s.fout} accessibilityRole="alert">{fout}</Text>}

            <View style={s.rij}>
              <Text style={[s.label, { flex: 1, minWidth: 0 }]}>{t('gezin.code')}</Text>
              <Pressable
                onPress={() => setUitlegOpen((o) => !o)}
                accessibilityRole="button"
                accessibilityLabel={t('gezin.infoKnop')}
                accessibilityState={{ expanded: uitlegOpen }}
                hitSlop={8}
              >
                <Ionicons name={uitlegOpen ? 'information-circle' : 'information-circle-outline'} size={22} color={ACCENT} />
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
            <View style={[s.rij, s.codePaneel]}>
              <Text style={s.code} selectable numberOfLines={1} adjustsFontSizeToFit>
                {toonGezinscode(gezin.code)}
              </Text>
              <Pressable style={s.icoonKnop} onPress={deel} accessibilityRole="button" accessibilityLabel={t('gezin.deel')}>
                <Ionicons name="share-social-outline" size={22} color={KLEUR} />
              </Pressable>
            </View>
            {beheerderNaamTekst && <Text style={s.label}>{t('gezin.beheerder', { naam: beheerderNaamTekst })}</Text>}
            {leden.length > 0 && (
              <>
                <Text style={s.label}>{t('gezin.leden')}</Text>
                {leden.map((l) => (
                  <View key={l.id} style={s.rij}>
                    <View style={s.avatar}>
                      <Text style={s.avatarTekst}>{naamVan(l).charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={[s.lid, s.lidNaam]}>{l.ikZelf ? t('gezin.jij', { naam: naamVan(l) }) : naamVan(l)}</Text>
                    {beheerder && !l.ikZelf && (
                      <Pressable
                        style={s.icoonKnop}
                        onPress={() => setBevestig({ actie: 'beheerder', lid: l })}
                        disabled={bezig}
                        accessibilityRole="button"
                        accessibilityLabel={t('gezin.maakBeheerder')}
                      >
                        <Ionicons name="shield-checkmark-outline" size={22} color={KLEUR} />
                      </Pressable>
                    )}
                  </View>
                ))}
              </>
            )}
            {beheerder && !kiesOpvolger && !bevestig && (
              <Pressable onPress={() => setBevestig({ actie: 'heffOp' })} disabled={bezig} style={s.actieKnop} accessibilityRole="button" accessibilityLabel={t('gezin.heffOp')}>
                <Ionicons name="trash-outline" size={22} color={GEVAAR} />
                <Text style={s.verlaatTekst}>{t('gezin.heffOp')}</Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  kop: { fontWeight: '700', fontSize: 15, color: '#333', marginTop: 10 },
  kaart: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e5e5e5', gap: 14 },
  kopRij: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  statusPil: { color: KLEUR, backgroundColor: '#e6f2ea', fontSize: 12, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  statusPilOffline: { color: '#7a5b00', backgroundColor: '#fff4d6' },
  codePaneel: { backgroundColor: '#eef6f1', borderRadius: 12, padding: 12 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e6f2ea', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarTekst: { color: KLEUR, fontWeight: '700' },
  uitleg: { color: '#555' },
  veld: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, minHeight: 44, backgroundColor: '#fafafa' },
  naamVeld: { flex: 1, minWidth: 0, fontSize: 16, color: '#1d2420' },
  veldFout: { borderColor: '#B3261E' },
  codeVeld: { flex: 1, minWidth: 0, letterSpacing: 2, fontWeight: '600', color: '#1d2420' },
  rij: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kiesRij: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  knop: { backgroundColor: ACCENT, borderRadius: 12, padding: 14, alignItems: 'center', minHeight: 50, justifyContent: 'center' },
  knopTekst: { color: '#fff', fontWeight: '700', fontSize: 16 },
  // Icoonknop: vaste vorm, zodat hij nooit wordt afgesneden (WEEK-176).
  icoonKnop: { width: 44, height: 44, borderWidth: 1.5, borderColor: ACCENT, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  knopKlein: { borderWidth: 1.5, borderColor: ACCENT, borderRadius: 10, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  knopKleinTekst: { color: ACCENT, fontWeight: '700' },
  knopGevaar: { backgroundColor: GEVAAR, borderRadius: 10, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  knopGevaarTekst: { color: '#fff', fontWeight: '700' },
  uit: { opacity: 0.6 },
  gedeeld: { fontSize: 18, fontWeight: '700', color: '#1d2420', flexShrink: 1 },
  status: { color: KLEUR, fontSize: 13 },
  statusOffline: { color: '#7a5b00' },
  label: { color: '#5b6661', fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  gezinsUitleg: { borderWidth: 1, borderColor: KLEUR, borderRadius: 10, padding: 12, gap: 10 },
  uitlegTekst: { color: '#1d2420', fontSize: 14, lineHeight: 20 },
  uitlegKnop: { alignSelf: 'flex-start', borderWidth: 1.5, borderColor: KLEUR, borderRadius: 10, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  code: { flex: 1, minWidth: 0, fontSize: 26, fontWeight: '700', letterSpacing: 4, color: '#1f5c3a' },
  lid: { fontSize: 15 },
  lidNaam: { flex: 1, minWidth: 0 },
  // Verlaten en opheffen: volle breedte, icoon + tekst, altijd goed zichtbaar.
  actieKnop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderWidth: 1, borderColor: '#f1c4c4', borderRadius: 10, paddingHorizontal: 12 },
  verlaatTekst: { color: GEVAAR, fontWeight: '600', flexShrink: 1 },
  annuleerKnop: { alignItems: 'center', padding: 8 },
  bevestig: { gap: 10, borderWidth: 1, borderColor: '#f1c4c4', borderRadius: 10, padding: 12 },
  fout: { color: GEVAAR },
});
