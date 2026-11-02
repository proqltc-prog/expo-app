import { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Sheet, sheetThema, SHEET_ICOON } from '@/lib/frigoSheets';

type IoniconNaam = ComponentProps<typeof Ionicons>['name'];
const MUTED = '#5E6B63';
const INKT = '#17201A';

/**
 * De schakelaar Recepten | Losse producten, zoals op de frigo (WEEK-182). Gebruikt op frigo én lijst,
 * zodat beide schermen er hetzelfde uitzien.
 */
export function SheetSchakelaar({
  sheet,
  onKies,
  labels,
  aantallen,
}: {
  sheet: Sheet;
  onKies: (s: Sheet) => void;
  labels: Record<Sheet, string>;
  aantallen: Record<Sheet, number>;
}) {
  return (
    <View style={s.schakelaar} accessibilityRole="tablist">
      {(['planner', 'los'] as const).map((k) => {
        const aan = sheet === k;
        const kleur = sheetThema(k);
        return (
          <Pressable key={k} style={[s.keuze, aan && s.keuzeAan]} onPress={() => onKies(k)} accessibilityRole="tab" accessibilityState={{ selected: aan }}>
            <View style={[s.ico, aan && { backgroundColor: kleur.accentZacht }]}>
              <Ionicons name={SHEET_ICOON[k] as IoniconNaam} size={18} color={aan ? kleur.accent : MUTED} />
            </View>
            <Text style={[s.keuzeTekst, aan && s.keuzeTekstAan]}>{labels[k]}</Text>
            <View style={[s.tellerBlok, aan && { backgroundColor: kleur.accent, borderColor: kleur.accent }]}>
              <Text style={[s.tellerTekst, aan && { color: '#fff' }]}>{aantallen[k]}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  schakelaar: { flexDirection: 'row', backgroundColor: '#EEF1EC', borderRadius: 18, padding: 5, marginTop: 12 },
  keuze: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 14 },
  keuzeAan: { backgroundColor: '#fff', shadowColor: INKT, shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  ico: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  keuzeTekst: { color: MUTED, fontWeight: '700', fontSize: 14, flexShrink: 1 },
  keuzeTekstAan: { color: INKT },
  tellerBlok: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, borderWidth: 1, borderColor: '#E4E8E1', alignItems: 'center', justifyContent: 'center' },
  tellerTekst: { fontSize: 12, fontWeight: '700', color: MUTED },
});
