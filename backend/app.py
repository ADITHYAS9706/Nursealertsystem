from fastapi import FastAPI, UploadFile, File
import shutil
import os
import json

from ocr_engine import extract_text
from parser import parse_medicines
from nursing_alerts import generate_alerts


app = FastAPI()

# Upload folder
UPLOAD_FOLDER = "../uploads"
JSON_FOLDER = "../json_output"

# Create uploads folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(JSON_FOLDER, exist_ok=True)


@app.post("/upload")
async def upload(file: UploadFile = File(...)):

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)

    # Save uploaded file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Step 1: OCR text extraction
    text = extract_text(file_path)

    # Step 2: Parse medicines
    medicines = parse_medicines(text)

    # Step 3: Generate nurse alerts
    alerts = generate_alerts(medicines)
    
    # Create result JSON
    result = {
        "file_uploaded": file.filename,
        "extracted_text": text,
        "alerts": alerts
    }
  

    # Save JSON file
    json_file_path = os.path.join(JSON_FOLDER, file.filename + ".json")

    with open(json_file_path, "w") as json_file:
        json.dump(result, json_file, indent=4)

    return result