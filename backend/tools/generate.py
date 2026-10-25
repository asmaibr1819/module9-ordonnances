#!/usr/bin/env python3
"""Génère un dataset synthétique d'ordonnances et de boîtes de médicaments.

Sortie (dans OUT) :
  images/*.png                 images
  labels/*.json                JSON attendu pour chaque image
  medicaments.json             référentiel (normalisation / fuzzy matching)
  train.jsonl val.jsonl test.jsonl   format conversationnel (fine-tuning VLM)
Toutes les données patient/médecin sont FICTIVES.
"""
import json, random, sys, os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SEED = 42
N_ORD, N_BOX = 240, 120
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "dataset_ordonnances")
random.seed(SEED)

# --- Référentiel : (marque, DCI, dosages, forme) -----------------------------
MEDS = [
 ("Doliprane","Paracétamol",["500 mg","1000 mg"],"comprimé"),
 ("Efferalgan","Paracétamol",["500 mg","1000 mg"],"comprimé effervescent"),
 ("Panadol","Paracétamol",["500 mg"],"comprimé"),
 ("Advil","Ibuprofène",["200 mg","400 mg"],"comprimé"),
 ("Brufen","Ibuprofène",["400 mg","600 mg"],"comprimé"),
 ("Nurofen","Ibuprofène",["200 mg","400 mg"],"comprimé"),
 ("Aspégic","Acide acétylsalicylique",["500 mg","1000 mg"],"sachet"),
 ("Voltarène","Diclofénac",["50 mg","75 mg"],"comprimé"),
 ("Augmentin","Amoxicilline/Acide clavulanique",["500 mg/62,5 mg","1 g/125 mg"],"comprimé"),
 ("Clamoxyl","Amoxicilline",["500 mg","1 g"],"gélule"),
 ("Zithromax","Azithromycine",["250 mg","500 mg"],"comprimé"),
 ("Ciprofloxacine Biogaran","Ciprofloxacine",["500 mg"],"comprimé"),
 ("Flagyl","Métronidazole",["250 mg","500 mg"],"comprimé"),
 ("Bactrim","Sulfaméthoxazole/Triméthoprime",["400 mg/80 mg"],"comprimé"),
 ("Oroken","Céfixime",["200 mg","400 mg"],"comprimé"),
 ("Mopral","Oméprazole",["10 mg","20 mg"],"gélule"),
 ("Inexium","Ésoméprazole",["20 mg","40 mg"],"comprimé"),
 ("Gaviscon","Alginate de sodium",["500 mg"],"sachet"),
 ("Smecta","Diosmectite",["3 g"],"sachet"),
 ("Spasfon","Phloroglucinol",["80 mg"],"comprimé"),
 ("Motilium","Dompéridone",["10 mg"],"comprimé"),
 ("Imodium","Lopéramide",["2 mg"],"gélule"),
 ("Ventoline","Salbutamol",["100 µg"],"spray"),
 ("Aerius","Desloratadine",["5 mg"],"comprimé"),
 ("Zyrtec","Cétirizine",["10 mg"],"comprimé"),
 ("Clarityne","Loratadine",["10 mg"],"comprimé"),
 ("Solupred","Prednisolone",["5 mg","20 mg"],"comprimé"),
 ("Celestène","Bétaméthasone",["0,5 mg"],"comprimé"),
 ("Mucolator","Carbocistéine",["750 mg"],"sirop"),
 ("Toplexil","Oxomémazine",["0,33 mg/ml"],"sirop"),
 ("Fervex","Paracétamol/Phéniramine/Vitamine C",["500 mg"],"sachet"),
 ("Glucophage","Metformine",["500 mg","850 mg","1000 mg"],"comprimé"),
 ("Amarel","Glimépiride",["2 mg","4 mg"],"comprimé"),
 ("Tahor","Atorvastatine",["10 mg","20 mg","40 mg"],"comprimé"),
 ("Crestor","Rosuvastatine",["10 mg","20 mg"],"comprimé"),
 ("Amlor","Amlodipine",["5 mg","10 mg"],"gélule"),
 ("Coversyl","Périndopril",["5 mg","10 mg"],"comprimé"),
 ("Tenormine","Aténolol",["50 mg","100 mg"],"comprimé"),
 ("Lasilix","Furosémide",["40 mg"],"comprimé"),
 ("Kardégic","Acide acétylsalicylique",["75 mg","160 mg"],"sachet"),
 ("Levothyrox","Lévothyroxine",["50 µg","75 µg","100 µg"],"comprimé"),
 ("Xanax","Alprazolam",["0,25 mg","0,5 mg"],"comprimé"),
 ("Tranxène","Clorazépate",["10 mg"],"gélule"),
 ("Deroxat","Paroxétine",["20 mg"],"comprimé"),
 ("Zolpidem Mylan","Zolpidem",["10 mg"],"comprimé"),
 ("Cataflam","Diclofénac potassique",["50 mg"],"comprimé"),
 ("Tramadol Biogaran","Tramadol",["50 mg"],"gélule"),
 ("Myolastan","Tétrazépam",["50 mg"],"comprimé"),
 ("Mag 2","Magnésium",["122 mg"],"ampoule"),
 ("Uvédose","Vitamine D3",["100 000 UI"],"ampoule"),
 ("Tardyferon","Sulfate ferreux",["80 mg"],"comprimé"),
 ("Daflon","Diosmine/Hespéridine",["500 mg"],"comprimé"),
 ("Fucidine","Acide fusidique",["2 %"],"crème"),
 ("Bétadine","Povidone iodée",["10 %"],"solution"),
 ("Dacryoserum","Chlorure de sodium",["0,9 %"],"unidose"),
 ("Maxidrol","Dexaméthasone/Néomycine",["0,1 %"],"collyre"),
 ("Mycostatine","Nystatine",["100 000 UI/ml"],"suspension"),
 ("Fluconazole Arrow","Fluconazole",["150 mg"],"gélule"),
 ("Zovirax","Aciclovir",["200 mg","400 mg"],"comprimé"),
 ("Tamiflu","Oseltamivir",["75 mg"],"gélule"),
]

