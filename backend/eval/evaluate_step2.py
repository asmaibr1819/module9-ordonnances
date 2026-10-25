"""Évalue l'étape 2 sur etape2_llm_test.jsonl : exactitude nom / DCI / indication, validité JSON, latence.
Usage : python -m eval.evaluate_step2 [--limit 36]   (avec ANTHROPIC_API_KEY -> LLM ; sans -> mode dégradé)"""
import argparse, json, re, statistics, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app import llm

ap = argparse.ArgumentParser(); ap.add_argument("--limit", type=int, default=36); a = ap.parse_args()
rows = [json.loads(l) for l in open(Path(__file__).parent / "etape2_llm_test.jsonl", encoding="utf-8")][: a.limit]
ok = {"nom": 0, "dci": 0, "indication": 0}; total = 0; lat = []; modes = {}
for r in rows:
    texte = re.search(r'"""\n(.*?)\n"""', r["messages"][0]["content"], re.S).group(1)
    gold = json.loads(r["messages"][1]["content"])["medicaments"]
    fiche = llm.analyze(texte); lat.append(fiche.latence_ms); modes[fiche.mode] = modes.get(fiche.mode, 0) + 1
    pred = {m.nom: m for m in fiche.medicaments}
    for g in gold:
        total += 1; p = pred.get(g["nom"])
        if p: ok["nom"] += 1; ok["dci"] += p.dci == g["dci"]; ok["indication"] += p.indication == g["indication"]
print(f"échantillons : {len(rows)} | médicaments : {total} | modes : {modes}")
for k, v in ok.items(): print(f"  exactitude {k:10s}: {v/total:.1%}")
print(f"  latence médiane : {statistics.median(lat)} ms")
