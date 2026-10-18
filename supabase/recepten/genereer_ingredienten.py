#!/usr/bin/env python3
"""Zet ingredienten.tsv om naar SQL: nieuwe ingrediënten + vertalingen (idempotent)."""
import csv
import pathlib
import sys

HIER = pathlib.Path(__file__).parent
TALEN = ["nl", "fr", "de", "en", "es", "pt"]


def sql_str(waarde: str) -> str:
    return "'" + waarde.replace("'", "''") + "'"


def main() -> None:
    rijen = list(csv.DictReader((HIER / "ingredienten.tsv").open(encoding="utf-8"), delimiter="\t"))
    codes = [r["code"] for r in rijen]
    if len(codes) != len(set(codes)):
        sys.exit("Dubbele ingrediëntcode in ingredienten.tsv")
    for r in rijen:
        if r["eenheid"] not in {"g", "ml", "stuk", "teentje"}:
            sys.exit(f"Ongeldige eenheid bij {r['code']}")

    regels = ["-- Gegenereerd door genereer_ingredienten.py. Niet met de hand aanpassen."]
    regels.append("insert into ingredienten (code, eenheid, categorie, soort) values")
    regels.append(
        ",\n".join(
            f"  ({sql_str(r['code'])}, {sql_str(r['eenheid'])}, {sql_str(r['categorie'])}, {sql_str(r['soort'])})"
            for r in rijen
        )
    )
    regels.append("on conflict (code) do nothing;")
    regels.append("")
    regels.append("insert into ingredient_vertalingen (ingredient_id, taal, naam)")
    regels.append("select i.id, v.taal, v.naam from (values")
    waarden = []
    for r in rijen:
        for taal in TALEN:
            waarden.append(f"  ({sql_str(r['code'])}, {sql_str(taal)}, {sql_str(r[taal])})")
    regels.append(",\n".join(waarden))
    regels.append(") as v(code, taal, naam)")
    regels.append("join ingredienten i on i.code = v.code")
    regels.append("on conflict (ingredient_id, taal) do nothing;")
    uit = HIER / "ingredienten.sql"
    uit.write_text("\n".join(regels) + "\n", encoding="utf-8")
    print(f"{len(rijen)} ingrediënten -> {uit}")


if __name__ == "__main__":
    main()
