from typing import Optional, List, Literal
from pydantic import BaseModel, Field

AVERTISSEMENT = "Information non médicale : demandez conseil à un pharmacien ou à un médecin."

class Medicament(BaseModel):
    nom: str
    dci: Optional[str] = None
    dosage: Optional[str] = None
    indication: Optional[str] = None      # à quoi sert le médicament
    posologie: Optional[str] = None
    duree: Optional[str] = None
    verifie_referentiel: bool = False     # True si confirmé par medicaments.json

class Fiche(BaseModel):
    type: Literal["ordonnance", "boite", "inconnu"] = "inconnu"
    medicaments: List[Medicament] = Field(default_factory=list)
    a_verifier: List[str] = Field(default_factory=list)
    avertissement: str = AVERTISSEMENT
    mode: Literal["llm", "degrade_regles"] = "llm"   # degrade_regles = pas d'API disponible
    latence_ms: Optional[int] = None

class AnalyzeRequest(BaseModel):
    texte: str = Field(min_length=3, max_length=4000)

class OcrResponse(BaseModel):
    texte: str
    moteur: str
    latence_ms: int
