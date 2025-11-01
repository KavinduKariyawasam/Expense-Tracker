import base64
import cv2
import numpy as np
from mistralai import Mistral

from logger import get_logger
from core import config

logger = get_logger(__name__)

client = Mistral(api_key=config.ocr.MISTRAL_API_KEY)


def jpeg_bytes_from_ndarray(img: np.ndarray, quality: int = 90) -> bytes:
    ok, buf = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    if not ok:
        raise RuntimeError("JPEG encoding failed")
    return buf.tobytes()


def base64_from_bytes(b: bytes) -> str:
    return base64.b64encode(b).decode("utf-8")


def mistral_ocr(preprocessed):
    logger.info("Starting OCR with Mistral...")

    if preprocessed.dtype != np.uint8:
        preprocessed = cv2.normalize(preprocessed, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

    jpeg_bytes = jpeg_bytes_from_ndarray(preprocessed)
    b64_payload = base64_from_bytes(jpeg_bytes)

    ocr_response = client.ocr.process(
        model="mistral-ocr-latest",
        document={
            "type": "image_url",
            "image_url": f"data:image/jpeg;base64,{b64_payload}",
        },
        include_image_base64=False,
    )

    return ocr_response.pages[0].markdown