INDICATION = {
 "Doliprane":"Douleurs et fièvre","Efferalgan":"Douleurs et fièvre","Panadol":"Douleurs et fièvre",
 "Advil":"Douleurs, fièvre et inflammation","Brufen":"Douleurs, fièvre et inflammation","Nurofen":"Douleurs, fièvre et inflammation",
 "Aspégic":"Douleurs et fièvre","Voltarène":"Douleurs et inflammations (rhumatismes, douleurs musculaires)",
 "Augmentin":"Infections bactériennes (antibiotique)","Clamoxyl":"Infections bactériennes (antibiotique)",
 "Zithromax":"Infections bactériennes (antibiotique)","Ciprofloxacine Biogaran":"Infections bactériennes, notamment urinaires (antibiotique)",
 "Flagyl":"Infections bactériennes et parasitaires","Bactrim":"Infections bactériennes, notamment urinaires (antibiotique)",
 "Oroken":"Infections bactériennes ORL et respiratoires (antibiotique)",
 "Mopral":"Reflux gastro-œsophagien et ulcères d'estomac (réduit l'acidité)","Inexium":"Reflux gastro-œsophagien et ulcères d'estomac (réduit l'acidité)",
 "Gaviscon":"Brûlures d'estomac et remontées acides","Smecta":"Diarrhée","Spasfon":"Douleurs spasmodiques (ventre, règles)",
 "Motilium":"Nausées, vomissements et ballonnements","Imodium":"Diarrhée aiguë",
 "Ventoline":"Crises d'asthme (dilate les bronches)","Aerius":"Allergies (rhume des foins, urticaire)","Zyrtec":"Allergies (rhume des foins, urticaire)",
 "Clarityne":"Allergies (rhume des foins, urticaire)","Solupred":"Inflammations et allergies sévères (corticoïde)","Celestène":"Inflammations et allergies sévères (corticoïde)",
 "Mucolator":"Toux grasse et encombrement des bronches","Toplexil":"Toux sèche","Fervex":"Symptômes du rhume et de la grippe",
 "Glucophage":"Diabète de type 2","Amarel":"Diabète de type 2","Tahor":"Cholestérol élevé","Crestor":"Cholestérol élevé",
 "Amlor":"Hypertension artérielle","Coversyl":"Hypertension artérielle et insuffisance cardiaque","Tenormine":"Hypertension, angine de poitrine et troubles du rythme cardiaque",
 "Lasilix":"Rétention d'eau (œdèmes) et hypertension","Kardégic":"Prévention des accidents cardiovasculaires (fluidifie le sang)",
 "Levothyrox":"Insuffisance thyroïdienne","Xanax":"Anxiété (traitement de courte durée)","Tranxène":"Anxiété (traitement de courte durée)",
 "Deroxat":"Dépression et troubles anxieux","Zolpidem Mylan":"Insomnie sévère (courte durée)","Cataflam":"Douleurs et inflammations",
 "Tramadol Biogaran":"Douleurs modérées à intenses","Myolastan":"Contractures musculaires douloureuses","Mag 2":"Carence en magnésium",
 "Uvédose":"Carence en vitamine D","Tardyferon":"Carence en fer (anémie)","Daflon":"Insuffisance veineuse et hémorroïdes",
 "Fucidine":"Infections bactériennes de la peau","Bétadine":"Antiseptique : désinfection de la peau et des plaies",
 "Dacryoserum":"Nettoyage et lavage des yeux","Maxidrol":"Inflammation de l'œil avec infection (collyre)",
 "Mycostatine":"Mycoses de la bouche et du tube digestif","Fluconazole Arrow":"Infections fongiques (candidose)",
 "Zovirax":"Herpès et zona","Tamiflu":"Grippe (traitement antiviral)",
}
assert all(m[0] in INDICATION for m in MEDS), [m[0] for m in MEDS if m[0] not in INDICATION]

