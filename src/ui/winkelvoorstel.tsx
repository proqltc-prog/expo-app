// De winkelsuggestie op de boodschappenlijst (WEEK-53, WEEK-175). Er is geen eigen winkeldatabank meer:
// per winkeltype dat de lijst nodig heeft, opent een knop Google Maps bij de postcode uit het profiel.
import { useCallback, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { LijstItem } from '@/lib/lijst';
import { nodigeSoorten } from '@/lib/winkelvoorstel';
import { googleZoekUrl, SOORT_EMOJI } from '@/lib/winkelweergave';
import { laadProfiel } from '@/opslag/profiel';
import { Sleutel } from '@/i18n';
import { useTaal } from '@/ui/taal';

const KLEUR = '#A9472A';

export function WinkelVoorstel({ items }: { items: LijstItem[] }) {
  const { t } = useTaal();
  const [adres, setAdres] = useState({ postcode: '', gemeente: '' });
  const [open, setOpen] = useState(false);

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

  // Welke winkeltypes de openstaande lijst nodig heeft.
  const nodig = useMemo(() => nodigeSoorten(items.filter((i) => !i.afgevinkt).map((i) => i.afdeling)), [items]);

  if (!nodig.length) return null;

  const pc = adres.postcode.trim();

  return (
    <View style={s.kaart}>
      <Pressable style={s.kopRij} onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <View style={s.kopTekst}>
          <Text style={s.kop}>{t('winkels.voorstelTitel')}</Text>
          <Text style={s.samenvatting}>{pc ? t('winkels.zoekGoogleKort') : t('winkels.geenPostcode')}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={22} color={KLEUR} />
      </Pressable>

      {open && pc ? (
        <View style={s.lijst}>
          {nodig.map((soort) => (
            <Pressable
              key={soort}
              style={s.zoekRij}
              onPress={() => Linking.openURL(googleZoekUrl(soort, pc, adres.gemeente))}
              accessibilityRole="link"
              accessibilityLabel={`${t('winkels.zoekGoogle')}: ${t(`winkels.soort.${soort}` as Sleutel)}`}
            >
              <Text style={s.emoji}>{SOORT_EMOJI[soort]}</Text>
              <Text style={s.zoekTekst}>{t(`winkels.soort.${soort}` as Sleutel)}</Text>
              <Ionicons name="map-outline" size={20} color={KLEUR} />
            </Pressable>
          ))}
          <Text style={s.uitleg}>{t('winkels.googleUitleg')}</Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  kaart: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e5e5e5', gap: 10, marginHorizontal: 16, marginBottom: 12 },
  kopRij: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kopTekst: { flex: 1, minWidth: 0, gap: 2 },
  kop: { fontWeight: '700', fontSize: 15, color: '#333' },
  samenvatting: { color: '#777', fontSize: 13 },
  lijst: { gap: 8 },
  zoekRij: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fafcfa', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#e8f1eb' },
  emoji: { fontSize: 22 },
  zoekTekst: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: '600', color: '#222' },
  uitleg: { color: '#666', fontSize: 12 },
});
