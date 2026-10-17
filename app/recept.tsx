import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { Eenheid, Soort, StijlCode, STIJLEN } from '@/data/receptenbank';
import { IngredientCode, ingredientNaam } from '@/data/ingredienten';
import {
  bewaarEigen,
  EENHEDEN,
  EigenIngredient,
  EigenRecept,
  Fout,
  isExactBekend,
  nieuweId,
  SOORTEN,
  valideer,
  verwijderEigen,
  zoekIngredienten,
} from '@/lib/eigenrecepten';
import { laadEigenRecepten, wijzigEigenRecepten } from '@/opslag/eigenRecepten';
import { Chips } from '@/ui/chips';
import { useTaal } from '@/ui/taal';

// Recept toevoegen of wijzigen (WEEK-45). Een recept geldt voor één volwassene;
// het gezin rekent de hoeveelheden om via de gezinssamenstelling.

const KLEUR = '#2e7d4f';
const FOUTEN_KEY: Record<Fout, 'recept.fout.naam' | 'recept.fout.minuten' | 'recept.fout.ingredienten' | 'recept.fout.stappen'> = {
  naam: 'recept.fout.naam',
  minuten: 'recept.fout.minuten',
  ingredienten: 'recept.fout.ingredienten',
  stappen: 'recept.fout.stappen',
};

type Concept = { code?: IngredientCode; naam: string };

const wissel = <T,>(lijst: T[], waarde: T) => (lijst.includes(waarde) ? lijst.filter((x) => x !== waarde) : [...lijst, waarde]);

