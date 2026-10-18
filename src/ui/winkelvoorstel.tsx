// Winkelvoorstel bovenaan de boodschappenpagina (WEEK-57, WEEK-60).
// Het voorstel komt uit de postcode in het profiel. Het netwerk wordt gebruikt bij een andere postcode;
// bij elke wijziging van de lijst wordt het voorstel lokaal opnieuw berekend.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LijstItem } from '@/lib/lijst';
import { kiesWinkels, nodigeSoorten, Positie, Voorstel } from '@/lib/winkelvoorstel';
import type { Winkel } from '@/lib/winkels';
import { laadProfiel } from '@/opslag/profiel';
import { zoekPostcodePunt, zoekWinkels } from '@/opslag/winkels';
import { Sleutel } from '@/i18n';
import { useTaal } from '@/ui/taal';

const KLEUR = '#2e7d4f';

type Stat = 'laden' | 'klaar' | 'fout' | 'geenPostcode';
type Adres = { postcode: string; gemeente: string };
type Opgehaald = { positie: Positie; winkels: Winkel[] };

/** Afstand als "350 m" of "2,3 km". */
function afstandTekst(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`;
}

export function WinkelVoorstel({ items }: { items: LijstItem[] }) {
  const { t } = useTaal();
  const [stat, setStat] = useState<Stat>('laden');
  const [adres, setAdres] = useState<Adres>({ postcode: '', gemeente: '' });
  const [opgehaald, setOpgehaald] = useState<Opgehaald | undefined>();
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
      const positie = await zoekPostcodePunt(pc, gem);
      if (!geldig) return;
      if (!positie) {
        setStat('geenPostcode');
        return;
      }
      const winkels = await zoekWinkels(pc, gem);
      if (!geldig) return;
      const resultaat = { positie, winkels };
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

  return (
    <View style={s.kaart}>
      <Text style={s.kop}>{t('winkels.voorstelTitel')}</Text>
      {stat === 'laden' && <ActivityIndicator color={KLEUR} />}
      {stat === 'geenPostcode' && <Text style={s.fout}>{t('winkels.geenPostcode')}</Text>}
      {stat === 'fout' && <Text style={s.fout}>{t('winkels.fout')}</Text>}
      {stat === 'klaar' && voorstel.stops.length === 0 && <Text style={s.uitleg}>{t('winkels.leeg')}</Text>}
      {stat === 'klaar' &&
        voorstel.stops.map((stop) => (
          <Text key={stop.soort} style={s.regel}>
            <Text style={s.vet}>{t(`winkels.soort.${stop.soort}` as Sleutel)}: </Text>
            {stop.winkel.naam}
            {stop.afstandKm !== undefined ? ` · ${afstandTekst(stop.afstandKm)}` : ''}
          </Text>
        ))}
      {stat === 'klaar' && voorstel.nietGedekt.length > 0 && (
        <Text style={s.uitleg}>
          {t('winkels.nietGedekt', { soorten: voorstel.nietGedekt.map((n) => t(`winkels.soort.${n}` as Sleutel)).join(', ') })}
        </Text>
      )}
      {stat === 'klaar' && <Text style={s.bron}>{t('winkels.bron')}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  kaart: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e5e5', gap: 8, marginHorizontal: 16, marginBottom: 12 },
  kop: { fontWeight: '700', fontSize: 15, color: '#333' },
  uitleg: { color: '#666', fontSize: 13 },
  regel: { fontSize: 15 },
  vet: { fontWeight: '700' },
  bron: { color: '#999', fontSize: 11 },
  fout: { color: '#c62828' },
});
