from src.ocr.ocr_engine import ocr_with_easyocr, ocr_with_paddleocr
from src.analyze.llm_parse import parse_invoice, categorize_and_sum_items
import json
from src.ocr.preprocess import preprocess_image, preprocess
import cv2

src_path = r'D:\Projects\expense\data\images'

while input("\nDo you want to process another image? (y/n): ").lower() == 'y':
    img_id = int(input("Enter image id: "))
    img_path = f"{src_path}/{img_id}.jpg"
    processed_img = preprocess_image(img_path)
    # processed_img = preprocess(img_path)
    
    # paddle_ocr_text = ocr_with_paddleocr(processed_img)
    # # print("PaddleOCR Text:\n", paddle_ocr_text)

    # parsed = parse_invoice_groq(paddle_ocr_text)
    # print("Parsed paddle ocr Invoice Data:\n", json.dumps(parsed, indent=2))
        
    easy_ocr_text = ocr_with_easyocr(processed_img)
    # print("EasyOCR Text:\n", easy_ocr_text)

    parsed = parse_invoice(easy_ocr_text)
    
    print("Parsed easy ocr Invoice Data:\n", json.dumps(parsed, indent=2))
    
    categorized = categorize_and_sum_items(parsed.get("items", []))
    print("Categorized Totals:\n", json.dumps(categorized, indent=2))
