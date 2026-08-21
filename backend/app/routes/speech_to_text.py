import os
import uuid
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from app.speech_to_text import speech_to_text
from app.schemas import SpeechToTextResponse

router = APIRouter(prefix="/api", tags=["Speech to Text"])

TEMP_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "temp_audio")
os.makedirs(TEMP_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".webm", ".mp3", ".wav", ".m4a", ".ogg"}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB limit

@router.post("/speech-to-text", response_model=SpeechToTextResponse)
async def transcribe_speech(
    audio: UploadFile = File(...),
    language: str = Form("auto")
):
    filename = audio.filename or "recording.webm"
    ext = os.path.splitext(filename)[1].lower()
    
    if ext not in ALLOWED_EXTENSIONS and not audio.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Invalid audio file.")

    temp_filename = f"recording_{uuid.uuid4()}{ext if ext else '.webm'}"
    temp_path = os.path.join(TEMP_DIR, temp_filename)

    try:
        contents = await audio.read()
        if not contents or len(contents) == 0:
            raise HTTPException(status_code=400, detail="No speech detected. Please try again.")
        
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="Audio file is too large.")

        with open(temp_path, "wb") as f:
            f.write(contents)

        result = await speech_to_text(temp_path, language=language)
        
        if not result.get("text"):
            raise HTTPException(status_code=400, detail="No speech detected. Please try again.")

        return SpeechToTextResponse(
            text=result["text"],
            language=result.get("language")
        )

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail="Could not convert speech to text.")
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass