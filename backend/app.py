"""
RxSense — Nurse Alert System
FastAPI Backend

Run:
uvicorn app:app --reload

Docs:
http://127.0.0.1:8000/docs
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
# App
# ─────────────────────────────
app = FastAPI(
    title="RxSense API",
    description="AI-powered prescription OCR and nurse alert scheduler",
    version="2.0.0"
)


# ─────────────────────────────
# CORS
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


# ─────────────────────────────
# Config
# ─────────────────────────────
ALLOWED_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf"
}

MAX_SIZE_MB = 20


# ─────────────────────────────
# Routes
# ─────────────────────────────

@app.get("/", tags=["Health"])
def root():
    return {
        "status": "ok",
        "service": "RxSense API v2.0",
        "docs": "/docs"
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}


# ─────────────────────────────
# Upload Prescription
# ─────────────────────────────
@app.post("/upload", tags=["Prescription"])
async def upload(file: UploadFile = File(...)):

    if not file:
        raise HTTPException(400, "No file uploaded")

    # Validate file type
    if file.content_type and file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}")

    content = await file.read()

    if not content:
        raise HTTPException(400, "Uploaded file is empty")

    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(413, f"File exceeds {MAX_SIZE_MB} MB limit")

    # Safe filename
    original_name = file.filename or "prescription.png"
    safe_name = original_name.replace(" ", "_")

    # Unique filename
    filename = f"{int(time.time())}_{safe_name}"

    file_path = UPLOADS / filename

    # Save uploaded file
    with open(file_path, "wb") as f:
        f.write(content)

    # OCR
    text = extract_text(str(file_path))

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
    json_path = OUTPUTS / f"{filename}.json"

    with open(json_path, "w") as jf:
        json.dump(result, jf, indent=2)

    return result


# ─────────────────────────────
# History Endpoint
# ─────────────────────────────
@app.get("/history", tags=["Prescription"])
def history():

    records = []

    for file in sorted(
        OUTPUTS.glob("*.json"),
        key=lambda x: x.stat().st_mtime,
        reverse=True
    ):
        try:
            records.append(json.loads(file.read_text()))
        except Exception:
            pass

    return {
        "count": len(records),
        "records": records
    }