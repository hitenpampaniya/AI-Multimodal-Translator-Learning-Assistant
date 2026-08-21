import os
import uuid
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from app.pdf_translator import translate_pdf_content
from app.pdf_generator import generate_pdf_from_text

router = APIRouter(prefix="/api", tags=["PDF Translate"])

TEMP_PDF_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "temp_pdf")
GEN_PDF_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "generated_pdfs")
os.makedirs(TEMP_PDF_DIR, exist_ok=True)
os.makedirs(GEN_PDF_DIR, exist_ok=True)

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB

@router.post("/pdf-translate")
async def pdf_translate_endpoint(
    file: UploadFile = File(...),
    source_language: str = Form("auto"),
    target_language: str = Form("hi")
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Please select a PDF.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext != ".pdf" or file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_id = str(uuid.uuid4())
    temp_input_path = os.path.join(TEMP_PDF_DIR, f"{file_id}.pdf")
    output_filename = f"translated_{file.filename}"
    output_pdf_path = os.path.join(GEN_PDF_DIR, f"{file_id}_{output_filename}")

    try:
        contents = await file.read()
        if not contents or len(contents) == 0:
            raise HTTPException(status_code=400, detail="Please select a PDF.")
        
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="PDF size exceeds the maximum allowed size.")

        with open(temp_input_path, "wb") as f:
            f.write(contents)

        try:
            translated_pages = await translate_pdf_content(
                temp_input_path, 
                source_language, 
                target_language
            )
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))
        except Exception as e:
            raise HTTPException(status_code=500, detail="Translation failed. Please try again.")

        try:
            generate_pdf_from_text(translated_pages, output_pdf_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail="Could not generate translated PDF.")

        return {
            "message": "PDF translated successfully",
            "filename": output_filename,
            "download_url": f"/api/pdf-translate/download/{file_id}"
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail="Something went wrong. Please try again.")
    finally:
        if os.path.exists(temp_input_path):
            try:
                os.remove(temp_input_path)
            except:
                pass

@router.get("/pdf-translate/download/{file_id}")
async def download_translated_pdf(file_id: str):
    matching_files = [f for f in os.listdir(GEN_PDF_DIR) if f.startswith(file_id)]
    if not matching_files:
        raise HTTPException(status_code=404, detail="Translated PDF not found.")
    
    filename = matching_files[0]
    file_path = os.path.join(GEN_PDF_DIR, filename)
    download_name = filename.split("_", 1)[1] if "_" in filename else "translated_document.pdf"

    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=download_name
    )