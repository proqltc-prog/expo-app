import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { Afdeling } from '@/data/ingredienten';
import { Eenheid, Soort, STIJLEN, StijlCode } from '@/data/recept';
import { SEIZOENEN, Seizoen } from '@/data/seizoenen';
import type { Sleutel } from '@/i18n';
import {
  afdelingVanEigen,
  bewaarEigen,
  EENHEDEN,
  EigenIngredient,
  EigenRecept,
  Fout,
  GEZIN_STIJL,
  isExactBekend,
  nieuweId,
  standaardEenheid,
  SOORTEN,
  StijlKeuze,
  valideer,
  verwijderEigen,
  zoekIngredienten,
} from '@/lib/eigenrecepten';
import { normaliseer } from '@/lib/frigoSheets';
import type { LosWijziging } from '@/lib/frigo';
import { LosPopup, PopupOpties } from '@/ui/losPopup';
import { binnenKooktijd, KOOKTIJD_BEREIK, KOOKTIJD_SCHATTING_STANDAARD, KOOKTIJDEN, KooktijdCode, kooktijdSchattingen, kooktijdVan, MAX_KOOKTIJD_MIN } from '@/lib/kooktijd';
import { laadEigenRecepten, wijzigEigenRecepten } from '@/opslag/eigenRecepten';
import { laadDbRecepten } from '@/opslag/receptenbank';
import { laadGezin } from '@/opslag/sync';
import { useTaal } from '@/ui/taal';

// Recept bewerken (WEEK-192): naam, soort, kooktijd, stijl (ook de gezinsstijl), seizoen (optioneel),
// ingrediënten uit de ingrediëntenlijst van de app met hoeveelheid en eenheid, en de bereiding stap voor stap.
// Ingrediënten die nog niet bestaan, kun je handmatig toevoegen; die blijven bij het recept.
// WEEK-199: de kooktijd kies je als snel, gemiddeld of uitgebreid (met het tijdsbestek); de minuten worden vooraf
// ingevuld met de geschatte tijd uit de databank en blijven aanpasbaar tot de bovengrens van een uur.
// WEEK-200: een ingrediënt voeg je toe zoals een product op de lijst: naam ingeven, op de plus tikken (of een treffer
// kiezen) en in de popup de hoeveelheid, de eenheid en de categorie invullen. Tikken op een ingrediënt opent de popup opnieuw.
// Voor een ingrediënt uit de app liggen de eenheid en de categorie vast, zoals op de lijst en in de frigo.

const KLEUR = '#2e7d4f';

/** Een ingrediënt in het formulier; de hoeveelheid komt uit de popup en is altijd ingevuld. */
type Rij = EigenIngredient;

