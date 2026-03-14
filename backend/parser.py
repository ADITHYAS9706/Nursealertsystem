"""
RxSense — Prescription Parser
Converts OCR text into structured medication JSON
"""

import re


# -----------------------------
# Regex patterns
# -----------------------------

PATIENT_PATTERN = re.compile(
    r'(?:patient|name|pt)\s*[:\-]?\s*([A-Za-z][A-Za-z\s]{2,40})',
    re.IGNORECASE
)

DOSAGE_PATTERN = re.compile(
    r'(\d+(?:\.\d+)?\s*(?:mg|g|gm|ml|mcg|iu|units?))',
    re.IGNORECASE
)

FREQ_PATTERN = re.compile(
    r'\b(OD|BD|BID|TID|QID|SOS|PRN|STAT)\b',
    re.IGNORECASE
)

ROUTE_PATTERN = re.compile(
    r'\b(IV|IM|SC|PO|ORAL|SL)\b',
    re.IGNORECASE
)

DURATION_PATTERN = re.compile(
    r'(\d+)\s*(?:days?|d|weeks?|wks?)',
    re.IGNORECASE
)


# Detect drug names
DRUG_PATTERN = re.compile(
    r'(?:tab|tablet|cap|capsule|inj|injection|syp|syrup)?\.?\s*([A-Z][a-zA-Z]{2,})',
    re.IGNORECASE
)


# -----------------------------
# Normalization maps
# -----------------------------

ROUTE_MAP = {
    "PO": "Oral",
    "ORAL": "Oral",
    "IV": "Iv",
    "IM": "Im",
    "SC": "Sc",
    "SL": "Sl"
}

FREQ_MAP = {
    "BID": "BD"
}


# -----------------------------
# Clean OCR text
# -----------------------------

def clean_text(text):

    text = text.replace("\r", "\n")

    text = re.sub(r'[|]', ' ', text)

    text = re.sub(r'\s+', ' ', text)

    return text.strip()


# -----------------------------
# Extract patient name
# -----------------------------

def extract_patient(text):

    m = PATIENT_PATTERN.search(text)

    if m:
        name = m.group(1).strip().title()

        words = [w for w in name.split() if len(w) > 1]

        return " ".join(words[:4])

    return "Unknown"


# -----------------------------
# Convert duration
# -----------------------------

def parse_duration(match):

    if not match:
        return None

    val = int(match.group(1))

    raw = match.group(0).lower()

    if "week" in raw or "wk" in raw:
        return val * 7

    return val


# -----------------------------
# Parse medicines
# -----------------------------

def parse_medicines(text):

    text = clean_text(text)

    patient = extract_patient(text)

    meds = []

    # split into possible medicine lines
    lines = re.split(r'\n|\. ', text)

    for line in lines:

        line = line.strip()

        if len(line) < 4:
            continue

        drug_m = DRUG_PATTERN.search(line)
        dose_m = DOSAGE_PATTERN.search(line)

        # must contain at least drug + dosage
        if not drug_m or not dose_m:
            continue

        drug = drug_m.group(1).strip().capitalize()

        dosage = dose_m.group(1).strip()

        # route
        route_m = ROUTE_PATTERN.search(line)
        route = route_m.group(1).upper() if route_m else "Oral"
        route = ROUTE_MAP.get(route, route.capitalize())

        # frequency
        freq_m = FREQ_PATTERN.search(line)
        freq = freq_m.group(1).upper() if freq_m else "OD"
        freq = FREQ_MAP.get(freq, freq)

        # duration
        dur_m = DURATION_PATTERN.search(line)
        duration = parse_duration(dur_m)

        meds.append({
            "drug_name": drug,
            "dosage": dosage,
            "route": route,
            "frequency": freq,
            "duration_days": duration
        })

    return patient, meds