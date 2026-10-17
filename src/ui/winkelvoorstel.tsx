// Winkelvoorstel bovenaan de boodschappenpagina (WEEK-57, WEEK-58).
// Het netwerk wordt enkel gebruikt na een tik van de gebruiker en bij een andere locatie of straal.
// Bij elke wijziging van de lijst wordt het voorstel lokaal opnieuw berekend.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LijstItem } from '@/lib/lijst';
import { kiesWinkels, nodigeSoorten, Positie, Voorstel } from '@/lib/winkelvoorstel';
import type { Winkel } from '@/lib/winkels';
import { laadProfiel } from '@/opslag/profiel';
import { vraagPositie } from '@/opslag/locatie';
import { zoekWinkels, zoekWinkelsRond } from '@/opslag/winkels';
import { Sleutel } from '@/i18n';
import { useTaal } from '@/ui/taal';

const KLEUR = '#2e7d4f';
const STRAAL_STANDAARD_KM = 15;

type Stat = 'verborgen' | 'laden' | 'klaar' | 'fout' | 'geenAdres';

/** Afstand als "350 m" of "2,3 km". */
function afstandTekst(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`;
}

export function WinkelVoorstel({ items }: { items: LijstItem[] }) {
  const { t } = useTaal();
  const [stat, setStat] = useState<Stat>('verborgen');
  const [positie, setPositie] = useState<Positie | undefined>();
  const [maxKm, setMaxKm] = useState<number | undefined>();
  const [adres, setAdres] = useState({ postcode: '', gemeente: '' });
  const [winkels, setWinkels] = useState<Winkel[]>([]);
  const [verzoek, setVerzoek] = useState(0);
  const cache = useRef(new Map<string, Winkel[]>());

  // Welke winkeltypes de openstaande lijst nodig heeft; hier geen netwerk, enkel rekenen.
  const nodig = useMemo(() => nodigeSoorten(items.filter((i) => !i.afgevinkt).map((i) => i.afdeling)), [items]);

  useEffect(() => {
    laadProfiel().then((p) => {
      setMaxKm(p.maxKm);
      setAdres({ postcode: p.adres.postcode, gemeente: p.adres.gemeente });
    });
  }, []);

  // Pas na een tik van de gebruiker: eerst de locatie, daarna het voorstel.
  const toon = async () => {
    setStat('laden');
    const p = await vraagPositie();
    if (!p && !adres.postcode.trim()) {
      setStat('geenAdres');
      return;
    }
    setPositie(p);
    setVerzoek((v) => v + 1);
  };

  // Ophalen alleen bij een nieuwe locatie, straal of postcode; anders uit de cache.
  useEffect(() => {
    if (verzoek === 0) return;
    let geldig = true;
    const straal = maxKm ?? STRAAL_STANDAARD_KM;
    const sleutel = positie
      ? `rond|${positie.lat.toFixed(3)}|${positie.lon.toFixed(3)}|${straal}`
      : `pc|${adres.postcode.trim()}|${adres.gemeente.trim()}`;
    const bekend = cache.current.get(sleutel);
    if (bekend) {
      setWinkels(bekend);
      setStat('klaar');
      return;
    }
    setStat('laden');
    const haal = positie
      ? zoekWinkelsRond(positie.lat, positie.lon, straal * 1000)
      : zoekWinkels(adres.postcode, adres.gemeente);
    haal
      .then((gevonden) => {
        if (!geldig) return;
        cache.current.set(sleutel, gevonden);
        setWinkels(gevonden);
        setStat('klaar');
      })
      .catch(() => {
        if (geldig) setStat('fout');
      });
    return () => {
      geldig = false;
    };
  }, [verzoek, positie, maxKm, adres.postcode, adres.gemeente]);

  // Het voorstel wordt elke keer opnieuw berekend als de lijst verandert.
  const voorstel: Voorstel = useMemo(() => kiesWinkels(nodig, winkels, positie, maxKm), [nodig, winkels, positie, maxKm]);

  if (!nodig.length) return null;

  if (stat === 'verborgen') {
    return (
      <View style={s.kaart}>
        <Text style={s.kop}>{t('winkels.voorstelTitel')}</Text>
        <Text style={s.uitleg}>{t('winkels.locatieUitleg')}</Text>
        <Pressable style={s.knop} onPress={toon} accessibilityRole="button">
          <Text style={s.knopTekst}>{t('winkels.toon')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.kaart}>
      <Text style={s.kop}>{t('winkels.voorstelTitel')}</Text>
      {stat === 'laden' && <ActivityIndicator color={KLEUR} />}
      {stat === 'geenAdres' && <Text style={s.fout}>{t('winkels.geenPostcode')}</Text>}
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
  knop: { backgroundColor: KLEUR, borderRadius: 10, padding: 12, alignItems: 'center' },
  knopTekst: { color: '#fff', fontWeight: '700' },
});
