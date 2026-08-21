import os
import uuid
from typing import Optional
from fastapi import APIRouter, File, HTTPException, UploadFile
from app.ocr import extract_text_from_image

router = APIRouter(prefix="/api", tags=["Image TTS"])

TEMP_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "temp_audio")
os.makedirs(TEMP_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB limit


@router.post("/image-ocr")
@router.post("/ocr")
async def image_ocr_endpoint(
    image: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None)
):
    upload_file = image or file
    if not upload_file:
        raise HTTPException(status_code=400, detail="No image file provided.")

    filename = upload_file.filename or "image.jpg"
    ext = os.path.splitext(filename)[1].lower()

    is_image_content = upload_file.content_type and upload_file.content_type.startswith("image/")
    if not is_image_content and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid image format. Supported: JPG, JPEG, PNG, WEBP.")

    temp_filename = f"img_ocr_{uuid.uuid4()}{ext if ext else '.jpg'}"
    temp_path = os.path.join(TEMP_DIR, temp_filename)

    try:
        contents = await upload_file.read()
        if not contents or len(contents) == 0:
            raise HTTPException(status_code=400, detail="Uploaded image file is empty.")

        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="Image file is too large (max 10MB).")

        with open(temp_path, "wb") as f:
            f.write(contents)

        try:
            extracted_text = extract_text_from_image(temp_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"OCR failed to process image: {str(e)}")

        if not extracted_text or not str(extracted_text).strip():
            raise HTTPException(status_code=400, detail="No text was detected in this image. Please ensure text is clear.")

        clean_text = str(extracted_text).strip()
        return {
            "text": clean_text,
            "extracted_text": clean_text
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass