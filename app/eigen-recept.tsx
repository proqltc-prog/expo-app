import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Eenheid, Soort, STIJLEN, StijlCode } from '@/data/receptenbank';
import { SEIZOENEN, Seizoen } from '@/data/seizoenen';
import {
  bewaarEigen,
  EENHEDEN,
  EigenIngredient,
  EigenRecept,
  Fout,
  GEZIN_STIJL,
  isExactBekend,
  nieuweId,
  SOORTEN,
  StijlKeuze,
  valideer,
  verwijderEigen,
  zoekIngredienten,
} from '@/lib/eigenrecepten';
import { laadEigenRecepten, wijzigEigenRecepten } from '@/opslag/eigenRecepten';
import { laadGezin } from '@/opslag/sync';
import { useTaal } from '@/ui/taal';

// Recept bewerken (WEEK-192): naam, soort, kooktijd, stijl (ook de gezinsstijl), seizoen (optioneel),
// ingrediënten uit de ingrediëntenlijst van de app met hoeveelheid en eenheid, en de bereiding stap voor stap.
// Ingrediënten die nog niet bestaan, kun je handmatig toevoegen; die blijven bij het recept.

const KLEUR = '#2e7d4f';

/** Een ingrediënt in het formulier: de hoeveelheid is tekst, zodat een lege invoer niet meteen een fout geeft. */
type Rij = { code?: EigenIngredient['code']; naam: string; hoeveelheid: string; eenheid: Eenheid };

const FOUT_TEKST: Record<Fout, string> = {
  naam: 'recept.fout.naam',
  minuten: 'recept.fout.minuten',
  ingredienten: 'recept.fout.ingredienten',
  stappen: 'recept.fout.stappen',
};

