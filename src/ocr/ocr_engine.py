import cv2
import easyocr
import numpy as np
from paddleocr import PaddleOCR
import cv2
from src.utils import ColorFormatter
import logging
import os
from dotenv import load_dotenv

load_dotenv()

# Set up logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
handler = logging.StreamHandler()
formatter = ColorFormatter('%(asctime)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logging.basicConfig(level=LOG_LEVEL, handlers=[handler])

# Initialize EasyOCR reader
EASYOCR_READER = easyocr.Reader(['en'], gpu=False)

def ocr_with_easyocr(image, langs = ['en']):
    logging.info("Starting OCR with EasyOCR...")
    if len(image.shape) == 2:
        img = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
    else:
        img = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = EASYOCR_READER.readtext(img, detail=0, paragraph=True)
    
    # for (bbox, text, prob) in results:
    #     print(f'Text: {text}, Probability: {prob}')
    # print(results)
    text = "\n".join(results)
    return text

def ocr_with_paddleocr(denoised_image):
    logging.info("Starting OCR with PaddleOCR...")
    # ocr = PaddleOCR(
    #     use_doc_orientation_classify=False, 
    #     use_doc_unwarping=False, 
    #     use_textline_orientation=False) # text detection + text recognition
    ocr = PaddleOCR(use_doc_orientation_classify=True, use_doc_unwarping=True) # text image preprocessing + text detection + textline orientation classification + text recognition
    # ocr = PaddleOCR(use_doc_orientation_classify=False, use_doc_unwarping=False) # text detection + textline orientation classification + text recognition
    # ocr = PaddleOCR(
    #     text_detection_model_name="PP-OCRv5_mobile_det",
    #     text_recognition_model_name="PP-OCRv5_mobile_rec",
    #     use_doc_orientation_classify=False,
    #     use_doc_unwarping=False,
    #     use_textline_orientation=False) # Switch to PP-OCRv5_mobile models
    # result = ocr.predict(r"D:\Projects\expense\data\images\1.jpg")


    # Convert grayscale to 3-channel (RGB format)
    denoised_rgb = cv2.cvtColor(denoised_image, cv2.COLOR_GRAY2RGB)
    result = ocr.ocr(denoised_rgb)
    # print("PaddleOCR Result:", result[0]["rec_texts"])
        # breakpoint()
    return result[0]["rec_texts"]
        # for res in result:
    #     res.print()
    #     res.save_to_img("output")
    #     res.save_to_json("output")


if __name__ == '__main__':
    img = cv2.imread('data/images/14.jpg', cv2.IMREAD_COLOR)
    pre = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(pre, None, h=11, templateWindowSize=31, searchWindowSize=9)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    # cli = clahe.apply(denoised)
    # th = cv2.adaptiveThreshold(
    #     cli, 255,
    #     cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
    #     cv2.THRESH_BINARY,
    #     blockSize=15, C=2
    # )
    print("EasyOCR Text:\n", ocr_with_easyocr(denoised))