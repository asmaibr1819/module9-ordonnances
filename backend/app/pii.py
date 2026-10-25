"""Masquage des données personnelles AVANT tout envoi au LLM (exigence de l'énoncé)."""
import re

_PATTERNS = [
    (re.compile(r"(?im)^.*\b(dr|docteur|pr)\.?\s+[A-ZÉÈ][\w'’\- ]+.*$"), None),   # ligne médecin
    (re.compile(r"(?im)^\s*patient\s*:.*$"), None),                                # ligne patient
    (re.compile(r"(?im)^.*\bt[ée]l\s*:.*$"), None),                                 # téléphone
    (re.compile(r"(?im)^\s*le\s+\d{1,2}/\d{1,2}/\d{2,4}\s*$"), None),             # date seule
]
_INLINE = [
    (re.compile(r"\b\d{2}\s?\d{3}\s?\d{3}\b"), "[TEL]"),
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"), "[EMAIL]"),
]

def mask_pii(texte: str) -> str:
    out = texte
    for pat, _ in _PATTERNS:
        out = pat.sub("", out)
    for pat, rep in _INLINE:
        out = pat.sub(rep, out)
    return "\n".join(l.strip() for l in out.splitlines() if l.strip())
