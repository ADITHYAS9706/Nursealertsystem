def generate_alerts(medicines):

    freq_map = {

        "OD": ["08:00"],
        "BD": ["08:00", "20:00"],
        "TID": ["08:00", "14:00", "20:00"],
        "QID": ["06:00", "12:00", "18:00", "22:00"]

    }

    alerts = []

    for med in medicines:

        freq = med["frequency"]

        if freq == "SOS":
            continue

        alerts.append({

            "drug_name": med["drug_name"],
            "dosage": med["dosage"],
            "route": med["route"],
            "frequency": freq,
            "duration_days": med["duration_days"],
            "alert_times": freq_map.get(freq, [])

        })

    return {"alerts": alerts}