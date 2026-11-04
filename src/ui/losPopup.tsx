import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AFDELINGEN, Afdeling } from '@/data/ingredienten';
import { leesLosInvoer, LosWijziging, ZELF_EENHEDEN } from '@/lib/frigo';
import { Sleutel } from '@/i18n';
import { useTaal } from '@/ui/taal';

const ORANJE = '#E8680F';
const INKT = '#17201A';
const MUTED = '#5E6B63';

/** Wat de popup toont en met welke startwaarden (WEEK-182). Eén popup voor frigo en lijst. */
export type PopupOpties = {
  /** Verandert per opening, zodat de velden telkens met de juiste waarden beginnen. */
  sleutel: string;
  titel: string;
  naam: string;
  hoeveelheid?: number;
  eenheid?: string;
  afdeling: Afdeling | 'overig';
  houdbaarTot?: string;
  toonEenheid: boolean;
  toonCategorie: boolean;
  /** Houdbaarheid enkel in de frigo. */
  toonHoudbaar: boolean;
  /** WEEK-200: de eenheden om uit te kiezen (standaard g, ml, stuk); een recept biedt ook teentje aan. */
  eenheden?: readonly string[];
  /** WEEK-200: een recept heeft altijd een hoeveelheid nodig. */
  hoeveelheidVerplicht?: boolean;
  /** WEEK-200: toon de vaste categorie als tekst wanneer ze niet te kiezen is (ingrediënt uit de app). */
  toonVasteCategorie?: boolean;
  /** WEEK-200: de kleur van de bewaarknop en de gekozen chips; standaard oranje (lijst en frigo). */
  accent?: string;
};

type Props = {
  opties: PopupOpties | null;
  onSluit: () => void;
  onBewaar: (w: LosWijziging) => void;
};

/**
 * Popup voor een product: hoeveelheid, en waar nodig eenheid, categorie en houdbaarheid.
 * Velden die uit staan, behouden hun startwaarde. Tikken binnen het venster sluit niet.
 */
