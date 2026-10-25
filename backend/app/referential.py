"""Référentiel local (fichier JSON, pas de base de données) + fuzzy matching."""
import json, re, unicodedata
from difflib import get_close_matches, SequenceMatcher
from pathlib import Path
from typing import Optional

_PATH = Path(__file__).resolve().parent.parent / "data" / "medicaments.json"
REF = json.loads(_PATH.read_text(encoding="utf-8"))
_BY_BRAND = {m["marque"].lower(): m for m in REF}

def _norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9 ]", "", s.lower()).strip()

_NORM_BRANDS = {_norm(m["marque"]): m for m in REF}

def match_brand(nom: str, cutoff: float = 0.78) -> Optional[dict]:
    """Retourne l'entrée du référentiel la plus proche de `nom` (ex. 'Efferalgn' -> Efferalgan)."""
    n = _norm(nom)
    if not n: return None
    if n in _NORM_BRANDS: return _NORM_BRANDS[n]
    close = get_close_matches(n, list(_NORM_BRANDS), n=1, cutoff=cutoff)
    return _NORM_BRANDS[close[0]] if close else None

def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, _norm(a), _norm(b)).ratio()
