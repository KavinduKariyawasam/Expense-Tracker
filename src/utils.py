# from jdeskew.estimator import get_angle
# from jdeskew.utility import rotate
# import cv2

# image = cv2.imread(r'D:\Projects\expense\data\images\5.jpg')

# angle = get_angle(image)

# output_image = rotate(image, angle)

# cv2.imshow("Deskewed Image", output_image)
# cv2.waitKey(0)


# docuwarp

from PIL import Image
from docuwarp.unwarp import Unwarp
import cv2
import numpy as np
import fitz
from PIL import Image

def unwarp_image(image_path):
    unwarp = Unwarp(providers=["CPUExecutionProvider"])
    image = Image.open(image_path)
    unwarped_image = unwarp.inference(image)
    return unwarped_image


def get_first_page_image(pdf_path, zoom=2):
    doc = fitz.open(pdf_path)
    page = doc.load_page(0)
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat)
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    cv2.imshow("PDF Page Image", np.array(img))
    cv2.waitKey(0)
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
