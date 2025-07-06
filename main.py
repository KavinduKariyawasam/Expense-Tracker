from src.ocr import ocr_with_easyocr, ocr_with_paddleocr, preprocess_image, preprocess
from src.analyze import parse_invoice, categorize_and_sum_items
from src.utils import get_first_page_image
import cv2
import json

def run_ocr(img_path=None):
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
    # print("Parsed easy ocr Invoice Data:\n", json.dumps(parsed, indent=2))
    categorized = categorize_and_sum_items(parsed.get("items", []))
    # print("Categorized Totals:\n", json.dumps(categorized, indent=2))
    return parsed, categorized

if __name__ == "__main__":
    img_path = input("Enter the path to the image file (or press Enter to use default): ").strip().strip('"')
    parse_invoice, categorized = run_ocr(img_path)
    print("Parsed Invoice Data:\n", json.dumps(parse_invoice, indent=2))
    print("Categorized Totals:\n", json.dumps(categorized, indent=2))