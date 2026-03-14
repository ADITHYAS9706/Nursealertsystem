import cv2
import easyocr
import numpy as np

reader = easyocr.Reader(['en'], gpu=False)


def preprocess_image(path):

    img = cv2.imread(path)

    if img is None:
        raise ValueError("Image not found")

    # enlarge image
    img = cv2.resize(img, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # remove noise
    gray = cv2.medianBlur(gray, 3)

    # increase contrast
    gray = cv2.convertScaleAbs(gray, alpha=1.8, beta=20)

    # threshold
    thresh = cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_MEAN_C,
        cv2.THRESH_BINARY,
        11,
        2
    )

    return thresh


def extract_text(image_path):

    img = preprocess_image(image_path)

    result = reader.readtext(
        img,
        detail=1,
        paragraph=True
    )

    lines = []

    for bbox, text, prob in result:

        if prob > 0.25:
            lines.append(text)

    return "\n".join(lines)
