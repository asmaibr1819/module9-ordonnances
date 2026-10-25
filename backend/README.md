# Module 9 – Lecture d'ordonnances et de boîtes (API)

Pipeline : **image → (étape 1 OCR/vision) → texte → (étape 2 LLM + référentiel) → fiche médicament avec « à quoi ça sert »**.
Pas de base de données : le référentiel est `data/medicaments.json`.

## Lancer
```bash
pip install -r requirements.txt
# Windows PowerShell : $env:ANTHROPIC_API_KEY="ta_cle"   |   Linux/Mac : export ANTHROPIC_API_KEY=ta_cle
# (le fichier .env n'est PAS lu automatiquement ; sans clé : mode dégradé par règles)
uvicorn app.main:app --reload
# ouvrir http://localhost:8000   |   doc Swagger : http://localhost:8000/docs
```

## Endpoints
| Méthode | Route | Entrée | Sortie |
|---|---|---|---|
| POST | /api/ocr?engine=tesseract\|vlm\|lora | image (multipart) | `{texte, moteur, latence_ms}` |
| POST | /api/analyze | `{"texte": "..."}` | fiche JSON (voir schemas.py) |
| POST | /api/scan | image | fiche JSON (pipeline complet) |
| GET | /api/health | – | état |

## Étape 1 : entraîner et brancher ton modèle LoRA
1. Ouvre `notebooks/lora_finetuning_qwen2vl.ipynb` dans Google Colab (GPU) et suis les instructions de la première cellule.
2. Télécharge le dossier `lora_ordonnances` produit et place-le dans `models/lora_ordonnances`.
3. `pip install -r requirements-lora.txt` puis (PowerShell) `$env:OCR_ENGINE="lora"; uvicorn app.main:app`.
   Le moteur se choisit aussi dans la liste déroulante de la page.

## Mesurer (partie « évaluation » du rapport)
```bash
python -m eval.evaluate_step1 --set difficile --engine tesseract   # base de référence classique
python -m eval.evaluate_step1 --set difficile --engine vlm         # modèle de vision sans adaptation (clé API)
python -m eval.evaluate_step1 --set difficile --engine lora        # ton modèle adapté
python -m eval.evaluate_step2                                      # étape 2 (LLM + référentiel)
```
Jeux : `facile` (36 images, même style que l'entraînement) et `difficile` (60 images : perspective, basse résolution, flou, ombres, JPEG compressé).

Mesure déjà faite (Tesseract, sans accents installés) : facile 94,0 % de médicaments retrouvés (CER 0,220) ; difficile 55,8 % (CER 0,540).

## Garde-fous implémentés (exigés par l'énoncé)
- masquage des données personnelles avant l'envoi au LLM (`pii.py`)
- gestion timeout / quota / clé absente / JSON invalide → repli sur règles + référentiel
- sortie validée (Pydantic) et corrigée par le référentiel avant affichage
- avertissement « information non médicale » dans chaque réponse
