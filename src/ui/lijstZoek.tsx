import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CatalogusItem, sheetThema, voegLosToe, zoekReceptenbank } from '@/lib/frigoSheets';
import { eigenItem, LijstItem, receptItem, staatOpLijst } from '@/lib/lijst';
import { eenheidVan } from '@/data/ingredienten';
import { leesHoeveelheid } from '@/lib/frigo';
import { wijzigFrigo } from '@/opslag/frigo';
import { useTaal } from '@/ui/taal';

type Sheet = 'recept' | 'los';

/**
 * Zoekfunctie op de boodschappenlijst (WEEK-164), zoals het veld van de frigo.
 * - Sheet Recepten: enkel ingrediënten die de receptenbank kent, met code, eenheid en afdeling.
 * - Sheet Losse producten: vrije invoer zonder koppeling aan de weekplanner. Bij toevoegen gaat het ook
 *   naar het tabblad Losse producten van de frigo.
 */
export function LijstZoek({ lijst, wijzig }: { lijst: LijstItem[]; wijzig: (wijziging: (items: LijstItem[]) => LijstItem[]) => void }) {
  const { t, taal } = useTaal();
  const [sheet, setSheet] = useState<Sheet>('recept');
  const [zoek, setZoek] = useState('');
  const [hoeveelheid, setHoeveelheid] = useState('');
  const [nieuw, setNieuw] = useState('');

  const thema = sheetThema(sheet === 'recept' ? 'planner' : 'los');
  const resultaten = useMemo(() => (sheet === 'recept' && zoek.trim() ? zoekReceptenbank(zoek, taal) : []), [zoek, sheet, taal]);

  const voegReceptToe = (item: CatalogusItem) => {
    const h = leesHoeveelheid(hoeveelheid);
    setHoeveelheid('');
    wijzig((huidig) => receptItem(huidig, { code: item.code, naam: item.naam, afdeling: item.afdeling, eenheid: eenheidVan(item.code) }, new Date(), h));
  };

  const voegLosToeKnop = async () => {
    const nu = new Date();
    const item = eigenItem(nieuw, nu);
    if (!item) return;
    setNieuw('');
    wijzig((huidig) => [...huidig, item]);
    await wijzigFrigo((f) => voegLosToe(f, item.naam, nu));
  };

  const tabs: { sleutel: Sheet; label: string }[] = [
    { sleutel: 'recept', label: t('frigo.sheetPlanner') },
    { sleutel: 'los', label: t('frigo.sheetLos') },
  ];

  return (
    <View style={s.blok}>
      <View style={s.tabs} accessibilityRole="tablist">
        {tabs.map((tab) => {
          const aan = sheet === tab.sleutel;
          const kleur = sheetThema(tab.sleutel === 'recept' ? 'planner' : 'los').accent;
          return (
            <Pressable
              key={tab.sleutel}
              style={[s.tab, aan && { borderColor: kleur, backgroundColor: sheetThema(tab.sleutel === 'recept' ? 'planner' : 'los').accentZacht }]}
              onPress={() => setSheet(tab.sleutel)}
              accessibilityRole="tab"
              accessibilityState={{ selected: aan }}
            >
              <Text style={[s.tabTekst, aan && { color: kleur }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {sheet === 'recept' ? (
        <>
          <TextInput style={s.veld} placeholder={t('frigo.zoekIngredient')} value={zoek} onChangeText={setZoek} accessibilityLabel={t('frigo.zoekIngredient')} />
          {zoek.trim() ? (
            <View>
              <TextInput
                style={s.veld}
                placeholder={t('frigo.hoeveelheid')}
                value={hoeveelheid}
                onChangeText={setHoeveelheid}
                keyboardType="decimal-pad"
                accessibilityLabel={t('frigo.hoeveelheid')}
              />
              {resultaten.length === 0 && <Text style={s.leeg}>{t('frigo.geenIngredient')}</Text>}
              <View style={s.chips}>
                {resultaten.map((item) => {
                  const erop = staatOpLijst(lijst, item.code);
                  return (
                    <Pressable
                      key={item.code}
                      style={[s.chip, erop && { backgroundColor: thema.accentZacht, borderColor: thema.accent }]}
                      onPress={() => voegReceptToe(item)}
                      disabled={erop}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: erop }}
                    >
                      <Text style={[s.chipTekst, erop && { color: thema.accent }]}>{`${erop ? '✓ ' : ''}${item.naam} · ${eenheidVan(item.code)}`}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </>
      ) : (
        <View style={s.invoer}>
          <TextInput
            style={[s.veld, s.veldFlex]}
            placeholder={t('lijst.toevoegen')}
            value={nieuw}
            onChangeText={setNieuw}
            onSubmitEditing={voegLosToeKnop}
            returnKeyType="done"
            accessibilityLabel={t('lijst.toevoegen')}
          />
          <Pressable style={[s.knop, { backgroundColor: thema.accent }]} onPress={voegLosToeKnop} accessibilityRole="button" accessibilityLabel={t('lijst.toevoegen')}>
            <Text style={s.knopTekst}>+</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  blok: { marginTop: 10, gap: 8 },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12, paddingVertical: 8, alignItems: 'center' },
  tabTekst: { fontWeight: '700', color: '#5E6B63' },
  veld: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, height: 44, backgroundColor: '#fff', marginTop: 4 },
  veldFlex: { flex: 1 },
  invoer: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  knop: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  knopTekst: { color: '#fff', fontSize: 22, fontWeight: '700' },
  leeg: { color: '#666', marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff' },
  chipTekst: { fontSize: 14, color: '#17201A' },
});
