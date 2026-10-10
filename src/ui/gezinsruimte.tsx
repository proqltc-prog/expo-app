// Blok "Gezinsruimte" op het tabblad Gezin (WEEK-8): een gezinsruimte maken, lid worden met een code,
// de code delen, de leden zien en de gezinsruimte verlaten.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { leesGezinFout, leesGezinscode, toonGezinscode } from '@/lib/sync';
import { gezinsruimteBeschikbaar } from '@/opslag/supabase';
import {
  bijWijziging,
  Gezin,
  GezinsLid,
  laadGezin,
  laadLeden,
  maakGezin,
  syncStatus,
  SyncStatus,
  verlaatGezin,
  wordLid,
} from '@/opslag/sync';
import { Sleutel } from '@/i18n';
import { useTaal } from '@/ui/taal';

const KLEUR = '#2e7d4f';

export function GezinsRuimte() {
  const { t } = useTaal();
  const [gezin, setGezin] = useState<Gezin | null | undefined>(undefined);
  const [leden, setLeden] = useState<GezinsLid[]>([]);
  const [status, setStatus] = useState<SyncStatus>(syncStatus());
  const [naam, setNaam] = useState('');
  const [gezinsnaam, setGezinsnaam] = useState('');
  const [code, setCode] = useState('');
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  const vernieuw = useCallback(async () => {
    const g = await laadGezin();
    setGezin(g);
    setLeden(g ? await laadLeden().catch(() => []) : []);
  }, []);

  useEffect(() => {
    vernieuw();
    const stop = [
      bijWijziging('gezin', vernieuw),
      bijWijziging('leden', vernieuw),
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
    }
  };

  const maak = () => voerUit(() => maakGezin(gezinsnaam, naam));

  const sluitAan = () => {
    const gelezen = leesGezinscode(code);
    if (!gelezen) {
      setFout(t('gezin.fout.code'));
      return;
    }
    voerUit(() => wordLid(gelezen, naam));
  };

  const deel = () => gezin && Share.share({ message: t('gezin.deelTekst', { code: toonGezinscode(gezin.code) }) });

  const verlaat = () =>
    Alert.alert(t('gezin.verlaat'), t('gezin.verlaatVraag'), [
      { text: t('gezin.annuleren'), style: 'cancel' },
      { text: t('gezin.verlaat'), style: 'destructive', onPress: () => voerUit(verlaatGezin) },
    ]);

  return (
    <>
      <Text style={s.kop}>{t('gezin.titel')}</Text>
      <View style={s.kaart}>
        {!gezin ? (
          <>
            <Text style={s.uitleg}>{t('gezin.uitleg')}</Text>
            <TextInput style={s.veld} value={naam} onChangeText={setNaam} placeholder={t('gezin.jouwNaam')} maxLength={40} />
            <TextInput style={s.veld} value={gezinsnaam} onChangeText={setGezinsnaam} placeholder={t('gezin.gezinsnaam')} maxLength={60} />
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
            <Text style={s.label}>{t('gezin.code')}</Text>
            <View style={s.rij}>
              <Text style={s.code} selectable>{toonGezinscode(gezin.code)}</Text>
              <Pressable style={s.knopKlein} onPress={deel}>
                <Text style={s.knopKleinTekst}>{t('gezin.deel')}</Text>
              </Pressable>
            </View>
            {leden.length > 0 && (
              <>
                <Text style={s.label}>{t('gezin.leden')}</Text>
                {leden.map((l) => {
                  const naamLid = l.naam || t('gezin.naamloos');
                  return <Text key={l.id} style={s.lid}>• {l.ikZelf ? t('gezin.jij', { naam: naamLid }) : naamLid}</Text>;
                })}
              </>
            )}
            <Pressable onPress={verlaat} disabled={bezig} style={s.verlaat}>
              {bezig ? <ActivityIndicator color="#c62828" /> : <Text style={s.verlaatTekst}>{t('gezin.verlaat')}</Text>}
            </Pressable>
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
  codeVeld: { flex: 1, letterSpacing: 2, fontWeight: '600' },
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
  code: { flex: 1, fontSize: 26, fontWeight: '700', letterSpacing: 4, color: '#1f5c3a' },
  lid: { fontSize: 15 },
  verlaat: { alignItems: 'center', padding: 8 },
  verlaatTekst: { color: '#c62828', fontWeight: '600' },
  fout: { color: '#c62828' },
});
