import cv2
import numpy as np
from skimage import io, color
import matplotlib.pyplot as plt
from scipy.fftpack import dct, idct
from skimage import filters, morphology, measure
from scipy.ndimage import binary_fill_holes
import numpy as np

def order_points(pts):
    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1)
    rect = np.zeros((4, 2), dtype="float32")
    rect[0] = pts[np.argmin(s)]       # top-left
    rect[2] = pts[np.argmax(s)]       # bottom-right
    rect[1] = pts[np.argmin(diff)]    # top-right
    rect[3] = pts[np.argmax(diff)]    # bottom-left
    return rect

def preprocess_image(img_path):
    img = io.imread(img_path)
    gray = color.rgb2gray(img)
    frequencies = dct(dct(gray, axis=0), axis=1)
    frequencies[:2,:2] = 0
    gray = idct(idct(frequencies, axis=1), axis=0)
    gray = (gray - gray.min()) / (gray.max() - gray.min())
    
    mask = filters.gaussian(gray, 2) > 0.5
    mask = morphology.binary_closing(mask, footprint=morphology.disk(2))
    mask = binary_fill_holes(mask, structure=morphology.disk(3, bool))
    mask = measure.label(mask)
    mask = (mask == 1 + np.argmax([r.filled_area for r in measure.regionprops(mask)]))

    mask_uint8 = (mask * 255).astype(np.uint8)
    contours, _ = cv2.findContours(mask_uint8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    largest_contour = max(contours, key=cv2.contourArea)

    epsilon = 0.02 * cv2.arcLength(largest_contour, True)
    approx = cv2.approxPolyDP(largest_contour, epsilon, True)

    if len(approx) == 4:
        corners = approx.reshape(4, 2).astype(np.float32)
    else:
        print("Irregular contour skipping warp.")
        rect = cv2.minAreaRect(largest_contour)
        box = cv2.boxPoints(rect)
        corners = box.astype(np.float32)


    ordered_pts = order_points(corners)

    (tl, tr, br, bl) = ordered_pts
    widthA = np.linalg.norm(br - bl)
    widthB = np.linalg.norm(tr - tl)
    maxWidth = int(max(widthA, widthB))

    heightA = np.linalg.norm(tr - br)
    heightB = np.linalg.norm(tl - bl)
    maxHeight = int(max(heightA, heightB))

    if maxWidth < 10 or maxHeight < 10:
        print("Skipping warping: dimensions too small")
        warped = (img * 255).astype(np.uint8)
    else:
        dst = np.array([
            [0, 0],
            [maxWidth - 1, 0],
            [maxWidth - 1, maxHeight - 1],
            [0, maxHeight - 1]], dtype="float32")

        M = cv2.getPerspectiveTransform(ordered_pts, dst)
        warped = cv2.warpPerspective((img * 255).astype(np.uint8), M, (maxWidth, maxHeight))

    return warped