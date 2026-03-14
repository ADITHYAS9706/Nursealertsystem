"""
RxSense — OCR Engine | ocr_engine.py
Extracts text from prescription images using EasyOCR.
"""

import easyocr

_reader = None  # lazy-load: avoid reload penalty on every request

def _get_reader():
    global _reader
    if _reader is None:
        _reader = easyocr.Reader(['en'], gpu=False, verbose=False)
    return _reader


def extract_text(image_path: str) -> str:
    """
    Run OCR and return extracted text sorted top-to-bottom,
    including only results with confidence > 0.4.
    """
    try:
        reader  = _get_reader()
        results = reader.readtext(image_path, detail=1, paragraph=False)

        # Sort by vertical position (top of bounding box), then horizontal
        results_sorted = sorted(results, key=lambda r: (r[0][0][1], r[0][0][0]))

        lines = [txt.strip() for (_, txt, prob) in results_sorted if prob > 0.4 and txt.strip()]
        return "\n".join(lines)

    except FileNotFoundError:
        return "Error: file not found"
    except Exception as e:
        return f"OCR Error: {e}"