# fautes de lecture fréquentes (bruit OCR / écriture)
CONFUSIONS = [("rn","m"),("l","1"),("o","0"),("e","c"),("a","o"),("u","v"),("i","l"),("é","e")]

POSOS = [
 ("1 comprimé 3 fois par jour","1 cp x 3/jour"),
 ("1 comprimé 2 fois par jour","1 cp x 2/jour"),
 ("1 comprimé le matin","1 cp le matin"),
 ("1 comprimé le soir","1 cp le soir"),
 ("1 comprimé matin et soir","1 cp matin et soir"),
 ("2 comprimés 3 fois par jour","2 cp x 3/jour"),
 ("1 sachet 2 fois par jour","1 sach x 2/jour"),
 ("1 gélule par jour","1 gél/jour"),
 ("2 prises par jour après les repas","2 prises/j après repas"),
 ("1 cuillère à soupe 3 fois par jour","1 c.à.s x 3/j"),
 ("2 bouffées en cas de crise","2 bouffées si crise"),
 ("1 application matin et soir","1 appl. matin et soir"),
]
DUREES = ["3 jours","5 jours","7 jours","10 jours","14 jours","1 mois","3 mois"]
PRENOMS = ["Sami","Amira","Youssef","Nour","Karim","Ines","Mehdi","Salma","Walid","Rim","Hatem","Yasmine","Aymen","Lina","Bilel"]
NOMS = ["Ben Salah","Trabelsi","Mansouri","Gharbi","Jlassi","Ben Ammar","Chaabane","Haddad","Khelifi","Sassi","Bouzid","Hamdi"]
VILLES = ["Tunis","Ariana","La Manouba","Ben Arous","Sousse","Sfax","Nabeul","Bizerte"]
SPECS = ["Médecine générale","Pédiatrie","Cardiologie","Médecine interne","ORL","Dermatologie"]

FD = "/usr/share/fonts/truetype/"; FO = "/usr/share/texmf/fonts/opentype/public/tex-gyre/"
PRINT_FONTS = [FD+"liberation/LiberationSans-Regular.ttf", FD+"dejavu/DejaVuSans.ttf", FD+"liberation/LiberationSerif-Regular.ttf"]
PRINT_BOLD = [FD+"liberation/LiberationSans-Bold.ttf", FD+"dejavu/DejaVuSans-Bold.ttf", FD+"liberation/LiberationSerif-Bold.ttf"]
HAND_FONTS = [FO+"texgyrechorus-mediumitalic.otf", FO+"texgyrecursor-italic.otf", FD+"liberation/LiberationSerif-Italic.ttf"]
INKS = [(20,20,90),(10,10,10),(30,30,140),(60,20,20)]

def font(path, size): return ImageFont.truetype(path, size)