export default function Recept() {
  const { t, taal } = useTaal();
  const nav = useNavigation();
  const params = useLocalSearchParams<{ id?: string }>();
  const [id, setId] = useState<string | undefined>(params.id);
  const [eigen, setEigen] = useState<EigenRecept[]>([]);
  const [geladen, setGeladen] = useState(!params.id);
  const [nietGevonden, setNietGevonden] = useState(false);

  const [naam, setNaam] = useState('');
  const [soort, setSoort] = useState<Soort>('vlees');
  const [minuten, setMinuten] = useState('');
  const [stijlen, setStijlen] = useState<StijlCode[]>([]);
  const [ingredienten, setIngredienten] = useState<EigenIngredient[]>([]);
  const [stappen, setStappen] = useState<string[]>(['']);
  const [fouten, setFouten] = useState<Fout[]>([]);

  // Ingrediënt zoeken en toevoegen.
  const [zoekIngr, setZoekIngr] = useState('');
  const [concept, setConcept] = useState<Concept | null>(null);
  const [conceptHoeveelheid, setConceptHoeveelheid] = useState('');
  const [conceptEenheid, setConceptEenheid] = useState<Eenheid>('g');

  useEffect(() => {
    nav.setOptions({ title: id ? t('recept.titelBewerk') : t('recept.titelNieuw') });
  }, [nav, id, t]);

  useEffect(() => {
    laadEigenRecepten().then((lijst) => {
      setEigen(lijst);
      if (params.id) {
        const r = lijst.find((x) => x.id === params.id);
        if (r) {
          setNaam(r.naam);
          setSoort(r.soort);
          setMinuten(String(r.minuten));
          setStijlen(r.stijlen);
          setIngredienten(r.ingredienten);
          setStappen(r.stappen.length ? r.stappen : ['']);
        } else {
          setNietGevonden(true);
        }
      }
      setGeladen(true);
    });
    // Eenmalig bij openen; het recept-id verandert niet tijdens het bewerken.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const suggesties = zoekIngredienten(zoekIngr, taal, eigen);
  const zoekTekst = zoekIngr.trim();
  const toonEigenIngredient = zoekTekst.length > 0 && !isExactBekend(zoekTekst, suggesties);

  const kiesConcept = (c: Concept) => {
    setConcept(c);
    setZoekIngr('');
  };

  const voegIngredientToe = () => {
    if (!concept) return;
    const hoeveelheid = Number(conceptHoeveelheid.trim().replace(',', '.'));
    if (!(hoeveelheid > 0)) return;
    setIngredienten((huidig) => [...huidig, { ...concept, hoeveelheid, eenheid: conceptEenheid }]);
    setConcept(null);
    setConceptHoeveelheid('');
    setConceptEenheid('g');
  };

  const naamVan = (i: EigenIngredient) => (i.code ? ingredientNaam(i.code, taal) : i.naam);

  const bewaar = async () => {
    const res = valideer({ naam, soort, minuten, stijlen, ingredienten, stappen });
    if (!res.ok) {
      setFouten(res.fouten);
      return;
    }
    setFouten([]);
    const nu = new Date();
    const doelId = id ?? nieuweId(nu);
    await wijzigEigenRecepten((lijst) => bewaarEigen(lijst, { id: doelId, ...res.waarden, bijgewerkt: nu.toISOString() }));
    router.back();
  };

  const verwijder = () => {
    if (!id) return;
    const doelId = id;
    Alert.alert(t('recept.verwijder'), t('recept.verwijderVraag'), [
      { text: t('planning.annuleer'), style: 'cancel' },
      {
        text: t('planning.verwijderen'),
        style: 'destructive',
        onPress: async () => {
          await wijzigEigenRecepten((lijst) => verwijderEigen(lijst, doelId));
          router.back();
        },
      },
    ]);
  };

  if (!geladen) return null;

  if (nietGevonden) {
    return (
      <View style={s.leegScherm}>
        <Text style={s.leeg}>{t('recept.niet')}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <Text style={s.kop}>{t('recept.naam')}</Text>
      <TextInput style={s.veld} value={naam} onChangeText={setNaam} accessibilityLabel={t('recept.naam')} />

      <Text style={s.kop}>{t('recept.minuten')}</Text>
      <TextInput
        style={s.veld}
        value={minuten}
        onChangeText={setMinuten}
        keyboardType="decimal-pad"
        accessibilityLabel={t('recept.minuten')}
      />

      <Text style={s.kop}>{t('recept.soort')}</Text>
      <Chips opties={SOORTEN} gekozen={[soort]} label={(x) => t(`soort.${x}`)} onWissel={setSoort} />

      <Text style={s.kop}>{t('recept.stijlen')}</Text>
      <Chips opties={STIJLEN} gekozen={stijlen} label={(x) => t(`stijl.${x}`)} onWissel={(x) => setStijlen(wissel(stijlen, x))} />

      <Text style={s.kop}>{t('recept.ingredienten')}</Text>
      {ingredienten.map((i, index) => (
        <View key={`${index}-${naamVan(i)}`} style={s.ingrRij}>
          <Text style={s.ingrTekst}>
            {naamVan(i)} · {i.hoeveelheid} {t(`recept.eenheid.${i.eenheid}`)}
          </Text>
          <Pressable onPress={() => setIngredienten((h) => h.filter((_, k) => k !== index))} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('planning.verwijderen')}>
            <Text style={s.weg}>✕</Text>
          </Pressable>
        </View>
      ))}

      {concept ? (
        <View style={s.concept}>
          <Text style={s.conceptNaam}>{concept.code ? ingredientNaam(concept.code, taal) : concept.naam}</Text>
          <View style={s.rij}>
            <TextInput
              style={[s.veld, s.hoeveelheid]}
              value={conceptHoeveelheid}
              onChangeText={setConceptHoeveelheid}
              keyboardType="decimal-pad"
              placeholder={t('recept.hoeveelheid')}
              accessibilityLabel={t('recept.hoeveelheid')}
            />
          </View>
          <Chips opties={EENHEDEN} gekozen={[conceptEenheid]} label={(e) => t(`recept.eenheid.${e}`)} onWissel={setConceptEenheid} />
          <View style={s.rij}>
            <Pressable style={s.kleineKnop} onPress={voegIngredientToe} accessibilityRole="button">
              <Text style={s.kleineKnopTekst}>{t('recept.ingredientKlaar')}</Text>
            </Pressable>
            <Pressable style={s.kleineKnop} onPress={() => setConcept(null)} accessibilityRole="button">
              <Text style={s.kleineKnopTekst}>{t('planning.annuleer')}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={s.zoekBlok}>
          <TextInput
            style={s.veld}
            value={zoekIngr}
            onChangeText={setZoekIngr}
            placeholder={t('recept.zoekIngredient')}
            accessibilityLabel={t('recept.zoekIngredient')}
            autoCorrect={false}
          />
          {suggesties.map((k) => (
            <Pressable key={k.code ?? k.naam} style={s.suggestie} onPress={() => kiesConcept(k)} accessibilityRole="button">
              <Text style={s.suggestieTekst}>{k.code ? ingredientNaam(k.code, taal) : k.naam}</Text>
            </Pressable>
          ))}
          {toonEigenIngredient && (
            <Pressable style={s.suggestie} onPress={() => kiesConcept({ naam: zoekTekst })} accessibilityRole="button">
              <Text style={s.suggestieTekst}>{t('recept.voegIngredientToe', { naam: zoekTekst })}</Text>
            </Pressable>
          )}
        </View>
      )}

      <Text style={s.kop}>{t('recept.stappen')}</Text>
      {stappen.map((stap, index) => (
        <View key={index} style={s.stapBlok}>
          <Text style={s.stapNr}>{t('recept.stap', { n: index + 1 })}</Text>
          <View style={s.rij}>
            <TextInput
              style={[s.veld, s.stapVeld]}
              value={stap}
              onChangeText={(tekst) => setStappen((h) => h.map((x, k) => (k === index ? tekst : x)))}
              multiline
              accessibilityLabel={t('recept.stap', { n: index + 1 })}
            />
            {stappen.length > 1 && (
              <Pressable onPress={() => setStappen((h) => h.filter((_, k) => k !== index))} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('planning.verwijderen')}>
                <Text style={s.weg}>✕</Text>
              </Pressable>
            )}
          </View>
        </View>
      ))}
      <Pressable style={s.tweedeKnop} onPress={() => setStappen((h) => [...h, ''])} accessibilityRole="button">
        <Text style={s.tweedeKnopTekst}>{t('recept.stapVoeg')}</Text>
      </Pressable>

      {fouten.length > 0 && (
        <View style={s.fouten}>
          {fouten.map((f) => (
            <Text key={f} style={s.foutTekst}>
              {t(FOUTEN_KEY[f])}
            </Text>
          ))}
        </View>
      )}

      <Pressable style={s.knop} onPress={bewaar} accessibilityRole="button">
        <Text style={s.knopTekst}>{t('recept.bewaar')}</Text>
      </Pressable>

      {id && (
        <Pressable style={s.verwijderKnop} onPress={verwijder} accessibilityRole="button">
          <Text style={s.verwijderTekst}>{t('recept.verwijder')}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, gap: 10, paddingBottom: 40 },
  leegScherm: { flex: 1, padding: 16, justifyContent: 'center' },
  leeg: { color: '#777', textAlign: 'center' },
  kop: { fontWeight: '700', color: '#333', marginTop: 6 },
  veld: { borderWidth: 1.5, borderColor: KLEUR, borderRadius: 12, padding: 12, fontSize: 16, backgroundColor: '#fff' },
  hoeveelheid: { flex: 1 },
  rij: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ingrRij: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#e5e5e5' },
  ingrTekst: { fontSize: 15, flexShrink: 1 },
  weg: { color: '#b00020', fontSize: 18, fontWeight: '700', paddingHorizontal: 4 },
  concept: { backgroundColor: '#f3f8f5', borderRadius: 12, padding: 12, gap: 8, borderWidth: 1, borderColor: '#cfe3d7' },
  conceptNaam: { fontSize: 16, fontWeight: '700' },
  zoekBlok: { gap: 8 },
  suggestie: { backgroundColor: '#fff', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: KLEUR },
  suggestieTekst: { color: KLEUR, fontWeight: '600' },
  kleineKnop: { borderWidth: 1.5, borderColor: KLEUR, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  kleineKnopTekst: { color: KLEUR, fontSize: 13, fontWeight: '700' },
  stapBlok: { gap: 4 },
  stapNr: { color: '#777', fontSize: 12, fontWeight: '600' },
  stapVeld: { flex: 1, minHeight: 60, textAlignVertical: 'top' },
  tweedeKnop: { borderWidth: 1.5, borderColor: KLEUR, borderRadius: 12, padding: 12, alignItems: 'center' },
  tweedeKnopTekst: { color: KLEUR, fontWeight: '700', fontSize: 15 },
  fouten: { backgroundColor: '#fdecea', borderRadius: 10, padding: 10, gap: 4 },
  foutTekst: { color: '#b00020', fontSize: 13 },
  knop: { backgroundColor: KLEUR, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  knopTekst: { color: '#fff', fontWeight: '700', fontSize: 16 },
  verwijderKnop: { padding: 12, alignItems: 'center' },
  verwijderTekst: { color: '#b00020', fontWeight: '700' },
});
