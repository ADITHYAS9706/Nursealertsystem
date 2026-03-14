"""
RxSense — Nursing Alert Generator | nursing_alerts.py
Maps medication frequency codes to nurse alert times.
"""

# Standard nursing schedule (24-hour format)
SCHEDULE: dict[str, list[str]] = {
    'OD':   ['08:00'],
    'BD':   ['08:00', '20:00'],
    'TID':  ['08:00', '14:00', '20:00'],
    'QID':  ['06:00', '12:00', '18:00', '22:00'],
    'OW':   ['08:00'],                          # Once a week
    'OM':   ['08:00'],                          # Once a month
    'SOS':  ['As needed'],
    'PRN':  ['As needed'],
    'STAT': ['Immediately'],
}

LABELS: dict[str, str] = {
    'OD':   'Once Daily',
    'BD':   'Twice Daily',
    'TID':  'Thrice Daily',
    'QID':  'Four Times Daily',
    'OW':   'Once Weekly',
    'OM':   'Once Monthly',
    'SOS':  'When Required',
    'PRN':  'When Required',
    'STAT': 'Immediately',
}


def generate_alerts(medications: list[dict]) -> list[dict]:
    """
    Enrich each medication dict with alert_times and frequency_label.
    Returns the same list, modified in-place.
    """
    for med in medications:
        freq = (med.get('frequency') or 'OD').upper()
        med['alert_times']     = SCHEDULE.get(freq, ['08:00'])
        med['frequency_label'] = LABELS.get(freq, freq)
    return medications