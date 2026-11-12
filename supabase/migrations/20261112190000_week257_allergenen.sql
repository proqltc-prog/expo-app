-- WEEK-257: ontbrekende allergenen aanvullen (14 EU-allergenen). Streng: bij kant-en-klare producten de allergenen
-- van de gangbare producten (bv. bouillon: selderij en gluten). Pinda apart van noten. Enkel de kolom allergenen.
-- Ingrediënten die hier niet staan, hebben geen allergenen (groenten, fruit, vlees, kruiden, …) en blijven ongewijzigd.
-- Terugdraaien: de vorige waarden staan in de Confluence-pagina van WEEK-257 niet apart; bij twijfel per ingrediënt
-- `update public.ingredienten set allergenen = '{...}' where code = '...'`.
update public.ingredienten i set allergenen = a.allergenen
from (values
  -- sauzen, bouillons, azijn en wijn
  ('appelazijn', '{sulfiet}'::text[]), ('atjar', '{sulfiet}'), ('augurken', '{mosterd,sulfiet}'), ('balsamicoazijn', '{sulfiet}'),
  ('bouillonblokje', '{gluten,selderij}'), ('dashi', '{vis}'), ('doenjang', '{soja,gluten}'), ('doubanjiang', '{soja,gluten}'),
  ('gochujang', '{gluten,soja}'), ('groene_pepersaus', '{melk}'), ('groentebouillon', '{selderij,gluten}'),
  ('hoisinsaus', '{soja,gluten,sesam}'), ('jus', '{gluten,selderij}'), ('kappertjes', '{sulfiet}'), ('ketjap', '{soja,gluten}'),
  ('kippenbouillon', '{selderij,gluten}'), ('mangochutney', '{sulfiet}'), ('mayonaise', '{ei,mosterd}'),
  ('mierikswortel', '{ei,sulfiet}'), ('mirin', '{sulfiet}'), ('miso', '{soja,gluten}'), ('mosterd', '{mosterd,sulfiet}'),
  ('oestersaus', '{weekdieren,soja,gluten}'), ('pesto', '{melk,noten}'), ('pesto_rosso', '{melk,noten}'),
  ('pindakaas', '{pinda}'), ('rijstazijn', '{sulfiet}'), ('shaoxing_wijn', '{gluten,sulfiet}'), ('sojasaus', '{soja,gluten}'),
  ('tahin', '{sesam}'), ('tapenade', '{sulfiet}'), ('teriyakisaus', '{soja,gluten}'), ('tonkatsusaus', '{gluten,soja}'),
  ('visfond', '{vis,selderij}'), ('vissaus', '{vis}'), ('vleesfond', '{selderij}'), ('wijnazijn', '{sulfiet}'),
  ('witte_wijn', '{sulfiet}'), ('woksaus', '{soja,sesam,gluten}'), ('worcestershiresaus', '{vis,gluten,sulfiet}'),
  ('zwarte_bonen_gefermenteerd', '{soja}'),
  -- ei en eiwitten
  ('eieren', '{ei}'), ('aburaage', '{soja}'), ('hazelnootburger', '{noten,gluten}'), ('tempeh', '{soja}'), ('tofu', '{soja}'),
  ('vegetarisch_gehakt', '{soja,gluten}'), ('vegetarische_balletjes', '{soja,gluten}'), ('vegetarische_kipstukjes', '{soja,gluten}'),
  -- granen en deeg
  ('beschuit', '{gluten}'), ('bladerdeeg', '{gluten,melk}'), ('brood', '{gluten}'), ('bulgur', '{gluten}'), ('couscous', '{gluten}'),
  ('gnocchi', '{gluten}'), ('granola', '{gluten,noten}'), ('havermout', '{gluten}'), ('lasagnebladen', '{gluten,ei}'),
  ('macaroni', '{gluten}'), ('muesli', '{gluten,noten}'), ('naan', '{gluten,melk}'), ('noedels', '{gluten,ei}'),
  ('noedels_eier', '{gluten,ei}'), ('orzo', '{gluten}'), ('paneermeel', '{gluten}'), ('panko', '{gluten}'), ('pasta', '{gluten}'),
  ('pasta_penne', '{gluten}'), ('pasta_spaghetti', '{gluten}'), ('pistolet', '{gluten}'), ('platbrood', '{gluten}'),
  ('sobanoedels', '{gluten}'), ('taartdeeg', '{gluten,melk}'), ('tortilla_wrap', '{gluten}'), ('udonnoedels', '{gluten}'),
  ('zelfrijzend_bakmeel', '{gluten}'), ('bloem', '{gluten}'), ('mariabiscuit', '{gluten}'),
  -- groenten en kruiden
  ('aardappelpuree', '{melk}'), ('kimchi', '{vis,schaaldieren}'), ('knolselderij', '{selderij}'), ('selderij', '{selderij}'),
  ('soepgroenten', '{selderij}'), ('nasigroente', '{selderij}'), ('zilveruitjes', '{sulfiet}'), ('zongedroogde_tomaten', '{sulfiet}'),
  ('currymix', '{gluten,soja}'), ('mosterdzaad', '{mosterd}'),
  -- noten, zaden en zoet
  ('gemengde_noten', '{noten}'), ('gojibessenmix', '{noten}'), ('hazelnoten', '{noten}'), ('macadamianoten', '{noten}'),
  ('notenmix', '{noten}'), ('pecannoten', '{noten}'), ('pistachenoten', '{noten}'), ('amandelen', '{noten}'),
  ('cashewnoten', '{noten}'), ('walnoten', '{noten}'), ('pinda', '{pinda}'), ('chocolade_pure', '{soja}'),
  ('sesamzaad', '{sesam}'), ('zaatar', '{sesam}'), ('hummus', '{sesam}'), ('falafel', '{gluten,sesam}'),
  -- specerijen en pasta's
  ('currypasta', '{schaaldieren}'), ('currypoeder', '{mosterd,selderij}'), ('hacheekruiden', '{gluten,selderij}'),
  ('tandoori_pasta', '{mosterd}'), ('tom_kha_pasta', '{vis}'),
  -- dranken en overig
  ('bier', '{gluten}'), ('garnalenpasta', '{schaaldieren}'), ('marsala', '{sulfiet}'), ('rode_wijn', '{sulfiet}'), ('sake', '{sulfiet}'),
  -- vetten
  ('minarine', '{melk,soja}'), ('sesamolie', '{sesam}'),
  -- peulvruchten
  ('edamame', '{soja}'),
  -- vis, schaal- en weekdieren
  ('ansjovis', '{vis}'), ('garnalen', '{schaaldieren}'), ('gerookte_makreel', '{vis}'), ('gerookte_zalm', '{vis}'),
  ('inktvis', '{weekdieren}'), ('kabeljauw', '{vis}'), ('mosselen', '{weekdieren}'), ('rivierkreeftjes', '{schaaldieren}'),
  ('scampi', '{schaaldieren}'), ('tong', '{vis}'), ('tonijn', '{vis}'), ('tonijn_blik', '{vis}'), ('vissticks', '{vis,gluten}'),
  ('witvis', '{vis}'), ('zalm', '{vis}'), ('zalm_blik', '{vis}'), ('zeevruchten', '{schaaldieren,weekdieren}'),
  -- zuivel (plantaardige dranken: hun eigen allergeen)
  ('amandelmelk', '{noten}'), ('haverdrink', '{gluten}'), ('kwark_plantaardig', '{soja}'),
  ('boter', '{melk}'), ('brie', '{melk}'), ('burrata', '{melk}'), ('camembert', '{melk}'), ('cheddar', '{melk}'),
  ('creme_fraiche', '{melk}'), ('feta', '{melk}'), ('geitenkaas', '{melk}'), ('gorgonzola', '{melk}'), ('halloumi', '{melk}'),
  ('kaas_geraspt', '{melk}'), ('kaas_gruyere', '{melk}'), ('kaas_parmezaan', '{melk}'), ('karnemelk', '{melk}'), ('kwark', '{melk}'),
  ('mascarpone', '{melk}'), ('melk', '{melk}'), ('mozzarella', '{melk}'), ('paneer', '{melk}'), ('pecorino', '{melk}'),
  ('reblochon', '{melk}'), ('ricotta', '{melk}'), ('room', '{melk}'), ('roomkaas', '{melk}'), ('skyr', '{melk}'), ('yoghurt', '{melk}'),
  ('zuivelspread_knoflook', '{melk}'), ('zuivelspread_spinazie_avocado', '{melk}'), ('zure_room', '{melk}')
) as a(code, allergenen)
where i.code = a.code and i.allergenen is distinct from a.allergenen;
