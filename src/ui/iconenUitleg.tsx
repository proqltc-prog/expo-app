// WEEK-264: infoknop (i) die in een venster elk icoon van een weekmenukaart toont, zoals op de kaart, met uitleg.
// Zelfde soort venster als de pagina-uitleg (WEEK-177): sluiten met de knop of door ernaast te tikken.
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { icoonTitelSleutel, icoonUitlegSleutel, type WeekmenuIcoon } from '@/lib/planner/weekmenuIconen';

export function IconenUitleg({
  iconen,
  t,
  kleur,
  kleurZacht,
}: {
  iconen: readonly WeekmenuIcoon[];
  t: (sleutel: string) => string;
  kleur: string;
  kleurZacht: string;
}) {
  const [open, setOpen] = useState(false);
  const sluit = () => setOpen(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={t('planning.iconen.knop')} hitSlop={10}>
        <Ionicons name="information-circle-outline" size={26} color={kleur} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={sluit}>
        <Pressable style={s.achtergrond} onPress={sluit} accessibilityLabel={t('pagina.sluiten')}>
          <Pressable style={s.venster} onPress={() => undefined}>
            <Text style={s.titel}>{t('planning.iconen.titel')}</Text>
            <ScrollView style={s.scroll} contentContainerStyle={s.lijst}>
              {iconen.map((i) => (
                <View key={i.sleutel} style={s.rij}>
                  {i.vorm === 'knop' ? (
                    <View style={[s.knopVorm, { borderColor: kleur }]}>
                      <Ionicons name={i.icoon as keyof typeof Ionicons.glyphMap} size={14} color={kleur} />
                    </View>
                  ) : (
                    <View
                      style={[
                        s.icoon,
                        i.vorm === 'rond' ? { borderWidth: 1.5, borderColor: kleur, borderRadius: 20 } : { backgroundColor: kleurZacht, borderRadius: 12 },
                      ]}
                    >
                      <Ionicons name={i.icoon as keyof typeof Ionicons.glyphMap} size={i.vorm === 'rond' ? 22 : 20} color={kleur} />
                    </View>
                  )}
                  <View style={s.tekstVak}>
                    <Text style={s.rijTitel}>{t(icoonTitelSleutel(i))}</Text>
                    <Text style={s.rijUitleg}>{t(icoonUitlegSleutel(i))}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <Pressable style={[s.sluitKnop, { backgroundColor: kleur }]} onPress={sluit} accessibilityRole="button">
              <Text style={s.sluitTekst}>{t('pagina.sluiten')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  achtergrond: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  venster: { width: '100%', maxWidth: 480, maxHeight: '85%', backgroundColor: '#fff', borderRadius: 16, padding: 18, gap: 14 },
  titel: { fontSize: 17, fontWeight: '800', color: '#1F2A24' },
  scroll: { flexGrow: 0 },
  lijst: { gap: 14 },
  rij: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icoon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  knopVorm: { width: 40, height: 28, borderWidth: 1.5, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tekstVak: { flex: 1, gap: 2 },
  rijTitel: { fontSize: 15, fontWeight: '700', color: '#1F2A24' },
  rijUitleg: { fontSize: 14, lineHeight: 20, color: '#4A5650' },
  sluitKnop: { alignSelf: 'stretch', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  sluitTekst: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