export default function EigenReceptScherm() {
  const { t, taal } = useTaal();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id;

  const [geladen, setGeladen] = useState(!id);
  const [bestaand, setBestaand] = useState<EigenRecept | undefined>(undefined);
  const [naam, setNaam] = useState('');
  const [soort, setSoort] = useState<Soort>('vegetarisch');
  const [minuten, setMinuten] = useState('');
  const [stijlen, setStijlen] = useState<StijlKeuze[]>([GEZIN_STIJL]);
  const [seizoenen, setSeizoenen] = useState<Seizoen[]>([]);
  const [rijen, setRijen] = useState<Rij[]>([]);
  const [stappen, setStappen] = useState<string[]>(['']);
  const [zoek, setZoek] = useState('');
  const [alle, setAlle] = useState<EigenRecept[]>([]);
  const [gezinNaam, setGezinNaam] = useState<string | undefined>(undefined);
  const [fouten, setFouten] = useState<Fout[]>([]);
  const [bezig, setBezig] = useState(false);

  useEffect(() => {
    laadGezin().then((g) => setGezinNaam(g?.naam || undefined)).catch(() => setGezinNaam(undefined));
    laadEigenRecepten().then((lijst) => {
      setAlle(lijst);
      const r = id ? lijst.find((x) => x.id === id) : undefined;
      setBestaand(r);
      if (r) {
        setNaam(r.naam);
        setSoort(r.soort);
        setMinuten(String(r.minuten));
        setStijlen([...(r.gezinStijl ? [GEZIN_STIJL] : []), ...r.stijlen]);
        setSeizoenen([...(r.seizoenen ?? [])]);
        setRijen(r.ingredienten.map((i) => ({ code: i.code, naam: i.naam, hoeveelheid: String(i.hoeveelheid), eenheid: i.eenheid })));
        setStappen(r.stappen.length ? [...r.stappen] : ['']);
      }
      setGeladen(true);
    });
  }, [id]);

  // De gezinsstijl heet naar de gezinsruimte; zonder naam heet hij "Ons gezin".
  const gezinLabel = gezinNaam ?? t('recept.stijlGezinZonderNaam');

  const zoekTreffers = useMemo(() => (zoek.trim() ? zoekIngredienten(zoek, taal, alle) : []), [zoek, taal, alle]);
  const kanNieuw = zoek.trim().length > 0 && !isExactBekend(zoek, zoekTreffers);

  const voegIngredientToe = (code: EigenIngredient['code'], ingredientNaam: string) => {
    setRijen((r) => [...r, { code, naam: ingredientNaam, hoeveelheid: '', eenheid: 'g' }]);
    setZoek('');
  };

  const wijzigRij = (index: number, deel: Partial<Rij>) =>
    setRijen((r) => r.map((x, i) => (i === index ? { ...x, ...deel } : x)));

  const verwijderRij = (index: number) => setRijen((r) => r.filter((_, i) => i !== index));

  const wijzigStap = (index: number, tekst: string) => setStappen((s) => s.map((x, i) => (i === index ? tekst : x)));

  // Een nieuwe stap alleen als de laatste ingevuld is.
  const laatsteGevuld = stappen.length > 0 && stappen[stappen.length - 1].trim().length > 0;
  const voegStapToe = () => {
    if (laatsteGevuld) setStappen((s) => [...s, '']);
  };

  const toggleStijl = (k: StijlKeuze) =>
    setStijlen((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  const toggleSeizoen = (k: Seizoen) =>
    setSeizoenen((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  const bewaar = async () => {
    if (bezig) return;
    const ingredienten: EigenIngredient[] = rijen.map((r) => ({
      ...(r.code ? { code: r.code } : {}),
      naam: r.naam,
      hoeveelheid: Number(r.hoeveelheid.trim().replace(',', '.')),
      eenheid: r.eenheid,
    }));
    const resultaat = valideer({ naam, soort, minuten, stijlen, seizoenen, ingredienten, stappen });
    if (!resultaat.ok) {
      setFouten(resultaat.fouten);
      return;
    }
    setFouten([]);
    setBezig(true);
    try {
      const nu = new Date();
      const recept: EigenRecept = {
        ...resultaat.waarden,
        id: bestaand?.id ?? nieuweId(nu),
        bijgewerkt: nu.toISOString(),
      };
      await wijzigEigenRecepten((lijst) => bewaarEigen(lijst, recept));
      router.back();
    } finally {
      setBezig(false);
    }
  };

  const verwijder = () => {
    if (!bestaand) return;
    Alert.alert(t('recept.verwijderVraag'), undefined, [
      { text: t('recept.annuleer'), style: 'cancel' },
      {
        text: t('recept.verwijder'),
        style: 'destructive',
        onPress: async () => {
          await wijzigEigenRecepten((lijst) => verwijderEigen(lijst, bestaand.id));
          router.back();
        },
      },
    ]);
  };

  if (!geladen) return null;

  const fout = (f: Fout) => (fouten.includes(f) ? <Text style={s.fout}>{t(FOUT_TEKST[f] as never)}</Text> : null);

  return (
    <ScrollView contentContainerStyle={s.scherm} keyboardShouldPersistTaps="handled">
      <Text style={s.kop}>{t(bestaand ? 'recept.titelBewerk' : 'recept.titelNieuw')}</Text>

      <Text style={s.label}>{t('recept.naam')}</Text>
      <TextInput style={s.veld} value={naam} onChangeText={setNaam} accessibilityLabel={t('recept.naam')} />
      {fout('naam')}

      <Text style={s.label}>{t('recept.soort')}</Text>
      <View style={s.rijChips}>
        {SOORTEN.map((k) => (
          <Chip key={k} tekst={t(`soort.${k}`)} actief={soort === k} onPress={() => setSoort(k)} />
        ))}
      </View>

      <Text style={s.label}>{t('recept.minuten')}</Text>
      <TextInput
        style={s.veld}
        value={minuten}
        onChangeText={setMinuten}
        keyboardType="number-pad"
        accessibilityLabel={t('recept.minuten')}
      />
      {fout('minuten')}

      <Text style={s.label}>{t('recept.stijlen')}</Text>
      <View style={s.rijChips}>
        <Chip tekst={gezinLabel} actief={stijlen.includes(GEZIN_STIJL)} onPress={() => toggleStijl(GEZIN_STIJL)} />
        {STIJLEN.map((k: StijlCode) => (
          <Chip key={k} tekst={t(`stijl.${k}`)} actief={stijlen.includes(k)} onPress={() => toggleStijl(k)} />
        ))}
      </View>

      <Text style={s.label}>{t('recept.seizoen')}</Text>
      <View style={s.rijChips}>
        {SEIZOENEN.map((k) => (
          <Chip key={k} tekst={t(`seizoen.${k}`)} actief={seizoenen.includes(k)} onPress={() => toggleSeizoen(k)} />
        ))}
      </View>

      <Text style={s.label}>{t('recept.ingredienten')}</Text>
      {rijen.map((r, i) => (
        <View key={`${r.naam}-${i}`} style={s.ingredient}>
          <Text style={s.ingredientNaam}>{r.naam}</Text>
          <View style={s.ingredientRij}>
            <TextInput
              style={[s.veld, s.hoeveelheid]}
              value={r.hoeveelheid}
              onChangeText={(h) => wijzigRij(i, { hoeveelheid: h })}
              keyboardType="decimal-pad"
              placeholder={t('recept.hoeveelheid')}
              accessibilityLabel={t('recept.hoeveelheid')}
            />
            {EENHEDEN.map((e) => (
              <Chip key={e} tekst={t(`recept.eenheid.${e}`)} actief={r.eenheid === e} onPress={() => wijzigRij(i, { eenheid: e })} />
            ))}
            <Pressable onPress={() => verwijderRij(i)} accessibilityRole="button" hitSlop={8}>
              <Text style={s.verwijder}>✕</Text>
            </Pressable>
          </View>
        </View>
      ))}
      {fout('ingredienten')}

      <TextInput
        style={s.veld}
        value={zoek}
        onChangeText={setZoek}
        placeholder={t('recept.zoekIngredient')}
        accessibilityLabel={t('recept.zoekIngredient')}
        autoCorrect={false}
      />
      {zoekTreffers.map((k) => (
        <Pressable key={`${k.code ?? k.naam}`} style={s.treffer} onPress={() => voegIngredientToe(k.code, k.naam)} accessibilityRole="button">
          <Text style={s.trefferTekst}>{k.naam}</Text>
        </Pressable>
      ))}
      {kanNieuw && (
        <Pressable style={s.treffer} onPress={() => voegIngredientToe(undefined, zoek.trim())} accessibilityRole="button">
          <Text style={s.trefferTekst}>{t('recept.voegIngredientToe', { naam: zoek.trim() })}</Text>
        </Pressable>
      )}

      <Text style={s.label}>{t('recept.stappen')}</Text>
      {stappen.map((stap, i) => (
        <View key={i} style={s.stapRij}>
          <Text style={s.stapNummer}>{i + 1}</Text>
          <TextInput
            style={[s.veld, s.stapVeld]}
            value={stap}
            onChangeText={(tekst) => wijzigStap(i, tekst)}
            multiline
            placeholder={t('recept.stap', { n: i + 1 })}
            accessibilityLabel={t('recept.stap', { n: i + 1 })}
          />
        </View>
      ))}
      {laatsteGevuld && (
        <Pressable onPress={voegStapToe} accessibilityRole="button">
          <Text style={s.link}>{t('recept.stapVoeg')}</Text>
        </Pressable>
      )}
      {fout('stappen')}

      <Pressable style={[s.bewaar, bezig && { opacity: 0.6 }]} onPress={bewaar} disabled={bezig} accessibilityRole="button">
        <Text style={s.bewaarTekst}>{t('recept.bewaar')}</Text>
      </Pressable>
      {bestaand && (
        <Pressable style={s.verwijderKnop} onPress={verwijder} accessibilityRole="button">
          <Text style={s.verwijderTekst}>{t('recept.verwijder')}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function Chip({ tekst, actief, onPress }: { tekst: string; actief: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[s.chip, actief && s.chipActief]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: actief }}
    >
      <Text style={[s.chipTekst, actief && s.chipTekstActief]}>{tekst}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  scherm: { padding: 16, gap: 8, paddingBottom: 48 },
  kop: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '700', color: '#333', marginTop: 10 },
  veld: { borderWidth: 1.5, borderColor: '#ccc', borderRadius: 10, padding: 10, fontSize: 16, backgroundColor: '#fff' },
  fout: { color: '#c62828', fontSize: 13 },
  rijChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1.5, borderColor: '#ccc', backgroundColor: '#fff' },
  chipActief: { backgroundColor: KLEUR, borderColor: KLEUR },
  chipTekst: { fontSize: 13, color: '#333', fontWeight: '600' },
  chipTekstActief: { color: '#fff' },
  ingredient: { gap: 6, paddingVertical: 4 },
  ingredientNaam: { fontSize: 15, fontWeight: '600' },
  ingredientRij: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  hoeveelheid: { width: 90, paddingVertical: 8 },
  verwijder: { fontSize: 18, color: '#c62828', paddingHorizontal: 6 },
  treffer: { backgroundColor: '#f4f8f5', borderRadius: 10, padding: 10 },
  trefferTekst: { fontSize: 15, color: '#2e7d4f' },
  stapRij: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  stapNummer: { width: 22, paddingTop: 12, fontWeight: '700', color: '#555', textAlign: 'center' },
  stapVeld: { flex: 1, minHeight: 44 },
  link: { color: KLEUR, fontWeight: '700', paddingVertical: 6 },
  bewaar: { backgroundColor: KLEUR, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  bewaarTekst: { color: '#fff', fontWeight: '700', fontSize: 16 },
  verwijderKnop: { padding: 12, alignItems: 'center' },
  verwijderTekst: { color: '#c62828', fontWeight: '600' },
});
