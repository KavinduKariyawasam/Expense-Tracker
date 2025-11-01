import os

import cv2
import easyocr
from dotenv import load_dotenv
from logger import get_logger

logger = get_logger(__name__)

load_dotenv()

# Set up logger
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

def ocr_with_easyocr(image, langs=["en"]):
    logger.info("Starting OCR with EasyOCR...")
    EASYOCR_READER = easyocr.Reader(["en"], gpu=False)

    if len(image.shape) == 2:
        img = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
    else:
        img = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = EASYOCR_READER.readtext(img, detail=0, paragraph=True)

    text = "\n".join(results)
    return text


if __name__ == "__main__":
    img = cv2.imread("data/images/14.jpg", cv2.IMREAD_COLOR)
    pre = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(
        pre, None, h=11, templateWindowSize=31, searchWindowSize=9
    )
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))

    logger.info("EasyOCR Text:\n", ocr_with_easyocr(denoised))
