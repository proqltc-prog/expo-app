import { ComponentProps, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { alleenHuidigPlan, bewerkLijstItem, eigenItem, hernoemLijst, LijstItem, LijstRegel, LijstSectie, magBewerken, opSheet, planSleutel, receptItem, secties as maakSecties, sectieKeuze, staatOpLijst, telRegels, vinkAf, voornaam, Weergave } from '@/lib/lijst';
import { eenheidVan } from '@/data/ingredienten';
import { CatalogusItem, Sheet, sheetThema, voegLosToe } from '@/lib/frigoSheets';
import { inTaal } from '@/lib/planner/vertaal';
import { FrigoItem, LosWijziging } from '@/lib/frigo';
import type { DagCode, Weekplan } from '@/lib/planner/types';
import { gerechtDetails, VOEDINGSSTOFFEN } from '@/lib/planner/gerecht';
import { laadFrigo } from '@/opslag/frigo';
import { bewaarWeergave, laadLijst, laadWeergave, wijzigLijst } from '@/opslag/lijst';
import { bijWijziging, Gezin, laadGezin, syncStatus, SyncStatus } from '@/opslag/sync';
import { pasFrigoAan } from '@/lib/frigo';
import { wijzigFrigo } from '@/opslag/frigo';
import { werkOntbrekendBij } from '@/lib/planner/status';
import { laadPlan, wijzigPlan } from '@/opslag/plan';
import { categorieNaam, dagSleutel, getal, hoeveelheidTekst, Sleutel } from '@/i18n';
import { useTaal } from '@/ui/taal';
import { WinkelVoorstel } from '@/ui/winkelvoorstel';
import { Ionicons } from '@expo/vector-icons';
import { BOODSCHAPPEN_ICOON, categorieIcoon, SCANNER_ICOON, WINKEL_ICOON } from '@/lib/lijstIcoon';
import { wisselGroep, zichtbareRegels } from '@/lib/groepen';
import { LosPopup, PopupOpties } from '@/ui/losPopup';
import { ProductInvoer } from '@/ui/productInvoer';
import { SheetSchakelaar } from '@/ui/sheetSchakelaar';
import { SectieKop } from '@/ui/sectieKop';
import { usePaginaInfo } from '@/ui/paginaInfo';

const KLEUR = '#2e7d4f';
// Het thema van de frigo en het weekmenu: petrol voor de winkels, oranje voor de boodschappen (WEEK-76).
const PETROL = '#0F6B66';
const ORANJE = '#E8680F';
const ORANJE_ZACHT = '#FDE8D6';
const MIST = '#EEF1EC';
const MUTED = '#5E6B63';

type Hoofd = 'winkels' | 'boodschappen';
type IoniconNaam = ComponentProps<typeof Ionicons>['name'];

/** Totaal voeding en additieven van een gerecht, zodra alle producten gescand zijn (WEEK-50). */
function GerechtRegel({ lijst, frigo, dag, recept }: { lijst: LijstItem[]; frigo: FrigoItem[]; dag: DagCode; recept: string }) {
  const { t, taal } = useTaal();
  const d = gerechtDetails(lijst, frigo, dag, recept);
  if (!d) return null;
  const waarden = VOEDINGSSTOFFEN.flatMap((n) => {
    const v = d.totaal[n];
    return v === undefined ? [] : [`${t(`voeding.${n}` as Sleutel)} ${getal(taal, v)} ${n === 'kcal' ? 'kcal' : 'g'}`];
  });
  return (
    <View style={s.gerecht}>
      <Text style={s.gerechtTitel}>{t('gerecht.totaal')}</Text>
      {waarden.length > 0 && <Text style={s.gerechtTekst}>{waarden.join(' · ')}</Text>}
      <Text style={s.gerechtTekst}>
        {t('gerecht.additieven')}: {d.additieven.length ? d.additieven.join(', ') : t('scan.geenAdditieven')}
      </Text>
      {d.nietBerekend.length > 0 && <Text style={s.gerechtKlein}>{t('gerecht.nietBerekend', { namen: d.nietBerekend.join(', ') })}</Text>}
    </View>
  );
}

export default function Lijst() {
  const { t, taal } = useTaal();
  // WEEK-177: uitleg via een infoknop rechtsboven in de koptekst; de tekst geldt voor beide tabbladen.
  const { popup } = usePaginaInfo({ tekst: t('pagina.lijstInfo'), kleur: ORANJE, infoLabel: t('pagina.infoKnop'), sluitLabel: t('pagina.sluiten') });
  const [items, setItems] = useState<LijstItem[]>([]);
  // WEEK-138: enkel recepten van het huidige weekplan horen op de lijst.
  const [plan, setPlan] = useState<Weekplan | null>(null);
  const [frigo, setFrigo] = useState<FrigoItem[]>([]);
  const [weergave, setWeergave] = useState<Weergave>('recept');
  // Welke groepen open staan (WEEK-124); standaard is alles ingeklapt.
  const [uitgeklapt, setUitgeklapt] = useState<Set<string>>(new Set());
  // Hoofdtabbladen: winkels (voorstel) of de boodschappen zelf. Standaard de boodschappen.
  const [hoofd, setHoofd] = useState<Hoofd>('boodschappen');
  const [gezin, setGezin] = useState<Gezin | null>(null);
  const [status, setStatus] = useState<SyncStatus>(syncStatus());
  // Tabbladen Recepten (weekplanner + gekozen databankproducten) en Losse producten (WEEK-182).
  const [sheet, setSheet] = useState<Sheet>('planner');
  // De popup voor een los product: nieuw (bewerkId leeg) of wijzigen van het item met dat id.
  const [losPopup, setLosPopup] = useState<PopupOpties | null>(null);
  const [bewerkId, setBewerkId] = useState<string | null>(null);

  useEffect(() => {
    laadWeergave().then(setWeergave);
  }, []);

  // Gedeelde lijst (WEEK-17): met wie en onder welke naam.
  useEffect(() => {
    laadGezin().then(setGezin);
    const stop = [
      bijWijziging('gezin', () => laadGezin().then(setGezin)),
      bijWijziging('status', () => setStatus(syncStatus())),
    ];
    return () => stop.forEach((f) => f());
  }, []);
  const ikNaam = gezin?.ikNaam;

  // Live: een ander gezinslid vinkte iets af of voegde iets toe (WEEK-8).
  useEffect(() => bijWijziging('lijst', () => laadLijst().then(setItems)), []);
  useEffect(() => bijWijziging('plan', () => laadPlan().then(setPlan)), []);
  useEffect(() => {
    laadPlan().then(setPlan);
  }, []);
  useEffect(() => bijWijziging('frigo', () => laadFrigo().then(setFrigo)), []);

  useFocusEffect(
    useCallback(() => {
      laadLijst().then(setItems);
      laadPlan().then(setPlan);
      laadFrigo().then(setFrigo);
    }, [])
  );

  // Meteen tonen, en daarna de versie uit de opslag (die ook wijzigingen van het gezin bevat).
  const wijzig = (wijziging: (items: LijstItem[]) => LijstItem[]) => {
    setItems(wijziging);
    wijzigLijst(wijziging).then(setItems);
  };

  // Recepten-tabblad: een product uit de productdatabank met de hoeveelheid; de eenheid is vast (WEEK-182).
  const voegReceptToe = (item: CatalogusItem, hoeveelheid: number | undefined) => {
    wijzig((huidig) => receptItem(huidig, { code: item.code, naam: item.naam, afdeling: item.afdeling, eenheid: eenheidVan(item.code) }, new Date(), hoeveelheid, ikNaam));
  };

  // + bij een losse naam: eerst de popup met hoeveelheid, eenheid en categorie.
  const openNieuwLos = (naam: string) => {
    setBewerkId(null);
    setLosPopup({ sleutel: `nieuw-${Date.now()}`, titel: t('frigo.toevoegenKop'), naam, afdeling: 'overig', toonEenheid: true, toonCategorie: true, toonHoudbaar: false });
  };

  // Potloodje: enkel items die de gebruiker zelf toevoegde. Een databankproduct houdt zijn eenheid.
  const openBewerk = (regel: LijstRegel) => {
    const item = items.find((i) => i.id === regel.ids[0]);
    if (!item) return;
    setBewerkId(item.id);
    setLosPopup({
      sleutel: `bewerk-${item.id}-${Date.now()}`,
      titel: t('frigo.bewerkKop'),
      naam: item.naam,
      hoeveelheid: item.hoeveelheid,
      eenheid: item.eenheid,
      afdeling: item.afdeling ?? 'overig',
      toonEenheid: !item.code,
      toonCategorie: !item.code,
      toonHoudbaar: false,
    });
  };

  const bewaarLos = (w: LosWijziging) => {
    const opties = losPopup;
    const id = bewerkId;
    setLosPopup(null);
    setBewerkId(null);
    if (!opties) return;
    if (id) {
      wijzig((huidig) => bewerkLijstItem(huidig, id, { hoeveelheid: w.hoeveelheid, eenheid: w.eenheid, afdeling: w.afdeling === 'overig' ? undefined : w.afdeling }));
      return;
    }
    const nu = new Date();
    const extra = { hoeveelheid: w.hoeveelheid, eenheid: w.eenheid, afdeling: w.afdeling === 'overig' ? undefined : w.afdeling };
    const item = eigenItem(opties.naam, nu, ikNaam, extra);
    if (!item) return;
    wijzig((huidig) => [...huidig, item]);
    // Zoals vroeger: een los product van de lijst komt ook in de losse producten van de frigo.
    void wijzigFrigo((f) => voegLosToe(f, item.naam, nu, extra));
  };

  // Enkel eigen items: alle onderliggende items moeten door de gebruiker zijn toegevoegd.
  const bewerkbaar = (regel: LijstRegel) =>
    regel.ids.every((id) => {
      const i = items.find((x) => x.id === id);
      return !!i && magBewerken(i);
    });

  const verwijder = (regel: LijstRegel) => wijzig((huidig) => huidig.filter((i) => !regel.ids.includes(i.id)));

  const kiesWeergave = (w: Weergave) => {
    setWeergave(w);
    bewaarWeergave(w);
  };

  // Een regel kan uit meerdere items bestaan; afvinken geldt voor alle onderliggende items.
  // Afvinken = gekocht: het product gaat in de frigo; het vinkje weghalen haalt het er weer uit (WEEK-18).
  const toggle = async (regel: LijstRegel) => {
    const afgevinkt = !regel.afgevinkt;
    setItems((huidig) => vinkAf(huidig, regel.ids, afgevinkt, ikNaam));
    let onderliggend: LijstItem[] = [];
    const nieuw = await wijzigLijst((huidig) => {
      onderliggend = huidig.filter((i) => regel.ids.includes(i.id));
      return vinkAf(huidig, regel.ids, afgevinkt, ikNaam);
    });
    setItems(nieuw);
    const frigo = await wijzigFrigo((f) => pasFrigoAan(f, onderliggend, afgevinkt, new Date()));
    // Opnieuw gekocht: een ontbrekend ingrediënt is er weer (WEEK-13).
    if (afgevinkt) await wijzigPlan((plan) => werkOntbrekendBij(plan, frigo));
  };

  // Het selectievakje naast een rubriek of recept (WEEK-111): alle regels van de sectie samen.
  // Enkel de items die echt van stand veranderen gaan naar of uit de frigo.
  const toggleSectie = async (regels: LijstRegel[]) => {
    const { afgevinkt, ids } = sectieKeuze(regels);
    setItems((huidig) => vinkAf(huidig, ids, afgevinkt, ikNaam));
    let onderliggend: LijstItem[] = [];
    const nieuw = await wijzigLijst((huidig) => {
      onderliggend = huidig.filter((i) => ids.includes(i.id) && i.afgevinkt !== afgevinkt);
      return vinkAf(huidig, ids, afgevinkt, ikNaam);
    });
    setItems(nieuw);
    const frigoNieuw = await wijzigFrigo((f) => pasFrigoAan(f, onderliggend, afgevinkt, new Date()));
    if (afgevinkt) await wijzigPlan((plan) => werkOntbrekendBij(plan, frigoNieuw));
  };

  // WEEK-154: de titel van een weekmenu-recept volgt de gekozen taal; de opgeslagen naam blijft de sleutel.
  useEffect(() => {
    if (!plan) return;
    void wijzigLijst((huidig) => hernoemLijst(huidig, plan.dagen, taal, planSleutel(plan)));
  }, [plan, taal]);

  const titel = (sectie: LijstSectie) => {
    if (sectie.soort === 'recept') {
      const recept = plan?.dagen.find((d) => d.dag === sectie.dag && d.recept.naam === sectie.recept)?.recept;
      return t('lijst.receptTitel', { dag: t(dagSleutel(sectie.dag)), recept: recept ? inTaal(recept, taal).naam : sectie.recept });
    }
    if (sectie.soort === 'afdeling') return t(`afdeling.${sectie.afdeling}` as Sleutel);
    return categorieNaam(taal, sectie.categorie);
  };

  const zichtbaar = useMemo(() => alleenHuidigPlan(items, plan), [items, plan]);
  // Het tabblad bepaalt welke items op het scherm komen; de teller en groepen volgen het tabblad.
  const sheetLijst = sheet === 'planner' ? 'recept' : 'los';
  const sheetItems = useMemo(() => opSheet(zichtbaar, sheetLijst), [zichtbaar, sheetLijst]);
  // WEEK-144: receptgroepen in de volgorde van het weekplan, niet op weekdag.
  const dagVolgorde = useMemo(() => plan?.dagen.map((d) => d.dag), [plan]);
  const data = useMemo(
    () => maakSecties(sheetItems, weergave, dagVolgorde).map((sectie) => ({ ...sectie, title: titel(sectie), data: zichtbareRegels(sectie.regels, sectie.sleutel, uitgeklapt) })),
    // titel() gebruikt de taal en het plan; daarom staan die in de afhankelijkheden
    [sheetItems, weergave, dagVolgorde, taal, plan, uitgeklapt]
  );

  // WEEK-137: de teller is de som van de tellers per recept of categorie in de huidige weergave.
  const { open, totaal } = useMemo(() => telRegels(maakSecties(sheetItems, weergave, dagVolgorde)), [sheetItems, weergave, dagVolgorde]);

  const hoofdTabs = (['winkels', 'boodschappen'] as const).map((h) => {
    const aan = hoofd === h;
    const kleur = h === 'winkels' ? PETROL : ORANJE;
    return (
      <Pressable
        key={h}
        style={[s.hoofdTab, aan && s.hoofdTabAan]}
        onPress={() => setHoofd(h)}
        accessibilityRole="tab"
        accessibilityState={{ selected: aan }}
      >
        <Ionicons name={(h === 'winkels' ? WINKEL_ICOON : BOODSCHAPPEN_ICOON) as IoniconNaam} size={18} color={aan ? kleur : MUTED} />
        {/* WEEK-111: het label wordt volledig getoond; past het niet, dan wordt het kleiner in plaats van afgekapt. */}
        <Text
          style={[s.hoofdTekst, aan && { color: kleur }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {t(h === 'winkels' ? 'lijst.tabWinkels' : 'lijst.tabBoodschappen')}
        </Text>
        {h === 'boodschappen' && (
          <View style={[s.teller, aan && { backgroundColor: kleur, borderColor: kleur }]}>
            <Text style={[s.tellerTekst, aan && { color: '#fff' }]}>{open}</Text>
          </View>
        )}
      </Pressable>
    );
  });

  return (
    <View style={s.scherm}>
      {popup}
      <View style={s.hoofdSchakelaar} accessibilityRole="tablist">
        {hoofdTabs}
      </View>

      {hoofd === 'winkels' ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          <WinkelVoorstel items={zichtbaar} />
        </ScrollView>
      ) : (
        <>
          {/* WEEK-182: dezelfde werkwijze als de frigo: schakelaar, zoeken of invoer, en de popup voor losse producten. */}
          <LosPopup
            opties={losPopup}
            onSluit={() => {
              setLosPopup(null);
              setBewerkId(null);
            }}
            onBewaar={bewaarLos}
          />
          <SheetSchakelaar
            sheet={sheet}
            onKies={setSheet}
            labels={{ planner: t('frigo.sheetPlanner'), los: t('frigo.sheetLos') }}
            aantallen={{ planner: opSheet(zichtbaar, 'recept').length, los: opSheet(zichtbaar, 'los').length }}
          />
          <View style={[s.streep, { backgroundColor: sheetThema(sheet).accent }]} />
          <ProductInvoer
            sheet={sheet}
            accent={sheetThema(sheet).accent}
            accentZacht={sheetThema(sheet).accentZacht}
            staatOp={(code) => staatOpLijst(items, code)}
            onReceptKies={voegReceptToe}
            onLosPlus={openNieuwLos}
          />

          {/* Groeperen per recept of per categorie. */}
          <View style={s.groepering} accessibilityRole="tablist">
            {(['categorie', 'recept'] as Weergave[]).map((w) => {
              const aan = weergave === w;
              return (
                <Pressable
                  key={w}
                  style={[s.pil, aan && s.pilAan]}
                  onPress={() => kiesWeergave(w)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: aan }}
                >
                  <Text style={[s.pilTekst, aan && s.pilTekstAan]}>
                    {t(w === 'recept' ? 'lijst.perRecept' : 'lijst.perCategorie')}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {gezin && (
            <Text style={[s.gedeeld, status === 'offline' && s.offline]}>
              {t('lijst.gedeeld', { status: t(`gezin.status.${status}` as Sleutel) })}
            </Text>
          )}
          <Text style={s.teller}>
            {totaal ? t('lijst.teller', { open, totaal }) : t('lijst.leeg')}
          </Text>
          <SectionList
            sections={data}
            keyExtractor={(r, i) => `${r.sleutel}-${i}`}
            renderSectionHeader={({ section }) => {
              const alles = section.regels.length > 0 && section.regels.every((r) => r.afgevinkt);
              return (
                <View>
                  <View style={s.sectieRij}>
                    {/* Tikken op de titel klapt de groep open of dicht, met de teller van de items (WEEK-124). */}
                    <SectieKop
                      icoon={section.soort === 'categorie' ? <Ionicons name={categorieIcoon(section.categorie) as IoniconNaam} size={18} color={KLEUR} /> : undefined}
                      titel={section.title}
                      aantal={section.regels.length}
                      open={uitgeklapt.has(section.sleutel)}
                      kleur={KLEUR}
                      label={section.title}
                      onPress={() => setUitgeklapt((o) => wisselGroep(o, section.sleutel))}
                    />
                    {/* Selectievakje (WEEK-111): vinkt alle ingrediënten van deze rubriek of dit recept samen af. */}
                    <Pressable
                      style={[s.vinkje, alles && s.vinkjeAan]}
                      onPress={() => toggleSectie(section.regels)}
                      hitSlop={8}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: alles }}
                      accessibilityLabel={`${t('lijst.selecteerSectie')}: ${section.title}`}
                    >
                      {alles && <Text style={s.vinkjeTekst}>✓</Text>}
                    </Pressable>
                  </View>
                  {section.soort === 'recept' && <GerechtRegel lijst={zichtbaar} frigo={frigo} dag={section.dag} recept={section.recept} />}
                </View>
              );
            }}
            renderItem={({ item }) => (
              <Pressable style={s.item} onPress={() => toggle(item)}>
                <View style={[s.vinkje, item.afgevinkt && s.vinkjeAan]}>
                  {item.afgevinkt && <Text style={s.vinkjeTekst}>✓</Text>}
                </View>
                <View style={s.tekstBlok}>
                  <Text style={[s.naam, item.afgevinkt && s.doorgehaald]}>{item.naam}</Text>
                  {weergave === 'categorie' && item.recepten.length > 0 && (
                    <Text style={s.recepten} numberOfLines={1}>{item.recepten.join(' · ')}</Text>
                  )}
                  {gezin && item.door && !item.afgevinkt && <Text style={s.recepten}>{t('lijst.door', { naam: voornaam(item.door) })}</Text>}
                  {gezin && item.afgevinkt && item.afgevinktDoor.length > 0 && (
                    <Text style={s.gekocht}>{t('lijst.gekochtDoor', { naam: item.afgevinktDoor.map(voornaam).join(', ') })}</Text>
                  )}
                </View>
                {item.hoeveelheid ? (
                  <Text style={[s.hoeveelheid, item.afgevinkt && s.doorgehaald]}>
                    {hoeveelheidTekst(taal, item.hoeveelheid, item.eenheid)}
                  </Text>
                ) : null}
                {/* Wijzigen en verwijderen enkel voor eigen items (WEEK-182). Het potlood enkel bij één item. */}
                {!item.afgevinkt && bewerkbaar(item) && item.ids.length === 1 && (
                  <Pressable
                    style={s.actieKnop}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      openBewerk(item);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('frigo.bewerkNaam', { naam: item.naam })}
                  >
                    <Ionicons name={'pencil-outline' as IoniconNaam} size={18} color={MUTED} />
                  </Pressable>
                )}
                {bewerkbaar(item) && (
                  <Pressable
                    style={s.actieKnop}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      verwijder(item);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('lijst.verwijderNaam', { naam: item.naam })}
                  >
                    <Ionicons name={'close' as IoniconNaam} size={18} color={MUTED} />
                  </Pressable>
                )}
                {/* Per product scannen (WEEK-70): het gescande product gaat enkel naar deze regel. */}
                {!item.afgevinkt && (
                  <Pressable
                    style={s.scanKnop}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      router.navigate(`/scan?van=lijst&lijstItem=${encodeURIComponent(item.ids.join(','))}`);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('lijst.scanProduct')}
                  >
                    <Ionicons name={SCANNER_ICOON as IoniconNaam} size={20} color="#2e7d4f" />
                  </Pressable>
                )}
              </Pressable>
            )}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={{ paddingBottom: 32 }}
          />
          {zichtbaar.some((i) => i.afgevinkt) && (
            <Pressable style={s.wis} onPress={() => wijzig((huidig) => huidig.filter((i) => !i.afgevinkt))}>
              <Text style={{ color: ORANJE, fontWeight: '600' }}>{t('lijst.wissen')}</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  scherm: { flex: 1, paddingHorizontal: 16 },
  hoofdSchakelaar: { flexDirection: 'row', backgroundColor: MIST, borderRadius: 18, padding: 5, marginTop: 12 },
  hoofdTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 14 },
  hoofdTabAan: { backgroundColor: '#fff', shadowColor: '#17201A', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  hoofdTekst: { color: MUTED, fontWeight: '700', fontSize: 15, flexShrink: 1 },
  teller: { color: '#666', marginVertical: 10 },
  tellerTekst: { fontSize: 12, fontWeight: '700', color: MUTED },
  // WEEK-176: de pillen mogen op een smal scherm onder elkaar komen in plaats van af te snijden.
  groepering: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  pil: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 13, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E4E8E1' },
  pilAan: { backgroundColor: ORANJE_ZACHT, borderColor: 'transparent' },
  pilTekst: { color: '#17201A', fontWeight: '600', fontSize: 14 },
  pilTekstAan: { color: ORANJE },
  scanKnop: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#eef6f1', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  scanKnopTekst: { fontSize: 17 },
  streep: { height: 4, borderRadius: 2, marginTop: 10 },
  actieKnop: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  gedeeld: { color: KLEUR, fontSize: 13, marginTop: 10 },
  offline: { color: '#7a5b00' },
  gekocht: { fontSize: 12, color: KLEUR, marginTop: 2 },
  kop: { fontWeight: '700', fontSize: 14, color: '#444', marginTop: 14, marginBottom: 4 },
  sectieRij: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 14, marginBottom: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  vinkje: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: ORANJE, alignItems: 'center', justifyContent: 'center' },
  vinkjeAan: { backgroundColor: ORANJE },
  vinkjeTekst: { color: '#fff', fontWeight: '700' },
  tekstBlok: { flex: 1 },
  naam: { fontSize: 16 },
  recepten: { fontSize: 12, color: '#999', marginTop: 2 },
  hoeveelheid: { fontSize: 14, color: '#777' },
  doorgehaald: { textDecorationLine: 'line-through', color: '#aaa' },
  wis: { alignItems: 'center', padding: 12 },
  gerecht: { backgroundColor: '#f4faf6', borderRadius: 10, padding: 10, gap: 4, marginBottom: 6 },
  gerechtTitel: { fontWeight: '700', fontSize: 13, color: KLEUR },
  gerechtTekst: { fontSize: 13, color: '#444' },
  gerechtKlein: { fontSize: 12, color: '#888' },
});
