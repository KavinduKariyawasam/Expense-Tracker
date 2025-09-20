import json
import os
import tempfile

import cv2
import requests
from dotenv import load_dotenv
from preprocess import preprocess_image

load_dotenv()

OCR_SPACE_API_KEY = os.getenv("OCR_SPACE_API_KEY", "helloworld")


def ocr_space_file(
    filename,
    overlay=False,
    api_key=OCR_SPACE_API_KEY,
    language="eng",
    use_preprocessing=True,
):
    """OCR.space API request with local file.
        Python3.5 - not tested on 2.7
    :param filename: Your file path & name.
    :param overlay: Is OCR.space overlay required in your response.
                    Defaults to False.
    :param api_key: OCR.space API key.
                    Defaults to 'helloworld'.
    :param language: Language code to be used in OCR.
                    List of available language codes can be found on https://ocr.space/OCRAPI
                    Defaults to 'en'.
    :param use_preprocessing: Whether to preprocess the image before OCR.
                             Defaults to True.
    :return: Result in JSON format.
    """
    if use_preprocessing:
        raw_image = cv2.imread(filename)
        if raw_image is None:
            raise FileNotFoundError(f"Could not read image: {filename}")

        preprocessed_image = preprocess_image(raw_image)

        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp_file:
            temp_filename = temp_file.name
            cv2.imwrite(temp_filename, preprocessed_image)

        file_to_process = temp_filename
    else:
        file_to_process = filename

    payload = {
        "isOverlayRequired": overlay,
        "apikey": api_key,
        "language": language,
    }

    try:
        with open(file_to_process, "rb") as f:
            r = requests.post(
                "https://api.ocr.space/parse/image",
                files={os.path.basename(file_to_process): f},
                data=payload,
            )
        result = r.content.decode()
    finally:
        if use_preprocessing and os.path.exists(temp_filename):
            os.unlink(temp_filename)

    return result


if __name__ == "__main__":
    result = ocr_space_file(
        "D:\\Projects\\expense\\data\\images\\13.jpg",
        api_key=OCR_SPACE_API_KEY,
        use_preprocessing=True,
    )
    # breakpoint()
    data = json.loads(result)
    print(data["ParsedResults"][0]["ParsedText"])
