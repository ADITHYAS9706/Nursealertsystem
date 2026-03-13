
import re

def parse_medicines(text):

    medicines = []

    lines = text.split("\n")

    for line in lines:

        drug = re.search(r'[A-Za-z]+', line)

        dose = re.search(r'\d+\s?mg', line)

        route = re.search(r'(IV|IM|Oral)', line)

        freq = re.search(r'(OD|BD|TID|QID|SOS)', line)

        duration = re.search(r'\d+\s?days', line)

        medicines.append({

            "drug_name": drug.group() if drug else None,
            "dosage": dose.group() if dose else None,
            "route": route.group() if route else None,
            "frequency": freq.group() if freq else None,
            "duration_days": duration.group() if duration else None

        })

    return medicines