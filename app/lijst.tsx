import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LijstItem, LijstRegel, LijstSectie, samenvoegen, secties as maakSecties, vinkAf, Weergave } from '@/lib/lijst';
import { bewaarLijst, bewaarWeergave, laadLijst, laadWeergave } from '@/opslag/lijst';
import { pasFrigoAan } from '@/lib/frigo';
import { wijzigFrigo } from '@/opslag/frigo';
import { categorieNaam, dagSleutel, hoeveelheidTekst, Sleutel } from '@/i18n';
import { useTaal } from '@/ui/taal';

const KLEUR = '#2e7d4f';

export default function Lijst() {
  const { t, taal } = useTaal();
  const [items, setItems] = useState<LijstItem[]>([]);
  const [nieuw, setNieuw] = useState('');
  const [weergave, setWeergave] = useState<Weergave>('recept');

  useEffect(() => {
    laadWeergave().then(setWeergave);
  }, []);

  useFocusEffect(
    useCallback(() => {
      laadLijst().then(setItems);
    }, [])
  );

  const wijzig = (volgende: LijstItem[]) => {
    setItems(volgende);
    bewaarLijst(volgende);
  };

  const kiesWeergave = (w: Weergave) => {
    setWeergave(w);
    bewaarWeergave(w);
  };

  // Een regel kan uit meerdere items bestaan; afvinken geldt voor alle onderliggende items.
  // Afvinken = gekocht: het product gaat in de frigo; het vinkje weghalen haalt het er weer uit (WEEK-18).
  const toggle = (regel: LijstRegel) => {
    const afgevinkt = !regel.afgevinkt;
    const onderliggend = items.filter((i) => regel.ids.includes(i.id));
    wijzig(vinkAf(items, regel.ids, afgevinkt));
    wijzigFrigo((f) => pasFrigoAan(f, onderliggend, afgevinkt, new Date()));
  };

  const voegToe = () => {
    const naam = nieuw.trim();
    if (!naam) return;
    wijzig([...items, { id: `extra-${Date.now()}`, naam, categorie: 'extra', afgevinkt: false }]);
    setNieuw('');
  };

  const titel = (sectie: LijstSectie) => {
    if (sectie.soort === 'recept') return t('lijst.receptTitel', { dag: t(dagSleutel(sectie.dag)), recept: sectie.recept });
    if (sectie.soort === 'afdeling') return t(`afdeling.${sectie.afdeling}` as Sleutel);
    return categorieNaam(taal, sectie.categorie);
  };

  const data = useMemo(
    () => maakSecties(items, weergave).map((sectie) => ({ ...sectie, title: titel(sectie), data: sectie.regels })),
    // titel() gebruikt de taal; daarom staat taal in de afhankelijkheden
    [items, weergave, taal]
  );

  // De teller telt wat er in de winkel te kopen valt: alles samengeteld over recepten heen.
  const alleRegels = useMemo(() => samenvoegen(items, { overCategorieen: true }), [items]);
  const open = alleRegels.filter((r) => !r.afgevinkt).length;

  return (
    <View style={s.scherm}>
      <View style={s.invoer}>
        <TextInput
          style={s.veld}
          placeholder={t('lijst.toevoegen')}
          value={nieuw}
          onChangeText={setNieuw}
          onSubmitEditing={voegToe}
          returnKeyType="done"
        />
        <Pressable style={s.plus} onPress={voegToe}>
          <Text style={s.plusTekst}>+</Text>
        </Pressable>
      </View>

      <View style={s.schakelaar} accessibilityRole="tablist">
        {(['recept', 'categorie'] as Weergave[]).map((w) => {
          const aan = weergave === w;
          return (
            <Pressable
              key={w}
              style={[s.optie, aan && s.optieAan]}
              onPress={() => kiesWeergave(w)}
              accessibilityRole="tab"
              accessibilityState={{ selected: aan }}
            >
              <Text style={[s.optieTekst, aan && s.optieTekstAan]}>
                {t(w === 'recept' ? 'lijst.perRecept' : 'lijst.perCategorie')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={s.teller}>
        {alleRegels.length ? t('lijst.teller', { open, totaal: alleRegels.length }) : t('lijst.leeg')}
      </Text>
      <SectionList
        sections={data}
        keyExtractor={(r, i) => `${r.sleutel}-${i}`}
        renderSectionHeader={({ section }) => <Text style={s.kop}>{section.title}</Text>}
        renderItem={({ item }) => (
          <Pressable style={s.item} onPress={() => toggle(item)}>
            <View style={[s.vinkje, item.afgevinkt && s.vinkjeAan]}>
              {item.afgevinkt && <Text style={s.vinkjeTekst}>✓</Text>}
            </View>
            <View style={s.tekstBlok}>
              <Text style={[s.naam, item.afgevinkt && s.doorgehaald]}>{item.naam}</Text>
              {weergave === 'categorie' && item.recepten.length > 0 && (
                <Text style={s.recepten} numberOfLines={1}>{item.recepten.join(' · ')}</Text>
              )}
            </View>
            {item.hoeveelheid ? (
              <Text style={[s.hoeveelheid, item.afgevinkt && s.doorgehaald]}>
                {hoeveelheidTekst(taal, item.hoeveelheid, item.eenheid)}
              </Text>
            ) : null}
          </Pressable>
        )}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      />
      {items.some((i) => i.afgevinkt) && (
        <Pressable style={s.wis} onPress={() => wijzig(items.filter((i) => !i.afgevinkt))}>
          <Text style={{ color: KLEUR, fontWeight: '600' }}>{t('lijst.wissen')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  scherm: { flex: 1, paddingHorizontal: 16 },
  invoer: { flexDirection: 'row', gap: 8, marginTop: 12 },
  veld: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, height: 44, backgroundColor: '#fff' },
  plus: { width: 44, height: 44, borderRadius: 10, backgroundColor: KLEUR, alignItems: 'center', justifyContent: 'center' },
  plusTekst: { color: '#fff', fontSize: 24, fontWeight: '700' },
  schakelaar: { flexDirection: 'row', marginTop: 12, borderWidth: 1.5, borderColor: KLEUR, borderRadius: 10, overflow: 'hidden' },
  optie: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  optieAan: { backgroundColor: KLEUR },
  optieTekst: { color: KLEUR, fontWeight: '600' },
  optieTekstAan: { color: '#fff' },
  teller: { color: '#666', marginVertical: 10 },
  kop: { fontWeight: '700', fontSize: 14, color: '#444', marginTop: 14, marginBottom: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  vinkje: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: KLEUR, alignItems: 'center', justifyContent: 'center' },
  vinkjeAan: { backgroundColor: KLEUR },
  vinkjeTekst: { color: '#fff', fontWeight: '700' },
  tekstBlok: { flex: 1 },
  naam: { fontSize: 16 },
  recepten: { fontSize: 12, color: '#999', marginTop: 2 },
  hoeveelheid: { fontSize: 14, color: '#777' },
  doorgehaald: { textDecorationLine: 'line-through', color: '#aaa' },
  wis: { alignItems: 'center', padding: 12 },
});