def draw_hand_text(img, xy, text, fpath, size, ink, jitter=1.0):
    """Écrit caractère par caractère avec rotation/décalage aléatoires (aspect manuscrit)."""
    x, y = xy
    f = font(fpath, size)
    for ch in text:
        if ch == " ":
            x += size * 0.32 + random.uniform(-2, 3); continue
        w = int(size * 1.3)
        tile = Image.new("RGBA", (w, w), (0, 0, 0, 0))
        ImageDraw.Draw(tile).text((w*0.2, w*0.1), ch, font=f, fill=ink+(255,))
        tile = tile.rotate(random.uniform(-9, 9)*jitter, resample=Image.BICUBIC)
        img.alpha_composite(tile, (int(x - w*0.2), int(y - w*0.1 + random.uniform(-3, 3)*jitter)))
        x += f.getlength(ch) * random.uniform(0.9, 1.05)
    return x

def degrade(img, strength):
    """Rotation légère, flou, bruit, variation de luminosité (photo smartphone)."""
    import numpy as np
    img = img.convert("RGB")
    angle = random.uniform(-3, 3) * strength
    img = img.rotate(angle, expand=True, fillcolor=(random.randint(150,215),)*3, resample=Image.BICUBIC)
    if random.random() < 0.6: img = img.filter(ImageFilter.GaussianBlur(random.uniform(0.2, 1.2)*strength))
    a = np.asarray(img).astype("float32")
    a *= random.uniform(0.8, 1.1)
    # dégradé d'éclairage
    h, w = a.shape[:2]
    grad = np.linspace(random.uniform(0.82, 1.0), random.uniform(0.9, 1.05), w)[None, :, None]
    a *= grad
    a += np.random.normal(0, 6*strength, a.shape)
    return Image.fromarray(a.clip(0, 255).astype("uint8"))

POSO_BY_FORM = {
 "comprimé": [0,1,2,3,4,5], "comprimé effervescent": [1,2,4], "gélule": [7,1,2],
 "sachet": [6,1], "sirop": [9], "spray": [10], "crème": [11], "solution": [11],
 "collyre": [11], "unidose": [11], "suspension": [9], "ampoule": [2], "unidose ": [11],
}
def poso_for(form):
    return POSOS[random.choice(POSO_BY_FORM.get(form, [1, 2]))]

def pick_med():
    brand, dci, dosages, form = random.choice(MEDS)
    return brand, dci, random.choice(dosages), form

# ---------------------------------------------------------------- ordonnance
def make_prescription(idx):
    W, H = 900, random.choice([1100, 1200])
    handwritten = random.random() < 0.55
    bg = random.choice([(255,255,255),(252,250,242),(246,248,252)])
    img = Image.new("RGBA", (W, H), bg+(255,))
    d = ImageDraw.Draw(img)
    pf = random.choice(range(len(PRINT_FONTS)))
    ink = random.choice(INKS)
    doc = f"Dr {random.choice(PRENOMS)} {random.choice(NOMS)}"
    spec = random.choice(SPECS); ville = random.choice(VILLES)
    patient = f"{random.choice(PRENOMS)} {random.choice(NOMS)}"
    age = random.randint(4, 82)
    date = f"{random.randint(1,28):02d}/{random.randint(1,12):02d}/2026"
    # en-tête (toujours imprimé)
    d.text((50, 40), doc, font=font(PRINT_BOLD[pf], 34), fill=(30,30,30))
    d.text((50, 85), f"{spec} - {ville}", font=font(PRINT_FONTS[pf], 22), fill=(60,60,60))
    d.text((50, 115), f"Tél : {random.randint(70,99)} {random.randint(100,999)} {random.randint(100,999)}", font=font(PRINT_FONTS[pf], 20), fill=(60,60,60))
    d.line((50, 155, W-50, 155), fill=(80,80,80), width=2)
    d.text((50, 175), f"Patient : {patient}   Âge : {age} ans", font=font(PRINT_FONTS[pf], 24), fill=(20,20,20))
    d.text((W-260, 175), f"Le {date}", font=font(PRINT_FONTS[pf], 24), fill=(20,20,20))
    d.text((50, 235), "ORDONNANCE", font=font(PRINT_BOLD[pf], 28), fill=(20,20,20))

    n = random.randint(1, 5)
    chosen, meds_out, y = [], [], 300
    text_lines = [doc, f"{spec} - {ville}", f"Patient : {patient}  Âge : {age} ans", f"Le {date}", "ORDONNANCE"]
    used = set()
    while len(meds_out) < n:
        brand, dci, dosage, form = pick_med()
        if brand in used: continue
        used.add(brand)
        poso_full, poso_abbr = poso_for(form)
        duree = random.choice(DUREES)
        line1 = f"{len(meds_out)+1}) {brand} {dosage}"
        line2 = f"{poso_abbr if handwritten else poso_full} - {duree}"
        legible = True
        if handwritten:
            fp = random.choice(HAND_FONTS); sz = random.randint(34, 42)
            draw_hand_text(img, (60, y), line1, fp, sz, ink, jitter=random.uniform(0.6, 1.4))
            draw_hand_text(img, (100, y+52), line2, fp, int(sz*0.85), ink, jitter=random.uniform(0.6, 1.4))
        else:
            d.text((60, y), line1, font=font(PRINT_BOLD[pf], 30), fill=ink)
            d.text((100, y+44), line2, font=font(PRINT_FONTS[pf], 25), fill=ink)
        text_lines += [line1, line2]
        meds_out.append({
            "nom_lu": f"{brand} {dosage}", "dci": dci, "dosage": dosage,
            "indication": INDICATION[brand], "posologie": poso_full, "duree": duree,
        })
        y += 130 if handwritten else 120
        if y > H - 220: break
    # signature + cachet
    if handwritten:
        draw_hand_text(img, (W-760, H-170), doc.replace("Dr ", ""), HAND_FONTS[0], 44, ink, 1.2)
    d.ellipse((W-420, H-200, W-80, H-70), outline=(30,60,150), width=3)
    d.text((W-395, H-160), f"{doc}", font=font(PRINT_FONTS[pf], 18), fill=(30,60,150))
    img = degrade(img, strength=random.uniform(0.4, 1.4))
    label = {
        "type": "ordonnance",
        "medicaments": meds_out,
        "a_verifier": [],
        "_meta": {"ecriture": "manuscrite" if handwritten else "imprimee", "patient_fictif": True},
    }
    return img, label, text_lines

