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

unwarp = Unwarp(providers=["CPUExecutionProvider"])
image = Image.open(r'D:\Projects\expense\data\images\12.jpg')
unwarped_image = unwarp.inference(image)
unwarped_cv = cv2.cvtColor(np.array(unwarped_image), cv2.COLOR_RGB2BGR)

cv2.imshow("Unwarped Image", unwarped_cv)
cv2.waitKey(0)
cv2.destroyAllWindows()
