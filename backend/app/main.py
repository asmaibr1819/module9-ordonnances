from pathlib import Path
from fastapi import FastAPI, File, HTTPException, UploadFile, Query
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .schemas import AnalyzeRequest, Fiche, OcrResponse
from . import llm, ocr

app = FastAPI(
    title="Module 9 - Analyse d'ordonnances et de boîtes",
    version="1.0.0",
    description="Lecture d'une photo d'ordonnance ou de boîte de médicament, correction des noms, DCI, dosage et à quoi sert le médicament. Information non médicale : la décision appartient toujours au pharmacien ou au médecin.",
)
# Autorise le frontend Angular (ng serve) à appeler cette API depuis le navigateur.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "http://127.0.0.1:4200"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
STATIC = Path(__file__).resolve().parent.parent / "static"
MAX_BYTES = 8 * 1024 * 1024

async def _read(file: UploadFile) -> bytes:
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(415, "Format non supporté : utilise JPG, PNG ou WEBP.")
    data = await file.read()
    if len(data) > MAX_BYTES: raise HTTPException(413, "Image trop lourde (max 8 Mo).")
    return data

@app.get("/api/health")
def health(): return {"status": "ok", "ocr_engine": ocr.ENGINE, "llm_model": llm.MODEL}

@app.post("/api/ocr", response_model=OcrResponse)
async def api_ocr(file: UploadFile = File(...), engine: str = Query(None, pattern="^(tesseract|vlm|lora)$")):
    """Étape 1 : image -> texte lu."""
    data = await _read(file)
    try:
        txt, eng, ms = ocr.read_image(data, engine)
    except (NotImplementedError, ImportError) as e: raise HTTPException(501, f"Moteur indisponible : {e}")
    except Exception as e: raise HTTPException(422, f"Lecture impossible : {type(e).__name__}")
    return OcrResponse(texte=txt, moteur=eng, latence_ms=ms)

@app.post("/api/analyze", response_model=Fiche)
def api_analyze(req: AnalyzeRequest):
    """Étape 2 : texte -> fiche médicament (nom, DCI, dosage, à quoi il sert...)."""
    return llm.analyze(req.texte)

@app.post("/api/scan", response_model=Fiche)
async def api_scan(file: UploadFile = File(...), engine: str = Query(None, pattern="^(tesseract|vlm|lora)$")):
    """Pipeline complet : image -> texte -> fiche."""
    data = await _read(file)
    try:
        txt, _, _ = ocr.read_image(data, engine)
    except (NotImplementedError, ImportError) as e: raise HTTPException(501, f"Moteur indisponible : {e}")
    except Exception as e: raise HTTPException(422, f"Lecture impossible : {type(e).__name__}")
    if len(txt) < 3: raise HTTPException(422, "Aucun texte lisible sur l'image.")
    return llm.analyze(txt)

@app.get("/")
def index(): return FileResponse(STATIC / "index.html")
app.mount("/static", StaticFiles(directory=STATIC), name="static")
