import os, base64, cv2, numpy as np, logging
from io import BytesIO
from mistralai import Mistral
from dotenv import load_dotenv
import logging
from src.utils import ColorFormatter
import sys
# from src.ocr.preprocess import preprocess_image 

load_dotenv()

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

handler = logging.StreamHandler(sys.stdout)
formatter = ColorFormatter('%(asctime)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logging.basicConfig(level=LOG_LEVEL, handlers=[handler])
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
client  = Mistral(api_key=MISTRAL_API_KEY)

def jpeg_bytes_from_ndarray(img: np.ndarray, quality: int = 90) -> bytes:
    ok, buf = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    if not ok:
        raise RuntimeError("JPEG encoding failed")
    return buf.tobytes()

def base64_from_bytes(b: bytes) -> str:
    return base64.b64encode(b).decode("utf-8")

def mistral_ocr(preprocessed):
    logging.info("Starting OCR with Mistral...")
    # raw_bgr = cv2.imread(image_path)
    # if raw_bgr is None:
    #     raise FileNotFoundError(image_path)

    # preprocessed = preprocess_image(raw_bgr)

    if preprocessed.dtype != np.uint8:
        preprocessed = cv2.normalize(preprocessed, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

    jpeg_bytes   = jpeg_bytes_from_ndarray(preprocessed)
    b64_payload  = base64_from_bytes(jpeg_bytes)

    ocr_response = client.ocr.process(
        model="mistral-ocr-latest",
        document={
            "type": "image_url",
            "image_url": f"data:image/jpeg;base64,{b64_payload}"
        },
        include_image_base64=False
    )

    return ocr_response.pages[0].markdown
