import cv2
import easyocr

from logger import get_logger

logger = get_logger(__name__)


def ocr_with_easyocr(image, langs=["en"]):
    logger.info("Starting OCR with EasyOCR...")
    
    logger.info(f"Initializing EasyOCR reader with languages: {langs}")
    easy_ocr_reader = easyocr.Reader(langs, gpu=False)

    if len(image.shape) == 2:
        logger.info("Image is grayscale, converting to RGB.")
        img = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
    else:
        logger.info("Image is color, converting BGR to RGB.")
        img = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
    logger.info("Performing OCR...")
    results = easy_ocr_reader.readtext(img, detail=0, paragraph=True)
    

    text = "\n".join(results)
    return text


if __name__ == "__main__":
    img = cv2.imread("data/images/14.jpg", cv2.IMREAD_COLOR)
    pre = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(pre, None, h=11, templateWindowSize=31, searchWindowSize=9)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))

    logger.info("EasyOCR Text:\n", ocr_with_easyocr(denoised))
