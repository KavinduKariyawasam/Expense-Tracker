#!/usr/bin/env python
"""
Evaluate the receipt-OCR pipeline against a JSON ground-truth file.

Ground-truth JSON must look like:

{
  "images/0.jpg": {
      "vendor": "Walmart",
      "invoice_date": "2010-08-20",
      "items": [...],
      "invoice_total": 5.11
  },
  ...
}

Usage
-----
python eval.py --images data/images --gt ground_truth.json
"""
from __future__ import annotations
import argparse, json, re, unicodedata, statistics
from pathlib import Path
from collections import defaultdict, Counter
import os, base64, cv2, numpy as np, logging

# ─── import your pipeline ────────────────────────────────────────────────────
try:
    from src.ocr import ocr_with_easyocr, preprocess_image, mistral_ocr
    from src.utils import get_first_page_image
    from src.analyze import parse_invoice
except ImportError:
    raise SystemExit("❌  Could not import pipeline modules (src.*). "
                     "Run from repo root or fix PYTHONPATH.")

# ─── OCR wrapper ─────────────────────────────────────────────────────────────
def mistral_ocr_only(img_path=None):
    img_path = Path(img_path)
    if img_path.suffix.lower() == ".pdf":
        img = get_first_page_image(img_path)
    else:
        img = cv2.imread(str(img_path))
    if img is None:
        raise FileNotFoundError(f"Image not found: {img_path}")

    processed_img = preprocess_image(img)
    mistral_ocr_text = mistral_ocr(processed_img)
    parsed = parse_invoice(mistral_ocr_text)
    return parsed

def run_ocr_only(img_path: str | Path) -> dict:
    img_path = Path(img_path)
    if img_path.suffix.lower() == ".pdf":
        img = get_first_page_image(img_path)
    else:
        img = cv2.imread(str(img_path))
    if img is None:
        raise FileNotFoundError(f"Image not found: {img_path}")
    processed = preprocess_image(img)
    raw_text = ocr_with_easyocr(processed)
    return parse_invoice(raw_text)

# ─── helpers ─────────────────────────────────────────────────────────────────
def normalize(txt) -> str:
    txt = str(txt or "")
    txt = unicodedata.normalize("NFKC", txt)
    txt = txt.strip()
    txt = re.sub(r"\s+", " ", txt)
    txt = re.sub(r"[$,]", "", txt)
    return txt.lower()

def flatten_text_dict(d: dict) -> str:
    out = []
    for v in d.values():
        if isinstance(v, list):
            for item in v:
                out.extend(str(val) for val in (item.values() if isinstance(item, dict) else [item]))
        elif isinstance(v, dict):
            out.extend(str(val) for val in v.values())
        else:
            out.append(str(v))
    return normalize(" ".join(out))

# ─── ground-truth loader ─────────────────────────────────────────────────────
def load_gt_json(json_path: Path) -> dict[str, dict]:
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    # make sure every items list is sorted for determinism
    for v in data.values():
        if "items" in v and isinstance(v["items"], list):
            v["items"].sort(key=lambda x: json.dumps(x, sort_keys=True))
    return data

# ─── metrics ────────────────────────────────────────────────────────────────
MANDATORY_FIELDS = ("vendor", "invoice_total", "invoice_date")

def char_error_rate(pred: str, gold: str) -> float:
    import editdistance as ed
    return ed.eval(pred, gold) / len(gold) if gold else 0.0

def word_accuracy(pred: str, gold: str) -> float:
    p, g = pred.split(), gold.split()
    return sum(a == b for a, b in zip(p, g)) / len(g) if g else 1.0

def field_prf(pred: dict, gold: dict) -> dict[str, tuple[float, float, float]]:
    tp = Counter(); fp = Counter(); fn = Counter()
    for fld in MANDATORY_FIELDS:
        p = normalize(pred.get(fld, ""))
        g = normalize(gold.get(fld, ""))
        if not g:
            continue
        if p == g:
            tp[fld] += 1
        elif p:
            fp[fld] += 1; fn[fld] += 1
        else:
            fn[fld] += 1
    out = {}
    for fld in MANDATORY_FIELDS:
        P = tp[fld] / (tp[fld] + fp[fld] or 1)
        R = tp[fld] / (tp[fld] + fn[fld] or 1)
        F = 2*P*R / (P+R or 1)
        out[fld] = (P, R, F)
    return out

def exact_doc_match(pred: dict, gold: dict) -> bool:
    return all(normalize(pred.get(f, "")) == normalize(gold.get(f, "")) for f in MANDATORY_FIELDS)

# ─── evaluation loop ────────────────────────────────────────────────────────
def evaluate(gt: dict[str, dict], img_root: Path):
    charers, worders, exact = [], [], []
    field_scores = defaultdict(list)

    for rel_path, gold in gt.items():
        pred = run_ocr_only(img_root / rel_path)

        charers.append(char_error_rate(flatten_text_dict(pred),
                                       flatten_text_dict(gold)))
        worders.append(word_accuracy(flatten_text_dict(pred),
                                     flatten_text_dict(gold)))
        exact.append(exact_doc_match(pred, gold))

        for fld, (_, _, F) in field_prf(pred, gold).items():
            field_scores[fld].append(F)

    print(f"Exact-receipt accuracy : {sum(exact)/len(exact):.3f}")
    print(f"Mean CER              : {statistics.mean(charers):.3f}")
    print(f"Mean word accuracy    : {statistics.mean(worders):.3f}")
    for fld in MANDATORY_FIELDS:
        if field_scores[fld]:
            print(f"{fld:13s} F1 = {statistics.mean(field_scores[fld]):.3f}")

# ─── CLI ─────────────────────────────────────────────────────────────────────
def main(argv=None):
    ap = argparse.ArgumentParser(description="Evaluate receipt-OCR pipeline (JSON GT).")
    ap.add_argument("--images", type=Path, required=True,
                    help="Root folder that contains the images referenced in the JSON.")
    ap.add_argument("--gt", type=Path, required=True,
                    help="Path to ground-truth JSON file.")
    args = ap.parse_args(argv)

    gt = load_gt_json(args.gt)
    evaluate(gt, args.images)

if __name__ == "__main__":
    main()
