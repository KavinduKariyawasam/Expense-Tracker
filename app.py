from fastapi import FastAPI, Path, UploadFile, File
from backend.main import run_ocr_only, run_ocr_only_bytes

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Welcome to the Invoice OCR API v1.0.0."}

@app.post("/parse-invoice/")
async def parse_invoice(file: UploadFile = File(...)):
    """
    Parse an invoice image file and return the parsed data.
    """
    extension = file.filename.split('.')[-1].lower()
    if extension not in ['png', 'jpg', 'jpeg', 'pdf']:
        return {"error": "Unsupported file type. Please upload a PNG, JPG, JPEG, or PDF file."}
    try:
        file_bytes = await file.read()
        parsed_data = run_ocr_only_bytes(file_bytes, extension=extension)
    except Exception as e:
        return {"error": f"An error occurred while processing the file: {str(e)}"}
    return {"filename": file.filename, 
            "content_type": file.content_type,
            "parsed_data": parsed_data}