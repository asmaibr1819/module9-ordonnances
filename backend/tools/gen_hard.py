#!/usr/bin/env python3
"""Jeu de TEST difficile (60 images) : perspective, basse résolution, flou fort, ombres, compression JPEG agressive.
Usage : python3 gen_hard.py <dossier_sortie>"""
import io, random, sys
import numpy as np
from PIL import Image, ImageFilter
import generate as g

def hard_degrade(img, strength=1.0):
    img = img.convert("RGB")
    w, h = img.size
    # perspective (photo prise de biais)
    d = random.uniform(0.03, 0.09)
    dx = lambda: random.uniform(-d, d) * w
    dy = lambda: random.uniform(-d, d) * h
    src = [(0, 0), (w, 0), (w, h), (0, h)]
    dst = [(dx(), dy()), (w + dx(), dy()), (w + dx(), h + dy()), (dx(), h + dy())]
    A = []
    for (x, y), (u, v) in zip(dst, src):
        A += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]
    coef = np.linalg.solve(np.array(A, float), np.array([c for p in src for c in p], float))
    img = img.transform((w, h), Image.PERSPECTIVE, tuple(coef), Image.BICUBIC, fillcolor=(120, 120, 120))
    img = img.rotate(random.uniform(-7, 7), expand=True, fillcolor=(random.randint(90, 200),) * 3, resample=Image.BICUBIC)
    # basse résolution
    s = random.uniform(0.35, 0.6)
    img = img.resize((int(img.width * s), int(img.height * s)), Image.BILINEAR).resize((img.width, img.height), Image.BICUBIC)
    img = img.filter(ImageFilter.GaussianBlur(random.uniform(0.8, 2.0)))
    a = np.asarray(img).astype("float32")
    hh, ww = a.shape[:2]
    # ombre en diagonale + bruit fort
    yy, xx = np.mgrid[0:hh, 0:ww]
    shade = 1 - random.uniform(0.15, 0.45) * np.clip((xx / ww * random.uniform(-1, 1) + yy / hh * random.uniform(0.3, 1)), 0, 1)
    a *= shade[..., None] * random.uniform(0.7, 1.05)
    a += np.random.normal(0, random.uniform(10, 20), a.shape)
    img = Image.fromarray(a.clip(0, 255).astype("uint8"))
    buf = io.BytesIO(); img.save(buf, "JPEG", quality=random.randint(18, 40)); buf.seek(0)
    return Image.open(buf).convert("RGB")

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "test_difficile"
    random.seed(123); np.random.seed(123)
    g.degrade = hard_degrade
    g.OUT = g.Path(out); g.N_ORD, g.N_BOX = 40, 20
    g.main()