# ---------------------------------------------------------------- boîte
def make_box(idx):
    W, H = 800, 560
    palette = random.choice([((0,120,190),(255,255,255)),((20,140,80),(255,255,255)),((200,40,60),(255,255,255)),((250,250,250),(20,40,120)),((255,200,40),(30,30,30))])
    bgc, fg = palette
    img = Image.new("RGBA", (W, H), (235,235,235,255))
    d = ImageDraw.Draw(img)
    pf = random.choice(range(len(PRINT_FONTS)))
    brand, dci, dosage, form = pick_med()
    d.rectangle((40, 40, W-40, H-40), fill=bgc, outline=(40,40,40), width=3)
    d.rectangle((40, 40, 70, H-40), fill=tuple(max(0, c-60) for c in bgc))
    d.text((100, 80), brand, font=font(PRINT_BOLD[pf], random.choice([60, 68, 74])), fill=fg)
    d.text((100, 190), dosage, font=font(PRINT_BOLD[pf], 46), fill=fg)
    d.text((100, 260), dci, font=font(PRINT_FONTS[pf], 30), fill=fg)
    nb = random.choice([8, 10, 12, 16, 20, 24, 30])
    d.text((100, 320), f"Boîte de {nb} {form}s" if not form.endswith("s") else f"Boîte de {nb} {form}", font=font(PRINT_FONTS[pf], 26), fill=fg)
    lotline = f"Lot {random.randint(10000,99999)}   EXP {random.randint(1,12):02d}/{random.choice([2027,2028,2029])}"
    d.text((100, 440), lotline, font=font(PRINT_FONTS[pf], 20), fill=fg)
    boxline = f"Boîte de {nb} {form}s" if not form.endswith("s") else f"Boîte de {nb} {form}"
    text_lines = [brand, dosage, dci, boxline, lotline]
    img = degrade(img, strength=random.uniform(0.5, 1.6))
    label = {
        "type": "boite",
        "medicaments": [{"nom_lu": f"{brand} {dosage}", "dci": dci, "dosage": dosage, "indication": INDICATION[brand], "posologie": None, "duree": None}],
        "a_verifier": [],
        "_meta": {"forme": form},
    }
    return img, label, text_lines

