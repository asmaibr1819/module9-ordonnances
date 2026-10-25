"""Étape 2 : texte OCR -> fiche médicament.
Garde-fous : masquage PII avant envoi, timeout, clé absente, quota, JSON invalide -> mode dégradé par règles.
Le référentiel local sert ensuite à vérifier/corriger la sortie du LLM."""
import json, os, re, time
from typing import List
from .schemas import Fiche, Medicament
from .pii import mask_pii
from .prompts import SYSTEM_PROMPT, FEW_SHOT, user_message
from . import referential as R

MODEL = os.getenv("LLM_MODEL", "claude-haiku-5-5")
TIMEOUT = float(os.getenv("LLM_TIMEOUT_S", "20"))

def _extract_json(txt: str) -> dict:
    txt = txt.strip()
    txt = re.sub(r"^```(?:json)?|```$", "", txt, flags=re.M).strip()
    a, b = txt.find("{"), txt.rfind("}")
    if a < 0 or b < 0: raise ValueError("pas de JSON")
    return json.loads(txt[a:b + 1])

def _call_llm(texte: str) -> dict:
    import anthropic
    client = anthropic.Anthropic(timeout=TIMEOUT, max_retries=1)   # lit ANTHROPIC_API_KEY
    msgs = FEW_SHOT + [{"role": "user", "content": user_message(texte)}]
    r = client.messages.create(model=MODEL, max_tokens=1200, temperature=0, system=SYSTEM_PROMPT, messages=msgs)
    return _extract_json(r.content[0].text)

# ---------- mode dégradé (sans API) : règles + référentiel ----------
_DOSE = re.compile(r"\d+(?:[.,]\d+)?\s?(?:mg|g|µg|ug|UI|%|ml)(?:\s?/\s?\d+(?:[.,]\d+)?\s?(?:mg|g|µg|ml))?", re.I)

def _rules(texte: str) -> dict:
    lines = [l.strip() for l in texte.splitlines() if l.strip()]
    meds, a_verifier, seen = [], [], set()
    is_box = not any(re.match(r"^\d+\)", l) for l in lines)
    for i, l in enumerate(lines):
        if re.match(r"^\d+\)", l) or (is_box and i < 3):
            head = re.sub(r"^\d+\)\s*", "", l)
            words = head.split()
            entry = None
            for n in (2, 1):
                if len(words) >= n:
                    entry = R.match_brand(" ".join(words[:n]))
                    if entry: break
            if not entry:
                if re.match(r"^\d+\)", l): a_verifier.append(l)
                continue
            if entry["marque"] in seen: continue
            seen.add(entry["marque"])
            dose = _DOSE.search(head) or _DOSE.search(" ".join(lines[:4]))
            poso = lines[i + 1] if i + 1 < len(lines) and re.match(r"^\d+\)", l) else None
            meds.append({"nom": entry["marque"], "dci": entry["dci"], "dosage": dose.group(0) if dose else entry["dosages"][0],
                         "indication": entry["indication"], "posologie": poso, "duree": None})
    return {"type": "boite" if is_box else "ordonnance", "medicaments": meds, "a_verifier": a_verifier}

# ---------- vérification par le référentiel ----------
def _verify(data: dict) -> Fiche:
    meds: List[Medicament] = []
    a_verifier = list(data.get("a_verifier") or [])
    for m in data.get("medicaments") or []:
        nom = (m.get("nom") or "").strip()
        if not nom: continue
        entry = R.match_brand(nom)
        if entry:   # le référentiel fait foi pour nom / DCI / indication
            m["nom"], m["dci"], m["indication"] = entry["marque"], entry["dci"], entry["indication"]
            m["verifie_referentiel"] = True
        else:
            a_verifier.append(f"Médicament absent du référentiel : {nom}")
        meds.append(Medicament(**{k: m.get(k) for k in ("nom", "dci", "dosage", "indication", "posologie", "duree", "verifie_referentiel") if k in m}))
    t = data.get("type") if data.get("type") in ("ordonnance", "boite") else "inconnu"
    return Fiche(type=t, medicaments=meds, a_verifier=a_verifier)

def analyze(texte: str) -> Fiche:
    t0 = time.time()
    clean = mask_pii(texte)
    mode = "llm"
    try:
        if not os.getenv("ANTHROPIC_API_KEY"): raise RuntimeError("clé API absente")
        data = _call_llm(clean)
    except Exception as e:      # timeout, quota, clé absente, JSON invalide...
        print(f"[llm] repli sur les règles : {type(e).__name__}: {e}")
        data, mode = _rules(clean), "degrade_regles"
    fiche = _verify(data)
    fiche.mode = mode
    fiche.latence_ms = int((time.time() - t0) * 1000)
    return fiche
