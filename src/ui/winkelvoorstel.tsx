// Winkelvoorstel bovenaan de boodschappenpagina (WEEK-57, WEEK-60, WEEK-70).
// Het voorstel komt uit de postcode in het profiel. Het netwerk wordt gebruikt bij een andere postcode;
// bij elke wijziging van de lijst wordt het voorstel lokaal opnieuw berekend.
// WEEK-70: standaard ingeklapt. Per winkel een kaartje met adres, uren en een Google Maps-link.
// Het 📍-icoontje opent dezelfde winkels in een popup.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LijstItem } from '@/lib/lijst';
import { kiesWinkels, nodigeSoorten, Positie, Stop, Voorstel } from '@/lib/winkelvoorstel';
import type { Winkel } from '@/lib/winkels';
import { adresRegel, googleMapsUrl, openingsurenRegels, SOORT_EMOJI } from '@/lib/winkelweergave';
import { laadProfiel } from '@/opslag/profiel';
import { zoekPostcodePunt, zoekWinkels } from '@/opslag/winkels';
import { Sleutel } from '@/i18n';
import { useTaal } from '@/ui/taal';

const KLEUR = '#2e7d4f';

type Stat = 'laden' | 'klaar' | 'fout' | 'geenPostcode';
type Adres = { postcode: string; gemeente: string };
// WEEK-112: het punt van de postcode is optioneel; zonder punt zijn de winkels toch te tonen (zonder afstand).
type Opgehaald = { positie?: Positie; winkels: Winkel[] };

