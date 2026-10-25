"""Étape 1 : image -> texte. Trois moteurs interchangeables (variable OCR_ENGINE) :
 - tesseract : baseline classique (sans adaptation)
 - vlm       : modèle vision-langage de base via API (prompt seul)
 - lora      : TON modèle fine-tuné (à brancher dans _ocr_lora)
Comparer les trois = la partie « adaptation » de ton rapport."""
import base64, io, os, time
from PIL import Image

ENGINE = os.getenv("OCR_ENGINE", "tesseract")
P1 = "Lis tout le texte visible sur cette image (ordonnance ou boîte de médicament). Réponds uniquement avec le texte, une ligne par ligne lue."

WINDOWS_TESSERACT = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

def _ocr_tesseract(img: Image.Image) -> str:
    import pytesseract
    cmd = os.getenv("TESSERACT_CMD")
    if cmd:
        pytesseract.pytesseract.tesseract_cmd = cmd
    elif os.path.exists(WINDOWS_TESSERACT):
        pytesseract.pytesseract.tesseract_cmd = WINDOWS_TESSERACT
    return pytesseract.image_to_string(img, lang=os.getenv("TESS_LANG", "eng"))

def _ocr_vlm(img: Image.Image) -> str:
    import anthropic
    buf = io.BytesIO(); img.convert("RGB").save(buf, "JPEG", quality=90)
    b64 = base64.b64encode(buf.getvalue()).decode()
    c = anthropic.Anthropic(timeout=30, max_retries=1)
    r = c.messages.create(model=os.getenv("LLM_MODEL", "claude-haiku-5-5"), max_tokens=800, temperature=0, messages=[{"role": "user", "content": [
        {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": b64}}, {"type": "text", "text": P1}]}])
    return r.content[0].text

_LORA = {}

def _load_lora():
    """Charge Qwen2-VL (4 bits si GPU) + ton adaptateur LoRA, une seule fois."""
    if _LORA: return _LORA
    import torch
    from transformers import Qwen2VLForConditionalGeneration, AutoProcessor
    from peft import PeftModel
    base = os.getenv("LORA_BASE", "Qwen/Qwen2-VL-2B-Instruct")
    adapter = os.getenv("LORA_ADAPTER", "models/lora_ordonnances")
    if not os.path.isdir(adapter):
        raise NotImplementedError(f"Adaptateur LoRA introuvable : {adapter}. Entraîne-le avec le notebook, puis dépose le dossier ici (ou fixe LORA_ADAPTER).")
    kw = {"device_map": "auto"}
    if torch.cuda.is_available():
        from transformers import BitsAndBytesConfig
        kw["quantization_config"] = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_compute_dtype=torch.float16)
    else:
        kw["torch_dtype"] = torch.float32
    model = Qwen2VLForConditionalGeneration.from_pretrained(base, **kw)
    model = PeftModel.from_pretrained(model, adapter).eval()
    processor = AutoProcessor.from_pretrained(base, min_pixels=256 * 28 * 28, max_pixels=768 * 28 * 28)
    _LORA.update(model=model, processor=processor)
    return _LORA

def _ocr_lora(img: Image.Image) -> str:
    import torch
    L = _load_lora(); model, proc = L["model"], L["processor"]
    msgs = [{"role": "user", "content": [{"type": "image"}, {"type": "text", "text": P1}]}]
    prompt = proc.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)
    inputs = proc(text=[prompt], images=[img.convert("RGB")], return_tensors="pt").to(model.device)
    with torch.no_grad():
        out = model.generate(**inputs, max_new_tokens=400, do_sample=False)
    return proc.batch_decode(out[:, inputs["input_ids"].shape[1]:], skip_special_tokens=True)[0]

ENGINES = {"tesseract": _ocr_tesseract, "vlm": _ocr_vlm, "lora": _ocr_lora}

def read_image(data: bytes, engine: str | None = None):
    engine = engine or ENGINE
    img = Image.open(io.BytesIO(data)); img.load()
    t0 = time.time()
    txt = ENGINES[engine](img)
    return txt.strip(), engine, int((time.time() - t0) * 1000)