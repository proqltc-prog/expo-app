import { ReactNode, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { eenheidVan, IngredientCode } from '@/data/ingredienten';
import { CatalogusItem, zoekReceptenbank, Sheet } from '@/lib/frigoSheets';
import { leesHoeveelheid } from '@/lib/frigo';
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
  /** Een losse naam met de +: de bovenliggende pagina opent de popup om het product in te vullen. */
  onLosPlus: (naam: string) => void;
  /** Extra knop naast het losse-veld (de scanner op de frigo). */
  scanKnop?: ReactNode;
};

/**
 * Invoer van de boodschappen- of frigo-pagina (WEEK-182): voor Recepten een zoekveld met een keuzelijst
 * uit de productdatabank (enkel de hoeveelheid is in te geven); voor Losse producten een naamveld dat via + de popup opent.
 */
export function ProductInvoer({ sheet, accent, accentZacht, staatOp, onReceptKies, onLosPlus, scanKnop }: Props) {
  const { t, taal } = useTaal();
  const [zoek, setZoek] = useState('');
  const [gekozen, setGekozen] = useState<CatalogusItem | null>(null);
  const [hoeveelheid, setHoeveelheid] = useState('');
  const [nieuw, setNieuw] = useState('');
  const resultaten = useMemo(() => (sheet === 'planner' && zoek.trim() ? zoekReceptenbank(zoek, taal) : []), [zoek, sheet, taal]);

  if (sheet === 'los') {
    return (
      <View style={s.invoer}>
        <TextInput
          style={[s.veld, s.veldFlex]}
          placeholder={t('frigo.toevoegen')}
          value={nieuw}
          onChangeText={setNieuw}
          onSubmitEditing={() => {
            if (nieuw.trim()) onLosPlus(nieuw.trim());
            setNieuw('');
          }}
          returnKeyType="done"
          accessibilityLabel={t('frigo.toevoegen')}
        />
        <Pressable
          style={[s.plus, { backgroundColor: accent }]}
          onPress={() => {
            if (nieuw.trim()) onLosPlus(nieuw.trim());
            setNieuw('');
          }}
          accessibilityRole="button"
          accessibilityLabel={t('frigo.toevoegen')}
        >
          <Text style={s.plusTekst}>+</Text>
        </Pressable>
        {scanKnop}
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
      <TextInput style={s.veld} placeholder={t('frigo.zoekIngredient')} value={zoek} onChangeText={setZoek} accessibilityLabel={t('frigo.zoekIngredient')} />
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
                    <Text style={s.eenheid}>{eenheidVan(item.code)}</Text>
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
                      <Text style={s.eenheid}>{eenheidVan(item.code)}</Text>
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
  blok: { gap: 8, marginTop: 10 },
  invoer: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' },
  veld: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, height: 44, backgroundColor: '#fff', color: INKT, minWidth: 0 },
  veldFlex: { flex: 1 },
  getal: { width: 110 },
  plus: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  plusTekst: { color: '#fff', fontSize: 24, fontWeight: '700' },
  leeg: { color: '#666' },
  lijst: { maxHeight: 260, borderRadius: 10 },
  rij: { borderWidth: 1, borderColor: '#E4E8E1', borderRadius: 10, backgroundColor: '#fff', marginBottom: 6, padding: 10, gap: 8 },
  rijKop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  naam: { fontSize: 15, color: INKT, fontWeight: '600', flexShrink: 1 },
  eenheid: { fontSize: 13, color: '#5E6B63' },
  hoeveelheidRij: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
