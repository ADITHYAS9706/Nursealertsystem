"""
RxSense — Prescription Parser | parser.py
Parses raw OCR text into structured medication data.
"""

import re


# ── Stop words that aren't drug names ──
_SKIP = {
    'patient','name','date','doctor','hospital','rx','diagnosis','ward',
    'age','sex','weight','address','sign','signature','prescription','dept',
    'department','inpatient','outpatient','ref','dr'
}

# ── Compiled patterns ──
_PATIENT  = re.compile(r'(?:patient|pt|name)\s*[:\-]?\s*([A-Za-z][A-Za-z\s]{1,35})', re.I)
_DOSE     = re.compile(r'(\d+(?:\.\d+)?\s*(?:mg|gm|g|ml|mcg|IU|units?|mEq))', re.I)
_ROUTE    = re.compile(r'\b(IV|IM|SC|SL|Oral|PO|INH|Topical|Rectal|Sub-?lingual)\b', re.I)
_FREQ     = re.compile(r'\b(QID|TID|BD|BID|OD|OW|OM|SOS|PRN|STAT)\b', re.I)
_DUR      = re.compile(r'(\d+)\s*(?:days?|d\b|wks?|weeks?)', re.I)
_DRUG     = re.compile(r'(?:(?:Tab|Cap|Inj|Syp|Syrup|Drops|Tablet|Capsule|Injection|Cream|Oint)\.?\s+)?([A-Z][a-zA-Z0-9\-]{2,})', )

# Normalise abbreviations
_ROUTE_NORM = {'PO': 'Oral', 'BID': 'BD', 'SUBLINGUAL': 'SL'}
_FREQ_NORM  = {'BID': 'BD'}


def parse_medicines(text: str):
    """
    Parse OCR text → (patient_name, list[dict]).
    Each dict: drug_name, dosage, route, frequency, duration_days.
    """
    patient = _extract_patient(text)
    meds    = []

    for line in text.splitlines():
        line = line.strip()
        if len(line) < 4:
            continue

        drug_m = _DRUG.search(line)
        dose_m = _DOSE.search(line)

        if not (drug_m and dose_m):
            continue

        drug = drug_m.group(1).strip()
        if drug.lower() in _SKIP or len(drug) < 3:
            continue

        dosage = dose_m.group(1).strip()

        route_m = _ROUTE.search(line)
        route   = route_m.group(1).upper() if route_m else 'Oral'
        route   = _ROUTE_NORM.get(route, route.capitalize())

        freq_m  = _FREQ.search(line)
        freq    = freq_m.group(1).upper() if freq_m else 'OD'
        freq    = _FREQ_NORM.get(freq, freq)

        dur_m   = _DUR.search(line)
        days    = _parse_duration(dur_m) if dur_m else None

        meds.append({
            'drug_name':    drug.capitalize(),
            'dosage':       dosage,
            'route':        route,
            'frequency':    freq,
            'duration_days': days
        })

    return patient, meds


def _extract_patient(text: str) -> str:
    m = _PATIENT.search(text)
    if m:
        name = m.group(1).strip().title()
        # trim trailing junk words
        words = [w for w in name.split() if len(w) > 1]
        return ' '.join(words[:4])  # max 4 word name
    return 'Unknown'


def _parse_duration(m) -> int:
    val  = int(m.group(1))
    raw  = m.group(0).lower()
    if 'week' in raw or 'wk' in raw:
        return val * 7
    return val