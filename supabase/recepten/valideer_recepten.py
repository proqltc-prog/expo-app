#!/usr/bin/env python3
"""Controleert een batch recepten (JSON) voordat het naar de database gaat."""
import csv, json, pathlib, sys

HIER = pathlib.Path(__file__).parent
TALEN = ["nl", "fr", "de", "en", "es", "pt"]
STIJLEN = {"frans", "belgisch", "indiaas", "chinees", "thais", "japans", "koreaans", "mediterraan", "italiaans", "mexicaans", "klassiek", "aziatisch", "hartig", "zoet"}
MOMENTEN = {"ontbijt", "middag", "avond"}
SOORTEN = {"vegetarisch", "vis", "vlees"}
BASIS = {None, "pasta", "rijst", "aardappel", "brood", "wrap", "noedels", "granen"}
BEREIDING = {"oven", "pan", "wok", "slowcooker", "rauw", "geen"}
MOEILIJK = {"makkelijk", "gemiddeld", "uitdagend"}

def main(pad):
    codes = {r["code"]: r["eenheid"] for r in csv.DictReader((HIER / "ingredienten.tsv").open(encoding="utf-8"), delimiter="\t")}
    recepten = json.loads((HIER / pad).read_text(encoding="utf-8"))
    fouten = []
    slugs = set()
    for r in recepten:
        s = r["slug"]
        if s in slugs: fouten.append(f"{s}: dubbele slug")
        slugs.add(s)
        if r["stijl"] not in STIJLEN: fouten.append(f"{s}: onbekende stijl {r['stijl']}")
        if set(r["stijlen"]) - STIJLEN or r["stijl"] not in r["stijlen"]: fouten.append(f"{s}: stijlen ongeldig")
        if r["moment"] not in MOMENTEN: fouten.append(f"{s}: moment {r['moment']}")
        if r["soort"] not in SOORTEN: fouten.append(f"{s}: soort {r['soort']}")
        if r["basis"] not in BASIS: fouten.append(f"{s}: basis {r['basis']}")
        if r["bereiding"] not in BEREIDING: fouten.append(f"{s}: bereiding {r['bereiding']}")
        if r["moeilijkheid"] not in MOEILIJK: fouten.append(f"{s}: moeilijkheid {r['moeilijkheid']}")
        if set(r["titel"]) != set(TALEN) or not all(r["titel"].values()): fouten.append(f"{s}: titel mist een taal")
        if not 1 <= len(r["stappen"]) <= 8: fouten.append(f"{s}: aantal stappen {len(r['stappen'])}")
        for i, st in enumerate(r["stappen"], 1):
            if set(st["tekst"]) != set(TALEN) or not all(st["tekst"].values()): fouten.append(f"{s}: stap {i} mist een taal")
        if not r["ingredienten"]: fouten.append(f"{s}: geen ingrediënten")
        for ing in r["ingredienten"]:
            if ing["code"] not in codes: fouten.append(f"{s}: onbekende ingrediëntcode {ing['code']}")
            elif ing["e"] != codes[ing["code"]]: fouten.append(f"{s}: eenheid {ing['e']} voor {ing['code']} past niet (verwacht {codes[ing['code']]})")
            if ing["h"] <= 0: fouten.append(f"{s}: hoeveelheid <= 0 bij {ing['code']}")
    print(f"{len(recepten)} recepten, {sum(len(r['ingredienten']) for r in recepten)} ingrediëntregels")
    from collections import Counter
    print("per stijl:", dict(Counter(r["stijl"] for r in recepten)))
    if fouten:
        print("\n".join(fouten)); sys.exit(1)
    print("OK")

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "batch-01.json")
