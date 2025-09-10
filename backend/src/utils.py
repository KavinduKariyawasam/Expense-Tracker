from PIL import Image
from docuwarp.unwarp import Unwarp
import cv2
import numpy as np
import fitz
from PIL import Image
import logging

class ColorFormatter(logging.Formatter):
    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[32m',     # Green
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[41m', # Red background
    }
    RESET = '\033[0m'

    def format(self, record):
        color = self.COLORS.get(record.levelname, self.RESET)
        message = super().format(record)
        return f"{color}{message}{self.RESET}"

def unwarp_image(image_path):
    unwarp = Unwarp(providers=["CPUExecutionProvider"])
    image = Image.open(image_path)
    unwarped_image = unwarp.inference(image)
    return unwarped_image


def get_first_page_image(file_bytes, zoom=2):
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    page = doc.load_page(0)
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat)
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    # cv2.imshow("PDF Page Image", np.array(img))
    # cv2.waitKey(0)
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
