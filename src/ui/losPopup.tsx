import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { AFDELINGEN, Afdeling } from '@/data/ingredienten';
import { leesLosInvoer, LosWijziging, ZELF_EENHEDEN } from '@/lib/frigo';
import { eenheidNaam, Sleutel } from '@/i18n';
import { datumToestel, naarInvoerDatum, vandaag } from '@/lib/houdbaarheid';
import { Ionicons } from '@expo/vector-icons';
import { DatumKiezer } from '@/ui/datumKiezer';
import { useTaal } from '@/ui/taal';
import { popupHoogte } from '@/lib/popupHoogte';

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
  // WEEK-285: de hoogte volgt het zichtbare scherm (op een iPhone in Safari kleiner dan 100% door de werkbalken).
  const { height } = useWindowDimensions();
  return (
    <Modal visible={opties !== null} transparent animationType="fade" onRequestClose={onSluit}>
      <Pressable style={s.achtergrond} onPress={onSluit}>
        <Pressable style={[s.venster, { maxHeight: popupHoogte(height) }]} onPress={() => undefined}>
          {opties && <Inhoud key={opties.sleutel} opties={opties} onSluit={onSluit} onBewaar={onBewaar} />}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Inhoud({ opties, onSluit, onBewaar }: { opties: PopupOpties; onSluit: () => void; onBewaar: (w: LosWijziging) => void }) {
  const { t, taal } = useTaal();
  const [hoeveelheid, setHoeveelheid] = useState(opties.hoeveelheid !== undefined ? String(opties.hoeveelheid).replace('.', ',') : '');
  const [eenheid, setEenheid] = useState<string | undefined>(opties.eenheid);
  const [afdeling, setAfdeling] = useState<Afdeling | 'overig'>(opties.afdeling);
  // WEEK-242: de houdbaarheid als yyyy-mm-dd uit de kalender; voor de controle gaat ze terug naar dd-mm-jjjj.
  const [houdbaar, setHoudbaar] = useState<string | undefined>(opties.houdbaarTot);
  const [kalender, setKalender] = useState(false);
  const [fout, setFout] = useState<'hoeveelheid' | 'houdbaar' | 'verplicht' | undefined>(undefined);

  const accent = opties.accent ?? ORANJE;
  const eenheden = opties.eenheden ?? ZELF_EENHEDEN;
  const eenheidLabel = (e: string) => eenheidNaam(taal, e);

  const bewaar = () => {
    const invoer = leesLosInvoer(hoeveelheid, opties.toonHoudbaar ? naarInvoerDatum(houdbaar) : '');
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
    <>
    {/* WEEK-285: enkel de velden scrollen; de knoppen staan eronder, altijd zichtbaar. */}
    <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={s.inhoud}>
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

      {/* WEEK-242: houdbaarheid via een kalender; de datum staat in het formaat van het toestel. */}
      {opties.toonHoudbaar && (
        <>
          <Text style={s.label}>{t('frigo.bewerkHoudbaar')}</Text>
          <View style={s.datumRij}>
            <Pressable style={[s.datumKnop, { borderColor: accent }]} onPress={() => setKalender(true)} accessibilityRole="button" accessibilityLabel={t('frigo.bewerkHoudbaar')}>
              <Ionicons name="calendar-outline" size={18} color={accent} />
              <Text style={[s.datumTekst, !houdbaar && s.datumLeeg]}>{houdbaar ? datumToestel(houdbaar) : t('frigo.houdbaarGeen')}</Text>
            </Pressable>
            {houdbaar ? (
              <Pressable onPress={() => setHoudbaar(undefined)} accessibilityRole="button" accessibilityLabel={t('frigo.houdbaarWis')} hitSlop={8}>
                <Ionicons name="close-circle-outline" size={20} color={MUTED} />
              </Pressable>
            ) : null}
          </View>
          {kalender && (
            <DatumKiezer
              waarde={houdbaar}
              vandaag={vandaag(new Date())}
              titel={t('frigo.houdbaarheid')}
              kleur={accent}
              onKies={(iso) => {
                setHoudbaar(iso);
                setKalender(false);
              }}
              onSluit={() => setKalender(false)}
            />
          )}
        </>
      )}

    </ScrollView>
      <View style={s.knoppen}>
        <Pressable style={[s.knop, s.knopLicht]} onPress={onSluit} accessibilityRole="button">
          <Text style={s.knopLichtTekst}>{t('frigo.bewerkAnnuleer')}</Text>
        </Pressable>
        <Pressable style={[s.knop, { backgroundColor: accent }]} onPress={bewaar} accessibilityRole="button">
          <Text style={s.knopTekst}>{t('frigo.bewerkBewaar')}</Text>
        </Pressable>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  achtergrond: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 12 },
  venster: { width: '100%', maxWidth: 480, backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'column' },
  scroll: { flexShrink: 1, minHeight: 0 },
  inhoud: { gap: 6, paddingBottom: 4 },
  kop: { fontSize: 18, fontWeight: '800', color: INKT },
  naam: { fontSize: 15, color: MUTED, marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '700', color: MUTED, marginTop: 8 },
  vast: { fontSize: 14, color: INKT, marginTop: 8, fontWeight: '600' },
  veld: { width: '100%', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, height: 44, backgroundColor: '#fff', color: INKT },
  veldFout: { borderColor: '#B23A05' },
  fout: { color: '#B23A05', fontSize: 13 },
  rij: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 16, paddingHorizontal: 11, paddingVertical: 5, backgroundColor: '#fff' },
  chipTekst: { color: '#444' },
  chipTekstAan: { color: '#fff', fontWeight: '700' },
  datumRij: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  datumKnop: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 44, backgroundColor: '#fff' },
  datumTekst: { color: INKT, fontSize: 15 },
  datumLeeg: { color: MUTED },
  knoppen: { flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EEF1EC', marginTop: 4 },
  knop: { flex: 1, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  knopLicht: { borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff' },
  knopLichtTekst: { color: '#444', fontWeight: '700' },
  knopTekst: { color: '#fff', fontWeight: '700' },
});
