from calendar import c
from multiprocessing import process
from src.ocr import ocr_with_easyocr, ocr_with_paddleocr, preprocess_image, preprocess, mistral_ocr
from src.analyze import parse_invoice, categorize_and_sum_items
from src.utils import get_first_page_image
import cv2
import json
import numpy as np

def mistral_ocr_only(img_path=None):
    if not img_path:
        img_path = 'data/images/13.jpg'

    if img_path.lower().endswith(".pdf"):
        img = get_first_page_image(img_path)
    else:
        img = cv2.imread(img_path)

    if img is None:
        print(f"Error: Could not load image from {img_path}")
        exit(1)

    processed_img = preprocess_image(img)
    mistral_ocr_text = mistral_ocr(processed_img)
    parsed = parse_invoice(mistral_ocr_text)
    return parsed

def run_ocr_only(img_path=None):
    if not img_path:
        img_path = 'data/images/13.jpg'

    if img_path.lower().endswith(".pdf"):
        img = get_first_page_image(img_path)
    else:
        img = cv2.imread(img_path)

    if img is None:
        print(f"Error: Could not load image from {img_path}")
        exit(1)

    processed_img = preprocess_image(img)
    easy_ocr_text = ocr_with_easyocr(processed_img)
    parsed = parse_invoice(easy_ocr_text)
    return parsed

def run_ocr_only_bytes(file_bytes=None, extension=None):
    if file_bytes:
        if extension.lower() in ['png', 'jpg', 'jpeg']:
            img_array = np.frombuffer(file_bytes, np.uint8)
            img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        elif extension.lower() == 'pdf':
            img = get_first_page_image(file_bytes)
        else:
            return None
    else:
        return None

    processed_img = preprocess_image(img)
    easy_ocr_text = ocr_with_easyocr(processed_img)
    parsed = parse_invoice(easy_ocr_text)
    return parsed

def categorize_totals(parsed_invoice):
    categorized = categorize_and_sum_items(parsed_invoice)
    return categorized

if __name__ == "__main__":
    img_path = input("Enter the path to the image file (or press Enter to use default): ").strip().strip('"')
    parse_invoice = run_ocr_only(img_path)
    print("Parsed Invoice Data:\n", json.dumps(parse_invoice, indent=2))
    categorized = categorize_totals(parse_invoice)
    print("Categorized Totals:\n", json.dumps(categorized, indent=2))