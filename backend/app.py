"""
RxSense — Nurse Alert System
FastAPI Backend
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import json
import time
from pathlib import Path

from ocr_engine import extract_text
from parser import parse_medicines
from nursing_alerts import generate_alerts


# ─────────────────────────────
# Create FastAPI App
# ─────────────────────────────
app = FastAPI(
    title="RxSense API",
    description="AI-powered prescription OCR and nurse alert scheduler",
    version="2.0.0"
)


# ─────────────────────────────
# Enable CORS
# ─────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────
# Storage folders
# ─────────────────────────────
BASE_DIR = Path(__file__).resolve().parent

UPLOADS = BASE_DIR / "uploads"
OUTPUTS = BASE_DIR / "json_output"

UPLOADS.mkdir(exist_ok=True)
OUTPUTS.mkdir(exist_ok=True)


ALLOWED_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf"
}


# ─────────────────────────────
# Root API
# ─────────────────────────────
@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "RxSense API",
        "docs": "/docs"
    }


# ─────────────────────────────
# Upload Prescription
# ─────────────────────────────
@app.post("/upload")
async def upload(file: UploadFile = File(...)):

    if not file:
        raise HTTPException(400, "No file uploaded")

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Unsupported file type")

    content = await file.read()

    if not content:
        raise HTTPException(400, "Empty file")

    filename = f"{int(time.time())}_{file.filename.replace(' ', '_')}"

    file_path = UPLOADS / filename

    with open(file_path, "wb") as f:
        f.write(content)

    # OCR extraction
    text = extract_text(str(file_path))

    print("OCR TEXT:")
    print(text)

    # Parse medicines
    patient, meds = parse_medicines(text)

    # Generate alerts
    alerts = generate_alerts(meds)

    result = {
        "patient_name": patient,
        "extracted_text": text,
        "alerts": alerts
    }

    # Save JSON
    json_file = OUTPUTS / f"{filename}.json"

    with open(json_file, "w") as jf:
        json.dump(result, jf, indent=2)

    # JSON shown directly on screen
    return result


# ─────────────────────────────
# History API
# ─────────────────────────────
@app.get("/history")
def history():

    records = []

    for file in OUTPUTS.glob("*.json"):
        try:
            records.append(json.loads(file.read_text()))
        except Exception:
            pass

    return {
        "count": len(records),
        "records": records
    }
