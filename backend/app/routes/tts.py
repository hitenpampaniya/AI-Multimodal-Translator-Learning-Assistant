import os
import uuid
import traceback
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from app.schemas import TTSRequest
from gtts import gTTS

router = APIRouter(prefix="/api", tags=["TTS"])

AUDIO_DIR = Path("static_audio")
AUDIO_DIR.mkdir(exist_ok=True)

@router.post("/tts")
async def text_to_speech(payload: TTSRequest):
    try:
        if not payload.text or not payload.text.strip():
            raise HTTPException(status_code=400, detail="Please enter some text.")
        
        text = payload.text.strip()
        
        # Determine language code safely from voice string
        lang_code = "en"
        if payload.voice:
            if "hi-IN" in payload.voice:
                lang_code = "hi"
            elif "gu-IN" in payload.voice:
                lang_code = "gu"
            elif "-" in payload.voice:
                lang_code = payload.voice.split("-")[0].lower()

        output_file = AUDIO_DIR / f"tts_{uuid.uuid4()}.mp3"
        success = False

        # 1. Try primary app.tts service (edge-tts)
        try:
            from app.tts import generate_speech
            generated_path = await generate_speech(text, payload.voice, payload.speed)
            if generated_path and os.path.exists(generated_path) and os.path.getsize(generated_path) > 0:
                output_file = Path(generated_path)
                success = True
        except Exception as service_err:
            print(f"Primary TTS service notice: {service_err}. Switching to gTTS fallback...")

        # 2. Fallback to gTTS if primary service fails
        if not success:
            try:
                tts = gTTS(text=text, lang=lang_code, slow=False)
                tts.save(str(output_file))
                if output_file.exists() and output_file.stat().st_size > 0:
                    success = True
            except Exception as gtts_err:
                print(f"gTTS fallback error: {gtts_err}")

        if not success or not os.path.exists(output_file) or os.path.getsize(output_file) == 0:
            raise HTTPException(status_code=500, detail="Unable to generate speech. Please try again.")

        return FileResponse(
            str(output_file), 
            media_type="audio/mpeg", 
            filename=os.path.basename(output_file)
        )

    except HTTPException as he:
        raise he
    except Exception as e:
        print("\n========== TTS ROUTE ERROR ==========")
        traceback.print_exc()
        print("=====================================\n")
        raise HTTPException(status_code=500, detail="Unable to generate speech. Please try again.")

@router.get("/tts/voices")
async def list_voices():
    try:
        from app.tts import get_available_voices
        voices = await get_available_voices()
        return voices
    except Exception as e:
        # Fallback standard voices list
        return [
            {"name": "hi-IN-MadhurNeural", "language": "hi", "gender": "Male", "locale": "hi-IN"},
            {"name": "hi-IN-SwaraNeural", "language": "hi", "gender": "Female", "locale": "hi-IN"},
            {"name": "en-US-AriaNeural", "language": "en", "gender": "Female", "locale": "en-US"},
            {"name": "en-US-GuyNeural", "language": "en", "gender": "Male", "locale": "en-US"}
        ]