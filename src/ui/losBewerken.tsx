import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AFDELINGEN, Afdeling } from '@/data/ingredienten';
import { FrigoRegel, leesLosInvoer, LosWijziging, ZELF_EENHEDEN } from '@/lib/frigo';
import { Sleutel } from '@/i18n';
import { useTaal } from '@/ui/taal';

const ORANJE = '#E8680F';
const INKT = '#17201A';
const MUTED = '#5E6B63';

type Props = {
  /** Het los product dat bewerkt wordt; null = popup dicht. */
  regel: FrigoRegel | null;
  onSluit: () => void;
  onBewaar: (w: LosWijziging) => void;
};

/**
 * Popup om een los product te wijzigen (WEEK-181): hoeveelheid, eenheid, categorie en houdbaarheid.
 * Opent via het potloodje naast het product. De velden krijgen de volle breedte van de popup.
 */
export function LosBewerken({ regel, onSluit, onBewaar }: Props) {
  return (
    <Modal visible={regel !== null} transparent animationType="fade" onRequestClose={onSluit}>
      <Pressable style={s.achtergrond} onPress={onSluit}>
        {/* Tikken binnen het venster sluit niet. */}
        <Pressable style={s.venster} onPress={() => undefined}>
          {regel && <Inhoud key={regel.sleutel} regel={regel} onSluit={onSluit} onBewaar={onBewaar} />}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Houdbaar tot als ISO-datum (yyyy-mm-dd) in het invoerformaat dd-mm-jjjj. */
function naarInvoer(iso: string | undefined): string {
  if (!iso) return '';
  const [j, m, d] = iso.split('-');
  return `${d}-${m}-${j}`;
}

function Inhoud({ regel, onSluit, onBewaar }: { regel: FrigoRegel; onSluit: () => void; onBewaar: (w: LosWijziging) => void }) {
  const { t } = useTaal();
  const [hoeveelheid, setHoeveelheid] = useState(regel.hoeveelheid !== undefined ? String(regel.hoeveelheid).replace('.', ',') : '');
  const [eenheid, setEenheid] = useState<string | undefined>(regel.eenheid);
  const [afdeling, setAfdeling] = useState<Afdeling | 'overig'>(regel.afdeling);
  const [houdbaar, setHoudbaar] = useState(naarInvoer(regel.houdbaarTot));
  const [fout, setFout] = useState<'hoeveelheid' | 'houdbaar' | undefined>(undefined);

  const bewaar = () => {
    const invoer = leesLosInvoer(hoeveelheid, houdbaar);
    if (invoer.fout) {
      setFout(invoer.fout);
      return;
    }
    onBewaar({ hoeveelheid: invoer.hoeveelheid, eenheid, afdeling, houdbaarTot: invoer.houdbaarTot });
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.inhoud}>
      <Text style={s.kop}>{t('frigo.bewerkKop')}</Text>
      <Text style={s.naam}>{regel.naam}</Text>

      <Text style={s.label}>{t('frigo.hoeveelheid')}</Text>
      <TextInput
        style={[s.veld, fout === 'hoeveelheid' && s.veldFout]}
        value={hoeveelheid}
        onChangeText={(x) => {
          setHoeveelheid(x);
          setFout(undefined);
        }}
        keyboardType="decimal-pad"
        accessibilityLabel={t('frigo.hoeveelheid')}
      />
      {fout === 'hoeveelheid' && <Text style={s.fout}>{t('frigo.houdbaarFoutGetal')}</Text>}

      <Text style={s.label}>{t('frigo.bewerkEenheid')}</Text>
      <View style={s.rij}>
        {ZELF_EENHEDEN.map((e) => (
          <Pressable key={e} style={[s.chip, eenheid === e && s.chipAan]} onPress={() => setEenheid(e)} accessibilityRole="button" accessibilityState={{ selected: eenheid === e }}>
            <Text style={[s.chipTekst, eenheid === e && s.chipTekstAan]}>{e === 'stuk' ? t('frigo.stuks') : e}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.label}>{t('frigo.bewerkCategorie')}</Text>
      <View style={s.rij}>
        {[...AFDELINGEN, 'overig' as const].map((a) => (
          <Pressable key={a} style={[s.chip, afdeling === a && s.chipAan]} onPress={() => setAfdeling(a)} accessibilityRole="button" accessibilityState={{ selected: afdeling === a }}>
            <Text style={[s.chipTekst, afdeling === a && s.chipTekstAan]}>{t(`afdeling.${a}` as Sleutel)}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.label}>{t('frigo.bewerkHoudbaar')}</Text>
      <TextInput
        style={[s.veld, fout === 'houdbaar' && s.veldFout]}
        value={houdbaar}
        onChangeText={(x) => {
          setHoudbaar(x);
          setFout(undefined);
        }}
        placeholder={t('frigo.houdbaarPlaceholder')}
        accessibilityLabel={t('frigo.bewerkHoudbaar')}
      />
      {fout === 'houdbaar' && <Text style={s.fout}>{t('frigo.houdbaarFout')}</Text>}

      <View style={s.knoppen}>
        <Pressable style={[s.knop, s.knopLicht]} onPress={onSluit} accessibilityRole="button">
          <Text style={s.knopLichtTekst}>{t('frigo.bewerkAnnuleer')}</Text>
        </Pressable>
        <Pressable style={[s.knop, { backgroundColor: ORANJE }]} onPress={bewaar} accessibilityRole="button">
          <Text style={s.knopTekst}>{t('frigo.bewerkBewaar')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  achtergrond: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  venster: { width: '100%', maxWidth: 480, maxHeight: '85%', backgroundColor: '#fff', borderRadius: 16, padding: 18 },
  inhoud: { gap: 8 },
  kop: { fontSize: 18, fontWeight: '800', color: INKT },
  naam: { fontSize: 15, color: MUTED, marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '700', color: MUTED, marginTop: 8 },
  veld: { width: '100%', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, height: 44, backgroundColor: '#fff', color: INKT },
  veldFout: { borderColor: '#B23A05' },
  fout: { color: '#B23A05', fontSize: 13 },
  rij: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#fff' },
  chipAan: { backgroundColor: ORANJE, borderColor: ORANJE },
  chipTekst: { color: '#444' },
  chipTekstAan: { color: '#fff', fontWeight: '700' },
  knoppen: { flexDirection: 'row', gap: 10, marginTop: 14 },
  knop: { flex: 1, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  knopLicht: { borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff' },
  knopLichtTekst: { color: '#444', fontWeight: '700' },
  knopTekst: { color: '#fff', fontWeight: '700' },
});
