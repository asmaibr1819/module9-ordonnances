"""Évalue l'étape 1 (image -> texte) : compare tesseract / vlm / lora sur un jeu de test.
Métriques :
  - CER  : taux d'erreur de caractères (sans accents ni majuscules), plus bas = mieux
  - rappel médicaments : part des médicaments de l'étiquette retrouvés après lecture + rapprochement référentiel
  - latence médiane par image
Usage : python -m eval.evaluate_step1 --set difficile --engine tesseract [--limit 60]
        sets : facile (36 images) | difficile (60 images)"""
import argparse, json, statistics, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from app import ocr, llm
from app.referential import _norm

def lev(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]

def cer(pred: str, gold: str) -> float:
    p, g = " ".join(_norm(pred).split()), " ".join(_norm(gold).split())
    return lev(p, g) / max(1, len(g))

ap = argparse.ArgumentParser()
ap.add_argument("--set", choices=["facile", "difficile"], default="difficile")
ap.add_argument("--engine", choices=["tesseract", "vlm", "lora"], default="tesseract")
ap.add_argument("--limit", type=int, default=100)
a = ap.parse_args()
base = ROOT / "data" / f"test_{a.set}"
rows = [json.loads(l) for l in open(base / "etape1_vision_all.jsonl", encoding="utf-8") if l.strip()][: a.limit]
cers, lats, hit, tot, fails = [], [], 0, 0, 0
for r in rows:
    gold = json.load(open(base / "labels" / f"{r['id']}.json", encoding="utf-8"))
    try:
        txt, _, ms = ocr.read_image((base / r["image"]).read_bytes(), a.engine)
    except Exception as e:
        fails += 1; txt, ms = "", 0
        if fails == 1: print(f"[erreur moteur {a.engine}] {type(e).__name__}: {e}")
        if isinstance(e, (NotImplementedError, ImportError)): sys.exit(1)
    lats.append(ms); cers.append(cer(txt, gold["texte_lu"]))
    pred = {m.nom for m in llm._verify(llm._rules(txt)).medicaments}     # même analyseur pour tous les moteurs
    for m in gold["medicaments"]:
        tot += 1; hit += m["nom"] in pred
if fails == len(rows): sys.exit("Aucune image lue : résultat invalide.")
print(f"jeu {a.set} | moteur {a.engine} | images {len(rows)} | échecs {fails}")
print(f"  CER moyen            : {statistics.mean(cers):.3f}")
print(f"  rappel médicaments   : {hit}/{tot} = {hit/tot:.1%}")
print(f"  latence médiane      : {statistics.median(lats)} ms")