/** Afstand als "350 m" of "2,3 km". */
function afstandTekst(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`;
}

/** Eén winkel als kaartje: soort, naam, adres, afstand, openingsuren en een link naar Google Maps. */
function WinkelKaart({ stop }: { stop: Stop }) {
  const { t } = useTaal();
  const winkel = stop.winkel;
  const adres = adresRegel(winkel);
  const uren = openingsurenRegels(winkel.openingsuren);

  const openKaart = () => {
    Linking.openURL(googleMapsUrl(winkel)).catch(() => {
      // Geen browser of kaart beschikbaar: er gebeurt dan niets.
    });
  };

  return (
    <View style={s.winkel}>
      <View style={s.soortBol}>
        <Text style={s.soortEmoji}>{SOORT_EMOJI[stop.soort]}</Text>
      </View>
      <View style={s.winkelTekst}>
        <Text style={s.soortLabel}>{t(`winkels.soort.${stop.soort}` as Sleutel)}</Text>
        <Text style={s.naam}>{winkel.naam}</Text>
        {adres ? <Text style={s.adres}>{adres}</Text> : null}
        {stop.afstandKm !== undefined ? <Text style={s.afstand}>{afstandTekst(stop.afstandKm)}</Text> : null}
        <View style={s.uren}>
          <Text style={s.urenKop}>{t('winkels.uren')}</Text>
          {uren.length ? (
            uren.map((regel) => (
              <Text key={regel} style={s.urenRegel}>
                {regel}
              </Text>
            ))
          ) : (
            <Text style={s.urenLeeg}>{t('winkels.geenUren')}</Text>
          )}
        </View>
        <Pressable style={s.kaartKnop} onPress={openKaart} accessibilityRole="link">
          <Text style={s.kaartKnopTekst}>{t('winkels.openMaps')} ↗</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function WinkelVoorstel({ items }: { items: LijstItem[] }) {
  const { t } = useTaal();
  const [stat, setStat] = useState<Stat>('laden');
  const [adres, setAdres] = useState<Adres>({ postcode: '', gemeente: '' });
  const [opgehaald, setOpgehaald] = useState<Opgehaald | undefined>();
  const [open, setOpen] = useState(false);
  const [popup, setPopup] = useState(false);
  const cache = useRef(new Map<string, Opgehaald>());

  // Het profiel wordt opnieuw gelezen als de gebruiker terugkomt op de lijst (postcode kan gewijzigd zijn).
  useFocusEffect(
    useCallback(() => {
      let actief = true;
      laadProfiel().then((p) => {
        if (actief) setAdres({ postcode: p.adres.postcode, gemeente: p.adres.gemeente });
      });
      return () => {
        actief = false;
      };
    }, []),
  );

  // Welke winkeltypes de openstaande lijst nodig heeft; enkel rekenen, geen netwerk.
  const nodig = useMemo(() => nodigeSoorten(items.filter((i) => !i.afgevinkt).map((i) => i.afdeling)), [items]);

  // Ophalen alleen bij een andere postcode; anders uit de cache.
  useEffect(() => {
    const pc = adres.postcode.trim();
    const gem = adres.gemeente.trim();
    if (!pc) {
      setStat('geenPostcode');
      setOpgehaald(undefined);
      return;
    }
    const sleutel = `${pc}|${gem}`;
    const bekend = cache.current.get(sleutel);
    if (bekend) {
      setOpgehaald(bekend);
      setStat('klaar');
      return;
    }
    let geldig = true;
    setStat('laden');
    (async () => {
      // Een mislukt of leeg postcodepunt mag de winkelzoeker niet stoppen (WEEK-112): dan zonder afstand.
      const positie = await zoekPostcodePunt(pc, gem).catch(() => undefined);
      if (!geldig) return;
      const winkels = await zoekWinkels(pc, gem);
      if (!geldig) return;
      const resultaat: Opgehaald = { positie, winkels };
      cache.current.set(sleutel, resultaat);
      setOpgehaald(resultaat);
      setStat('klaar');
    })().catch(() => {
      if (geldig) setStat('fout');
    });
    return () => {
      geldig = false;
    };
  }, [adres.postcode, adres.gemeente]);

  // Elke wijziging van de lijst (ook na een recept) rekent het voorstel opnieuw uit.
  const voorstel: Voorstel = useMemo(
    () => kiesWinkels(nodig, opgehaald?.winkels ?? [], opgehaald?.positie),
    [nodig, opgehaald],
  );

  if (!nodig.length) return null;

  const aantal = voorstel.stops.length;
  const samenvatting =
    stat === 'laden'
      ? t('winkels.laden')
      : stat === 'geenPostcode'
        ? t('winkels.geenPostcode')
        : stat === 'fout'
          ? t('winkels.fout')
          : aantal === 0
            ? t('winkels.leeg')
            : t('winkels.samenvatting', { n: aantal });

  return (
    <View style={s.kaart}>
      <View style={s.kopRij}>
        <Pressable
          style={s.kopTekst}
          onPress={() => setOpen((o) => !o)}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
        >
          <Text style={s.kop}>{t('winkels.voorstelTitel')}</Text>
          <Text style={s.samenvatting}>{samenvatting}</Text>
        </Pressable>
        {stat === 'klaar' && aantal > 0 && (
          <Pressable style={s.popupKnop} onPress={() => setPopup(true)} accessibilityRole="button" accessibilityLabel={t('winkels.toonWinkels')}>
            <Text style={s.popupKnopTekst}>📍</Text>
          </Pressable>
        )}
        <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityLabel={t('winkels.voorstelTitel')}>
          <Text style={s.chevron}>{open ? '▴' : '▾'}</Text>
        </Pressable>
      </View>

      {stat === 'laden' && <ActivityIndicator color={KLEUR} />}

      {open && stat === 'klaar' && (
        <View style={s.lijst}>
          {voorstel.stops.map((stop) => (
            <WinkelKaart key={stop.soort} stop={stop} />
          ))}
          {voorstel.nietGedekt.length > 0 && (
            <Text style={s.uitleg}>
              {t('winkels.nietGedekt', { soorten: voorstel.nietGedekt.map((n) => t(`winkels.soort.${n}` as Sleutel)).join(', ') })}
            </Text>
          )}
          <Text style={s.bron}>{t('winkels.bron')}</Text>
        </View>
      )}

      <Modal visible={popup} transparent animationType="slide" onRequestClose={() => setPopup(false)}>
        <Pressable style={s.overlay} onPress={() => setPopup(false)} accessibilityLabel={t('winkels.sluiten')} />
        <View style={s.sheet}>
          <View style={s.sheetGreep} />
          <Text style={s.sheetKop}>{t('winkels.voorstelTitel')}</Text>
          <ScrollView contentContainerStyle={s.lijst}>
            {voorstel.stops.map((stop) => (
              <WinkelKaart key={stop.soort} stop={stop} />
            ))}
          </ScrollView>
          <Pressable style={s.sluitKnop} onPress={() => setPopup(false)} accessibilityRole="button">
            <Text style={s.sluitTekst}>{t('winkels.sluiten')}</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  kaart: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e5e5e5', gap: 10, marginHorizontal: 16, marginBottom: 12 },
  kopRij: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kopTekst: { flex: 1, gap: 2 },
  kop: { fontWeight: '700', fontSize: 15, color: '#333' },
  samenvatting: { color: '#777', fontSize: 13 },
  chevron: { color: KLEUR, fontSize: 18, paddingHorizontal: 4 },
  popupKnop: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eef6f1', alignItems: 'center', justifyContent: 'center' },
  popupKnopTekst: { fontSize: 18 },
  lijst: { gap: 10 },
  uitleg: { color: '#666', fontSize: 13 },
  fout: { color: '#c62828' },
  bron: { color: '#999', fontSize: 11 },
  winkel: { flexDirection: 'row', gap: 12, backgroundColor: '#fafcfa', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#e8f1eb' },
  soortBol: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#eef6f1', alignItems: 'center', justifyContent: 'center' },
  soortEmoji: { fontSize: 22 },
  winkelTekst: { flex: 1, gap: 3 },
  soortLabel: { color: KLEUR, fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  naam: { fontSize: 16, fontWeight: '700', color: '#222' },
  adres: { color: '#555', fontSize: 14 },
  afstand: { color: '#777', fontSize: 13 },
  uren: { gap: 2, marginTop: 4 },
  urenKop: { color: '#333', fontWeight: '600', fontSize: 13 },
  urenRegel: { color: '#555', fontSize: 13 },
  urenLeeg: { color: '#999', fontSize: 13, fontStyle: 'italic' },
  kaartKnop: { alignSelf: 'flex-start', marginTop: 6, backgroundColor: KLEUR, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  kaartKnopTekst: { color: '#fff', fontWeight: '700', fontSize: 13 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 30, maxHeight: '80%', gap: 12 },
  sheetGreep: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd' },
  sheetKop: { fontWeight: '800', fontSize: 18, color: '#222' },
  sluitKnop: { backgroundColor: '#f1f1f1', borderRadius: 12, padding: 14, alignItems: 'center' },
  sluitTekst: { color: '#333', fontWeight: '700' },
});
