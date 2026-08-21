"""
image_translate.py
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import tempfile
import os
import asyncio
import traceback

from app.ocr import extract_text_from_image
from app.translator import translate_text

router = APIRouter()


from typing import Optional

@router.post("/image-translate")
async def image_translate(
    file: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None),
    target: str = Form(...)
):
    temp_path = None
    upload_file = file or image

    try:
        if not upload_file:
            raise HTTPException(status_code=400, detail="Please upload a valid image file.")

        filename = upload_file.filename or "image.jpg"
        suffix = os.path.splitext(filename)[1].lower()
        if not suffix:
            suffix = ".jpg"

        is_image_content = upload_file.content_type and upload_file.content_type.startswith("image/")
        if not is_image_content and suffix not in {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"}:
            raise HTTPException(status_code=400, detail="Please upload a valid image file (JPG, PNG, WEBP).")

        contents = await upload_file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded image is empty.")

        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(contents)
            temp_path = temp_file.name

        print(f"[1/3] Image saved at: {temp_path}. Running OCR...")

        # Run OCR
        extracted_text = await asyncio.to_thread(extract_text_from_image, temp_path)
        print(f"[2/3] Extracted text: {repr(extracted_text)}")

        if not extracted_text or not extracted_text.strip():
            raise HTTPException(
                status_code=400, 
                detail="No text detected in image. Please ensure text is clear and language is supported."
            )

        print(f"[3/3] Translating to target: {target}...")

        # Run Translation
        translated_text = await asyncio.to_thread(
            translate_text,
            text=extracted_text,
            source="auto",
            target=target,
        )

        return {
            "success": True,
            "filename": file.filename,
            "extracted_text": extracted_text,
            "translated_text": translated_text,
            "target_language": target
        }

    except HTTPException:
        raise

    except Exception as error:
        print("--- BACKEND CRASH ERROR ---")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(error))

    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass