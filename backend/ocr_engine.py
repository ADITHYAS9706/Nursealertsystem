import easyocr

reader = easyocr.Reader(['en'])

def extract_text(image_path):

    result = reader.readtext(image_path)

    text = ""

    for (_, txt, prob) in result:

        if prob > 0.5:
            text += txt + "\n"

    return text