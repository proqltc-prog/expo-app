import { ReactNode, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { eenheidVan, IngredientCode } from '@/data/ingredienten';
import { CatalogusItem, zoekDatabank, Sheet } from '@/lib/frigoSheets';
import { leesHoeveelheid } from '@/lib/frigo';
import { heeftExact, LosVoorstel, zoekLos } from '@/lib/losVoorstellen';
import { eenheidNaam } from '@/i18n';
import { useTaal } from '@/ui/taal';

const INKT = '#17201A';

type Props = {
  sheet: Sheet;
  accent: string;
  accentZacht: string;
  /** Staat dit product al op de lijst of in de frigo? Dan krijgt het een vinkje en is het niet opnieuw te kiezen. */
  staatOp: (code: IngredientCode) => boolean;
  /** Een product uit de productdatabank, met de hoeveelheid. De eenheid is vast en komt van het product. */
  onReceptKies: (item: CatalogusItem, hoeveelheid: number | undefined) => void;
  /** Een losse naam (nieuw, of een eerder product als voorstel): de bovenliggende pagina opent de popup om het product in te vullen. */
  onLosPlus: (naam: string, voorstel?: LosVoorstel) => void;
  /** WEEK-288: eerder ingevulde andere producten, als voorstel tijdens het typen. */
  losVoorstellen?: readonly LosVoorstel[];
  /** WEEK-288: staat dit andere product al op de lijst of in huis? Dan een vinkje. */
  losStaatOp?: (naam: string) => boolean;
  /** Extra knop naast het losse-veld (de scanner op de frigo). */
  scanKnop?: ReactNode;
  /** WEEK-235: tekst in het losse-veld; standaard die van de frigo ("wat al in huis is"), de lijst geeft een eigen tekst. */
  losTekst?: string;
  /** WEEK-286: na het openklappen met het zoekicoon staat de cursor meteen in het veld. */
  autoFocus?: boolean;
};

/**
 * Invoer van de boodschappen- of frigo-pagina (WEEK-182): voor Recepten een zoekveld met een keuzelijst
 * uit de productdatabank (enkel de hoeveelheid is in te geven); voor Losse producten een naamveld dat via + de popup opent.
 */
export function ProductInvoer({ sheet, accent, accentZacht, staatOp, onReceptKies, onLosPlus, scanKnop, losTekst, autoFocus, losVoorstellen = [], losStaatOp }: Props) {
  const { t, taal } = useTaal();
  const losLabel = losTekst ?? t('frigo.toevoegen');
  const [zoek, setZoek] = useState('');
  const [gekozen, setGekozen] = useState<CatalogusItem | null>(null);
  const [hoeveelheid, setHoeveelheid] = useState('');
  const [nieuw, setNieuw] = useState('');
  const resultaten = useMemo(() => (sheet === 'planner' && zoek.trim() ? zoekDatabank(zoek, taal) : []), [zoek, sheet, taal]);
  const voorstellen = useMemo(() => (sheet === 'los' ? zoekLos(losVoorstellen, nieuw) : []), [sheet, losVoorstellen, nieuw]);

  if (sheet === 'los') {
    // WEEK-288: zoeken zoals bij het weekmenu; tijdens het typen verschijnen eerder ingevulde producten.
    const tekst = nieuw.trim();
    const kies = (v?: LosVoorstel) => {
      if (!tekst && !v) return;
      onLosPlus(v ? v.naam : tekst, v);
      setNieuw('');
    };
    const exact = voorstellen.find((v) => heeftExact([v], tekst));
    return (
      <View style={s.blok}>
        <View style={s.invoer}>
          <TextInput
            style={[s.veld, s.veldFlex]}
            placeholder={t('frigo.zoekIngredient')}
            value={nieuw}
            onChangeText={setNieuw}
            onSubmitEditing={() => kies(exact)}
            returnKeyType="done"
            autoFocus={autoFocus}
            accessibilityLabel={losLabel}
          />
          {scanKnop}
        </View>
        {tekst ? (
          <ScrollView style={s.lijst} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {voorstellen.map((v) => {
              const erop = losStaatOp?.(v.naam) ?? false;
              const detail = [v.hoeveelheid !== undefined ? String(v.hoeveelheid) : '', v.eenheid ?? ''].filter(Boolean).join(' ');
              return (
                <Pressable
                  key={v.naam}
                  style={[s.rij, s.rijKop]}
                  onPress={() => kies(v)}
                  disabled={erop}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: erop }}
                >
                  <Text style={[s.naam, erop && { color: accent }]}>{`${erop ? '✓ ' : ''}${v.naam}`}</Text>
                  {!!detail && <Text style={s.eenheid}>{detail}</Text>}
                </Pressable>
              );
            })}
            {!exact && (
              <Pressable style={[s.rij, s.rijKop, { borderColor: accent, backgroundColor: accentZacht }]} onPress={() => kies()} accessibilityRole="button">
                <Text style={[s.naam, { color: accent }]}>{t('los.nieuw', { naam: tekst })}</Text>
                <Text style={[s.plusKlein, { color: accent }]}>+</Text>
              </Pressable>
            )}
          </ScrollView>
        ) : null}
      </View>
    );
  }

  const voegToe = () => {
    if (!gekozen) return;
    onReceptKies(gekozen, leesHoeveelheid(hoeveelheid));
    setGekozen(null);
    setHoeveelheid('');
  };

  return (
    <View style={s.blok}>
      <TextInput style={s.veld} placeholder={t('frigo.zoekIngredient')} value={zoek} onChangeText={setZoek} autoFocus={autoFocus} accessibilityLabel={t('frigo.zoekIngredient')} />
      {zoek.trim() ? (
        resultaten.length === 0 ? (
          <Text style={s.leeg}>{t('frigo.geenIngredient')}</Text>
        ) : (
          <ScrollView style={s.lijst} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {resultaten.map((item) => {
              const erop = staatOp(item.code);
              const open = gekozen?.code === item.code;
              return (
                <View key={item.code} style={[s.rij, open && { borderColor: accent, backgroundColor: accentZacht }]}>
                  <Pressable
                    style={s.rijKop}
                    onPress={() => setGekozen(open ? null : item)}
                    disabled={erop}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: erop, expanded: open }}
                  >
                    <Text style={[s.naam, erop && { color: accent }]}>{`${erop ? '✓ ' : ''}${item.naam}`}</Text>
                    <Text style={s.eenheid}>{eenheidNaam(taal, eenheidVan(item.code))}</Text>
                  </Pressable>
                  {open && (
                    <View style={s.hoeveelheidRij}>
                      <TextInput
                        style={[s.veld, s.getal]}
                        placeholder={t('frigo.hoeveelheid')}
                        value={hoeveelheid}
                        onChangeText={setHoeveelheid}
                        keyboardType="decimal-pad"
                        accessibilityLabel={t('frigo.hoeveelheid')}
                      />
                      <Text style={s.eenheid}>{eenheidNaam(taal, eenheidVan(item.code))}</Text>
                      <Pressable style={[s.plus, { backgroundColor: accent }]} onPress={voegToe} accessibilityRole="button" accessibilityLabel={t('frigo.toevoegen')}>
                        <Text style={s.plusTekst}>+</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  blok: { gap: 8, marginTop: 6 },
  invoer: { flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' },
  veld: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, height: 44, backgroundColor: '#fff', color: INKT, minWidth: 0 },
  veldFlex: { flex: 1 },
  getal: { width: 110 },
  plus: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  plusTekst: { color: '#fff', fontSize: 24, fontWeight: '700' },
  plusKlein: { fontSize: 22, fontWeight: '700' },
  leeg: { color: '#666' },
  lijst: { maxHeight: 260, borderRadius: 10 },
  rij: { borderWidth: 1, borderColor: '#E4E8E1', borderRadius: 10, backgroundColor: '#fff', marginBottom: 6, padding: 10, gap: 8 },
  rijKop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  naam: { fontSize: 15, color: INKT, fontWeight: '600', flexShrink: 1 },
  eenheid: { fontSize: 13, color: '#5E6B63' },
  hoeveelheidRij: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
