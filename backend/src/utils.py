import cv2
import fitz
import numpy as np
from PIL import Image


def get_first_page_image(file_bytes, zoom=2):
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    page = doc.load_page(0)
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat)
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    # cv2.imshow("PDF Page Image", np.array(img))
    # cv2.waitKey(0)
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
