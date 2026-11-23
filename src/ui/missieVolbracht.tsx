// WEEK-327/328: "Missie volbracht!" zodra alle boodschappen afgevinkt zijn: de eigen tekening van een volle
// boodschappentas springt in beeld (met twinkelende glinsters), het aantal gekochte producten en een wisselende zin.
// Sluiten met een tik. Geen trilling, geen confetti of emoji (WEEK-328).
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feestbeeld } from '@/ui/feestbeeld';

export function MissieVolbracht({
  zichtbaar,
  titel,
  aantal,
  zin,
  sluitTekst,
  onSluit,
}: {
  zichtbaar: boolean;
  titel: string;
  aantal: string;
  zin: string;
  sluitTekst: string;
  onSluit: () => void;
}) {
  return (
    <Modal visible={zichtbaar} transparent animationType="fade" onRequestClose={onSluit}>
      <Pressable style={s.achtergrond} onPress={onSluit} accessibilityRole="button" accessibilityLabel={sluitTekst}>
        <View style={s.kaart}>
          <Feestbeeld soort="tas" grootte={190} zichtbaar={zichtbaar} />
          <Text style={s.titel}>{titel}</Text>
          <View style={s.badge}>
            <Text style={s.badgeTekst}>{aantal}</Text>
          </View>
          <Text style={s.zin}>{zin}</Text>
          <Text style={s.sluit}>{sluitTekst}</Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  achtergrond: { flex: 1, backgroundColor: 'rgba(15, 30, 22, 0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  kaart: { width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 28, paddingTop: 22, paddingBottom: 24, paddingHorizontal: 24, alignItems: 'center', gap: 10 },
  titel: { fontSize: 26, fontWeight: '900', color: '#17201A', textAlign: 'center' },
  badge: { backgroundColor: '#E6F3F1', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14 },
  badgeTekst: { color: '#0F6B66', fontWeight: '800', fontSize: 15 },
  zin: { fontSize: 17, color: '#17201A', textAlign: 'center', lineHeight: 24 },
  sluit: { marginTop: 4, fontSize: 13, color: '#5E6B63', fontWeight: '600' },
});