export function LosPopup({ opties, onSluit, onBewaar }: Props) {
  return (
    <Modal visible={opties !== null} transparent animationType="fade" onRequestClose={onSluit}>
      <Pressable style={s.achtergrond} onPress={onSluit}>
        <Pressable style={s.venster} onPress={() => undefined}>
          {opties && <Inhoud key={opties.sleutel} opties={opties} onSluit={onSluit} onBewaar={onBewaar} />}
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

function Inhoud({ opties, onSluit, onBewaar }: { opties: PopupOpties; onSluit: () => void; onBewaar: (w: LosWijziging) => void }) {
  const { t } = useTaal();
  const [hoeveelheid, setHoeveelheid] = useState(opties.hoeveelheid !== undefined ? String(opties.hoeveelheid).replace('.', ',') : '');
  const [eenheid, setEenheid] = useState<string | undefined>(opties.eenheid);
  const [afdeling, setAfdeling] = useState<Afdeling | 'overig'>(opties.afdeling);
  const [houdbaar, setHoudbaar] = useState(naarInvoer(opties.houdbaarTot));
  const [fout, setFout] = useState<'hoeveelheid' | 'houdbaar' | 'verplicht' | undefined>(undefined);

  const accent = opties.accent ?? ORANJE;
  const eenheden = opties.eenheden ?? ZELF_EENHEDEN;
  const eenheidLabel = (e: string) => (e === 'stuk' ? t('frigo.stuks') : e === 'teentje' ? t('recept.eenheid.teentje') : e);

  const bewaar = () => {
    const invoer = leesLosInvoer(hoeveelheid, opties.toonHoudbaar ? houdbaar : '');
    if (invoer.fout) {
      setFout(invoer.fout);
      return;
    }
    if (opties.hoeveelheidVerplicht && !(invoer.hoeveelheid !== undefined && invoer.hoeveelheid > 0)) {
      setFout('verplicht');
      return;
    }
    onBewaar({
      hoeveelheid: invoer.hoeveelheid,
      eenheid: opties.toonEenheid ? eenheid : opties.eenheid,
      afdeling: opties.toonCategorie ? afdeling : opties.afdeling,
      houdbaarTot: opties.toonHoudbaar ? invoer.houdbaarTot : opties.houdbaarTot,
    });
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.inhoud}>
      <Text style={s.kop}>{opties.titel}</Text>
      <Text style={s.naam}>{opties.naam}</Text>

      <Text style={s.label}>{t('frigo.hoeveelheid')}</Text>
      <TextInput
        style={[s.veld, (fout === 'hoeveelheid' || fout === 'verplicht') && s.veldFout]}
        value={hoeveelheid}
        onChangeText={(x) => {
          setHoeveelheid(x);
          setFout(undefined);
        }}
        keyboardType="decimal-pad"
        accessibilityLabel={t('frigo.hoeveelheid')}
      />
      {fout === 'hoeveelheid' && <Text style={s.fout}>{t('frigo.houdbaarFoutGetal')}</Text>}
      {fout === 'verplicht' && <Text style={s.fout}>{t('frigo.hoeveelheidVerplicht')}</Text>}

      {opties.toonEenheid ? (
        <>
          <Text style={s.label}>{t('frigo.bewerkEenheid')}</Text>
          <View style={s.rij}>
            {eenheden.map((e) => (
              <Pressable
                key={e}
                style={[s.chip, eenheid === e && { backgroundColor: accent, borderColor: accent }]}
                onPress={() => setEenheid(e)}
                accessibilityRole="button"
                accessibilityState={{ selected: eenheid === e }}
              >
                <Text style={[s.chipTekst, eenheid === e && s.chipTekstAan]}>{eenheidLabel(e)}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : opties.eenheid ? (
        <Text style={s.vast}>{`${t('frigo.bewerkEenheid')}: ${eenheidLabel(opties.eenheid)}`}</Text>
      ) : null}

      {opties.toonCategorie ? (
        <>
          <Text style={s.label}>{t('frigo.bewerkCategorie')}</Text>
          <View style={s.rij}>
            {[...AFDELINGEN, 'overig' as const].map((a) => (
              <Pressable
                key={a}
                style={[s.chip, afdeling === a && { backgroundColor: accent, borderColor: accent }]}
                onPress={() => setAfdeling(a)}
                accessibilityRole="button"
                accessibilityState={{ selected: afdeling === a }}
              >
                <Text style={[s.chipTekst, afdeling === a && s.chipTekstAan]}>{t(`afdeling.${a}` as Sleutel)}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : opties.toonVasteCategorie ? (
        <Text style={s.vast}>{`${t('frigo.bewerkCategorie')}: ${t(`afdeling.${opties.afdeling}` as Sleutel)}`}</Text>
      ) : null}

      {opties.toonHoudbaar && (
        <>
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
        </>
      )}

      <View style={s.knoppen}>
        <Pressable style={[s.knop, s.knopLicht]} onPress={onSluit} accessibilityRole="button">
          <Text style={s.knopLichtTekst}>{t('frigo.bewerkAnnuleer')}</Text>
        </Pressable>
        <Pressable style={[s.knop, { backgroundColor: accent }]} onPress={bewaar} accessibilityRole="button">
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
  vast: { fontSize: 14, color: INKT, marginTop: 8, fontWeight: '600' },
  veld: { width: '100%', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, height: 44, backgroundColor: '#fff', color: INKT },
  veldFout: { borderColor: '#B23A05' },
  fout: { color: '#B23A05', fontSize: 13 },
  rij: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#fff' },
  chipTekst: { color: '#444' },
  chipTekstAan: { color: '#fff', fontWeight: '700' },
  knoppen: { flexDirection: 'row', gap: 10, marginTop: 14 },
  knop: { flex: 1, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  knopLicht: { borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff' },
  knopLichtTekst: { color: '#444', fontWeight: '700' },
  knopTekst: { color: '#fff', fontWeight: '700' },
});