/** Waarvoor de popup open staat: een nieuw ingrediënt (met of zonder code) of een bestaande rij. */
type PopupDoel = { index?: number; code?: EigenIngredient['code']; naam: string };

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
  const navigation = useNavigation();

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
  const [popup, setPopup] = useState<PopupOpties | null>(null);
  const [popupDoel, setPopupDoel] = useState<PopupDoel | null>(null);
  const [alle, setAlle] = useState<EigenRecept[]>([]);
  const [gezinNaam, setGezinNaam] = useState<string | undefined>(undefined);
  const [fouten, setFouten] = useState<Fout[]>([]);
  const [bezig, setBezig] = useState(false);
  // De geschatte tijd per kooktijd: het gemiddelde van de databankrecepten; zolang die niet geladen zijn, de vaste schatting.
  const [schattingen, setSchattingen] = useState<Record<KooktijdCode, number>>(KOOKTIJD_SCHATTING_STANDAARD);

  useEffect(() => {
    laadDbRecepten()
      .then((recepten) => setSchattingen(kooktijdSchattingen(recepten.map((r) => r.kooktijdMin))))
      .catch(() => undefined);
  }, []);

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
        setRijen(r.ingredienten.map((i) => ({ ...i })));
        setStappen(r.stappen.length ? [...r.stappen] : ['']);
      }
      setGeladen(true);
    });
  }, [id]);

  // WEEK-203: de titel staat één keer, in de kop van het scherm: "Nieuw recept" of "Recept bewerken".
  useLayoutEffect(() => {
    navigation.setOptions({ title: t(bestaand ? 'recept.titelBewerk' : 'recept.titelNieuw') });
  }, [navigation, bestaand, t]);

  // De gezinsstijl heet naar de gezinsruimte; zonder naam heet hij "Ons gezin".
  const gezinLabel = gezinNaam ?? t('recept.stijlGezinZonderNaam');

  const zoekTreffers = useMemo(() => (zoek.trim() ? zoekIngredienten(zoek, taal, alle) : []), [zoek, taal, alle]);
  const kanNieuw = zoek.trim().length > 0 && !isExactBekend(zoek, zoekTreffers);

  /** Opent de popup voor een ingrediënt: met code liggen eenheid en categorie vast (zoals de lijst en de frigo), anders kies je ze. */
  const openPopup = (doel: PopupDoel, bestaande?: Rij) => {
    const code = doel.code;
    const eenheid = bestaande?.eenheid ?? standaardEenheid(code);
    const afdeling = code ? afdelingVanEigen({ code }) : bestaande?.afdeling;
    setPopupDoel(doel);
    setPopup({
      sleutel: `${doel.index ?? 'nieuw'}-${Date.now()}`,
      titel: t(doel.index === undefined ? 'recept.popupNieuw' : 'recept.popupBewerk'),
      naam: doel.naam,
      hoeveelheid: bestaande?.hoeveelheid,
      eenheid,
      afdeling: afdeling ?? 'overig',
      toonEenheid: !code,
      toonCategorie: !code,
      toonVasteCategorie: !!code,
      toonHoudbaar: false,
      eenheden: EENHEDEN,
      hoeveelheidVerplicht: true,
      accent: KLEUR,
    });
  };

  const sluitPopup = () => {
    setPopup(null);
    setPopupDoel(null);
  };

  /** De plus: een treffer die exact zo heet, telt als dat ingrediënt; anders wordt het een eigen ingrediënt. */
  const plus = () => {
    const naam = zoek.trim();
    if (!naam) return;
    const exact = zoekTreffers.find((k) => normaliseer(k.naam) === normaliseer(naam));
    openPopup(exact ? { code: exact.code, naam: exact.naam } : { naam });
  };

  const bewaarPopup = (w: LosWijziging) => {
    if (!popupDoel || w.hoeveelheid === undefined) return;
    const code = popupDoel.code;
    const eenheid = (code ? standaardEenheid(code) : w.eenheid && (EENHEDEN as readonly string[]).includes(w.eenheid) ? w.eenheid : 'g') as Eenheid;
    const afdeling: Afdeling | undefined = !code && w.afdeling !== 'overig' ? w.afdeling : undefined;
    const rij: Rij = { ...(code ? { code } : {}), naam: popupDoel.naam, hoeveelheid: w.hoeveelheid, eenheid, ...(afdeling ? { afdeling } : {}) };
    setRijen((r) => (popupDoel.index === undefined ? [...r, rij] : r.map((x, i) => (i === popupDoel.index ? rij : x))));
    setZoek('');
    sluitPopup();
  };

  const verwijderRij = (index: number) => setRijen((r) => r.filter((_, i) => i !== index));

  /** Wat een rij toont naast de naam: hoeveelheid, eenheid en categorie. */
  const rijDetail = (r: Rij) => {
    const afd = afdelingVanEigen(r);
    return `${String(r.hoeveelheid).replace('.', ',')} ${t(`recept.eenheid.${r.eenheid}`)} · ${t(`afdeling.${afd ?? 'overig'}` as Sleutel)}`;
  };

  const wijzigStap = (index: number, tekst: string) => setStappen((s) => s.map((x, i) => (i === index ? tekst : x)));

  // Een nieuwe stap alleen als de laatste ingevuld is.
  const laatsteGevuld = stappen.length > 0 && stappen[stappen.length - 1].trim().length > 0;
  const voegStapToe = () => {
    if (laatsteGevuld) setStappen((s) => [...s, '']);
  };

  // De gekozen kooktijd volgt uit de minuten; een chip vult de geschatte tijd van die kooktijd in.
  const minutenGetal = Number(minuten.trim());
  const gekozenKooktijd: KooktijdCode | undefined = minuten.trim() && binnenKooktijd(minutenGetal) ? kooktijdVan(minutenGetal) : undefined;
  const kiesKooktijd = (k: KooktijdCode) => setMinuten(String(schattingen[k]));

  const toggleStijl = (k: StijlKeuze) =>
    setStijlen((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  const toggleSeizoen = (k: Seizoen) =>
    setSeizoenen((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  const bewaar = async () => {
    if (bezig) return;
    const resultaat = valideer({ naam, soort, minuten, stijlen, seizoenen, ingredienten: rijen, stappen });
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

  const fout = (f: Fout) => (fouten.includes(f) ? <Text style={s.fout}>{t(FOUT_TEKST[f] as never, { max: MAX_KOOKTIJD_MIN })}</Text> : null);

  return (
    <ScrollView contentContainerStyle={s.scherm} keyboardShouldPersistTaps="handled">
      <Text style={s.label}>{t('recept.naam')}</Text>
      <TextInput style={s.veld} value={naam} onChangeText={setNaam} accessibilityLabel={t('recept.naam')} />
      {fout('naam')}

      <Text style={s.label}>{t('recept.soort')}</Text>
      <View style={s.rijChips}>
        {SOORTEN.map((k) => (
          <Chip key={k} tekst={t(`soort.${k}`)} actief={soort === k} onPress={() => setSoort(k)} />
        ))}
      </View>

      <Text style={s.label}>{t('recept.kooktijd')}</Text>
      <View style={s.rijChips}>
        {KOOKTIJDEN.map((k) => (
          <Chip key={k} tekst={t(`kooktijd.${k}`, KOOKTIJD_BEREIK[k])} actief={gekozenKooktijd === k} onPress={() => kiesKooktijd(k)} />
        ))}
      </View>
      <View style={s.minutenRij}>
        <TextInput
          style={[s.veld, s.minutenVeld]}
          value={minuten}
          onChangeText={setMinuten}
          keyboardType="number-pad"
          placeholder={t('recept.minuten')}
          accessibilityLabel={t('recept.minuten')}
        />
        <Text style={s.minutenHint}>{t('recept.minutenHint', { max: MAX_KOOKTIJD_MIN })}</Text>
      </View>
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
          <Pressable style={s.ingredientTekst} onPress={() => openPopup({ index: i, code: r.code, naam: r.naam }, r)} accessibilityRole="button">
            <Text style={s.ingredientNaam}>{r.naam}</Text>
            <Text style={s.ingredientDetail}>{rijDetail(r)}</Text>
          </Pressable>
          <Pressable onPress={() => verwijderRij(i)} accessibilityRole="button" accessibilityLabel={t('recept.verwijder')} hitSlop={8}>
            <Text style={s.verwijder}>✕</Text>
          </Pressable>
        </View>
      ))}
      {fout('ingredienten')}

      <View style={s.invoerRij}>
        <TextInput
          style={[s.veld, s.invoerVeld]}
          value={zoek}
          onChangeText={setZoek}
          onSubmitEditing={plus}
          returnKeyType="done"
          placeholder={t('recept.zoekIngredient')}
          accessibilityLabel={t('recept.zoekIngredient')}
          autoCorrect={false}
        />
        <Pressable style={[s.plus, !zoek.trim() && s.plusUit]} onPress={plus} accessibilityRole="button" accessibilityLabel={t('recept.ingredientPlus')}>
          <Text style={s.plusTekst}>+</Text>
        </Pressable>
      </View>
      {zoekTreffers.map((k) => (
        <Pressable key={`${k.code ?? k.naam}`} style={s.treffer} onPress={() => openPopup({ code: k.code, naam: k.naam })} accessibilityRole="button">
          <Text style={s.trefferTekst}>{k.naam}</Text>
        </Pressable>
      ))}
      {kanNieuw && (
        <Pressable style={s.treffer} onPress={() => openPopup({ naam: zoek.trim() })} accessibilityRole="button">
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

      <View style={s.knoppen}>
        <Pressable style={s.annuleer} onPress={() => router.back()} disabled={bezig} accessibilityRole="button">
          <Text style={s.annuleerTekst}>{t('recept.annuleer')}</Text>
        </Pressable>
        <Pressable style={[s.bewaar, bezig && { opacity: 0.6 }]} onPress={bewaar} disabled={bezig} accessibilityRole="button">
          <Text style={s.bewaarTekst}>{t('recept.bewaar')}</Text>
        </Pressable>
      </View>
      {bestaand && (
        <Pressable style={s.verwijderKnop} onPress={verwijder} accessibilityRole="button">
          <Text style={s.verwijderTekst}>{t('recept.verwijder')}</Text>
        </Pressable>
      )}
      <LosPopup opties={popup} onSluit={sluitPopup} onBewaar={bewaarPopup} />
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
  // WEEK-203: dezelfde maten als Kies en Mijn recepten: zijmarge 16, velden en knoppen met hoekstraal 12, chips zoals in het weekmenu.
  scherm: { padding: 16, gap: 8, paddingBottom: 48 },
  label: { fontSize: 14, fontWeight: '700', color: '#333', marginTop: 10 },
  veld: { borderWidth: 1.5, borderColor: '#ccc', borderRadius: 12, padding: 12, minHeight: 48, fontSize: 16, backgroundColor: '#fff' },
  fout: { color: '#c62828', fontSize: 13 },
  rijChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18, borderWidth: 1.5, borderColor: '#ccc', backgroundColor: '#fff', minHeight: 36, justifyContent: 'center' },
  chipActief: { backgroundColor: KLEUR, borderColor: KLEUR },
  chipTekst: { fontSize: 13, color: '#333', fontWeight: '600' },
  chipTekstActief: { color: '#fff' },
  ingredient: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e5e5', paddingVertical: 10, paddingHorizontal: 14 },
  ingredientTekst: { flex: 1, gap: 2 },
  ingredientNaam: { fontSize: 15, fontWeight: '600' },
  ingredientDetail: { fontSize: 13, color: '#5E6B63' },
  invoerRij: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  invoerVeld: { flex: 1 },
  plus: { width: 48, height: 48, borderRadius: 12, backgroundColor: KLEUR, alignItems: 'center', justifyContent: 'center' },
  plusUit: { opacity: 0.4 },
  plusTekst: { color: '#fff', fontSize: 24, fontWeight: '700', lineHeight: 28 },
  minutenRij: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  minutenVeld: { width: 96 },
  minutenHint: { flex: 1, fontSize: 13, color: '#5E6B63', lineHeight: 18 },
  verwijder: { fontSize: 18, color: '#c62828', paddingHorizontal: 6 },
  treffer: { backgroundColor: '#f4f8f5', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  trefferTekst: { fontSize: 15, color: '#2e7d4f' },
  stapRij: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  stapNummer: { width: 22, paddingTop: 12, fontWeight: '700', color: '#555', textAlign: 'center' },
  stapVeld: { flex: 1, minHeight: 44 },
  link: { color: KLEUR, fontWeight: '700', paddingVertical: 6 },
  knoppen: { flexDirection: 'row', gap: 10, marginTop: 16 },
  annuleer: { flex: 1, borderWidth: 1.5, borderColor: '#ccc', borderRadius: 12, padding: 14, minHeight: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  annuleerTekst: { color: '#444', fontWeight: '700', fontSize: 16 },
  bewaar: { flex: 2, backgroundColor: KLEUR, borderRadius: 12, padding: 14, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  bewaarTekst: { color: '#fff', fontWeight: '700', fontSize: 16 },
  verwijderKnop: { padding: 12, alignItems: 'center' },
  verwijderTekst: { color: '#c62828', fontWeight: '600' },
});