# ---------------------------------------------------------------- main
P1 = "Lis tout le texte visible sur cette image (ordonnance ou boîte de médicament). Réponds uniquement avec le texte, une ligne par ligne lue."
P2 = ("Tu es un assistant pharmacien. Voici le texte lu par OCR sur une ordonnance ou une boîte de médicament (il peut contenir des fautes de lecture) :\n\"\"\"\n{texte}\n\"\"\"\n"
      "Pour chaque médicament, réponds UNIQUEMENT en JSON : {{\"type\", \"medicaments\":[{{\"nom\",\"dci\",\"dosage\",\"indication\",\"posologie\",\"duree\"}}], \"a_verifier\":[]}}. "
      "Corrige les fautes de lecture. N'inclus aucune donnée personnelle (patient, médecin). "
      "Si un nom est incertain, ajoute-le dans a_verifier. Ne donne jamais de diagnostic.")

def ocr_noise(line, p):
    out = []
    for ch in line:
        r = random.random()
        if r < p:
            for a, b in CONFUSIONS:
                if ch == a: out.append(b); break
            else: out.append(ch)
        elif r < p * 1.2: continue
        else: out.append(ch)
    return "".join(out)

def mask_text(lines, kind):
    """Texte donné à l'étape 2 : sans identité du patient/médecin (masquage)."""
    if kind != "ord": return lines
    return [l for i, l in enumerate(lines) if i >= 4]  # on retire médecin, ville, patient, date

def final_label(label):
    meds = []
    for m in label["medicaments"]:
        nom = m["nom_lu"][: -(len(m["dosage"]) + 1)]  # marque seule
        meds.append({"nom": nom, **{k: m[k] for k in ("dci", "dosage", "indication", "posologie", "duree")}})
    return {"type": label["type"], "medicaments": meds, "a_verifier": []}

def main():
    (OUT/"images").mkdir(parents=True, exist_ok=True); (OUT/"labels").mkdir(exist_ok=True); (OUT/"texte_ocr").mkdir(exist_ok=True)
    items = [("ord", i) for i in range(N_ORD)] + [("box", i) for i in range(N_BOX)]
    random.shuffle(items)
    r1, r2 = [], []
    for k, (kind, i) in enumerate(items):
        img, label, lines = make_prescription(k) if kind == "ord" else make_box(k)
        name = f"{kind}_{k:04d}"
        img.convert("RGB").save(OUT/"images"/f"{name}.jpg", quality=88)
        meta = label.pop("_meta")
        texte_vrai = "\n".join(lines)
        (OUT/"labels"/f"{name}.json").write_text(json.dumps({**final_label(label), "texte_lu": texte_vrai, "_meta": meta}, ensure_ascii=False, indent=2), encoding="utf-8")
        # étape 1 : image -> texte lu
        r1.append({"id": name, "image": f"images/{name}.jpg", "messages": [
            {"role": "user", "content": [{"type": "image", "image": f"images/{name}.jpg"}, {"type": "text", "text": P1}]},
            {"role": "assistant", "content": [{"type": "text", "text": texte_vrai}]}]})
        # étape 2 : texte OCR (bruité 50% du temps, identité retirée) -> JSON enrichi
        noisy = [ocr_noise(l, 0.05) if random.random() < 0.5 else l for l in mask_text(lines, kind)]
        texte_ocr = "\n".join(noisy)
        (OUT/"texte_ocr"/f"{name}.txt").write_text(texte_ocr, encoding="utf-8")
        r2.append({"id": name, "messages": [
            {"role": "user", "content": P2.format(texte=texte_ocr)},
            {"role": "assistant", "content": json.dumps(final_label(label), ensure_ascii=False)}]})
    n = len(r1); a, b = int(n*.8), int(n*.9)
    for tag, rows in (("etape1_vision", r1), ("etape2_llm", r2)):
        for fn, sub in (("train", rows[:a]), ("val", rows[a:b]), ("test", rows[b:])):
            (OUT/f"{tag}_{fn}.jsonl").write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in sub), encoding="utf-8")
    ref = [{"marque": m, "dci": d, "dosages": ds, "forme": f, "indication": INDICATION[m]} for m, d, ds, f in MEDS]
    (OUT/"medicaments.json").write_text(json.dumps(ref, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{n} images | train {a} | val {b-a} | test {n-b} | référentiel {len(ref)} médicaments")

if __name__ == "__main__":
    main()
