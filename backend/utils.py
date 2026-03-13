import re


# Clean OCR text
def clean_text(text):

    text = text.replace("\n", " ")
    text = re.sub(r'\s+', ' ', text)

    return text.strip()


# Convert duration like "3 days" -> 3
def extract_duration(duration_text):

    if not duration_text:
        return None

    match = re.search(r'\d+', duration_text)

    if match:
        return int(match.group())

    return None


# Convert frequency to alert times
def frequency_to_times(freq):

    mapping = {

        "OD": ["08:00"],

        "BD": ["08:00", "20:00"],

        "TID": ["08:00", "14:00", "20:00"],

        "QID": ["06:00", "12:00", "18:00", "22:00"]

    }

    return mapping.get(freq, [])


# Check if OCR confidence is low
def check_unclear_handwriting(confidence):

    if confidence < 0.5:
        return True

    return False


# Normalize drug name (optional)
def normalize_drug_name(name):

    if not name:
        return None

    return name.capitalize()