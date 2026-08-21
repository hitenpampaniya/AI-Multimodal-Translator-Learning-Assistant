import os
import shutil
import uuid
import subprocess
import traceback
from pathlib import Path
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from fastapi.responses import FileResponse
from deep_translator import GoogleTranslator
import speech_recognition as sr
from gtts import gTTS

# Get bundled ffmpeg executable path from imageio-ffmpeg automatically
try:
    import imageio_ffmpeg
    FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG_EXE = "ffmpeg"

router = APIRouter(prefix="/api", tags=["Voice Translator"])

UPLOAD_DIR = Path("temp_audio")
UPLOAD_DIR.mkdir(exist_ok=True)
AUDIO_OUTPUT_DIR = Path("static_audio")
AUDIO_OUTPUT_DIR.mkdir(exist_ok=True)

# Map short codes to Google Speech Recognition locale codes for high accuracy
GOOGLE_LANG_MAP = {
    "en": "en-US",
    "hi": "hi-IN",
    "gu": "gu-IN",
    "es": "es-ES",
    "fr": "fr-FR",
    "de": "de-DE",
    "ja": "ja-JP",
    "zh": "zh-CN",
    "ar": "ar-SA",
    "pt": "pt-PT",
    "ru": "ru-RU"
}

@router.post("/voice-translate")
async def voice_translate(
    audio: UploadFile = File(...),
    source_language: str = Form("auto"),
    target_language: str = Form("en")
):
    temp_input_path = UPLOAD_DIR / f"input_{uuid.uuid4()}.webm"
    wav_path = UPLOAD_DIR / f"converted_{uuid.uuid4()}.wav"
    output_audio_filename = f"translated_{uuid.uuid4()}.mp3"
    output_audio_path = AUDIO_OUTPUT_DIR / output_audio_filename

    try:
        # 1. Save uploaded browser audio recording temporarily
        with open(temp_input_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)

        print(f"\n[Voice Translate] Received audio file size: {os.path.getsize(temp_input_path)} bytes")

        # 2. Convert webm to wav directly using subprocess & bundled ffmpeg
        try:
            cmd = [
                FFMPEG_EXE,
                "-y",
                "-i", str(temp_input_path),
                "-ar", "16000",
                "-ac", "1",
                str(wav_path)
            ]
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if result.returncode != 0:
                print(f"FFmpeg error: {result.stderr.decode('utf-8', errors='ignore')}")
                raise Exception("FFmpeg conversion failed.")
        except Exception as conv_err:
            print(f"Audio conversion notice: {conv_err}")
            raise HTTPException(status_code=400, detail="Failed to process recorded audio. Please try speaking again.")

        # 3. Read audio file data via SpeechRecognition
        recognizer = sr.Recognizer()
        try:
            with sr.AudioFile(str(wav_path)) as source_audio:
                audio_data = recognizer.record(source_audio)
        except Exception as audio_err:
            print(f"Audio read error: {audio_err}")
            raise HTTPException(
                status_code=400, 
                detail="Could not read recorded audio file. Please try speaking again."
            )

        # 4. Transcribe Speech to Text (Google STT with proper locale mapping)
        try:
            # Determine correct speech locale
            lang_code = GOOGLE_LANG_MAP.get(source_language, "en-US")
            print(f"[Voice Translate] Transcribing using locale: {lang_code} (Source requested: {source_language})")
            
            source_text = recognizer.recognize_google(audio_data, language=lang_code)
        except sr.UnknownValueError:
            # If auto-detect or specific language failed, try fallback to English as a safety net
            if source_language == "auto":
                try:
                    print("[Voice Translate] Auto fallback to en-US...")
                    source_text = recognizer.recognize_google(audio_data, language="en-US")
                except:
                    raise HTTPException(status_code=400, detail="Could not understand audio. Please speak clearly into your microphone.")
            else:
                raise HTTPException(status_code=400, detail=f"Could not understand audio in selected language ({source_language}). Please try speaking clearly.")
        except sr.RequestError as req_err:
            raise HTTPException(status_code=500, detail=f"Speech recognition service error: {req_err}")

        if not source_text:
            raise HTTPException(status_code=400, detail="No speech detected in the audio recording.")

        print(f"[Voice Translate] Recognized text: {source_text}")

        # 5. Translate text using deep-translator
        # If source is auto, let deep-translator detect it automatically
        trans_source = source_language if source_language != "auto" else "auto"
        translator = GoogleTranslator(source=trans_source, target=target_language)
        translated_text = translator.translate(source_text)

        print(f"[Voice Translate] Translated text: {translated_text}")

        # 6. Generate Voice Audio (TTS) for the translated text
        audio_url = ""
        try:
            tts_lang = target_language if target_language != "auto" else "en"
            tts = gTTS(text=translated_text, lang=tts_lang, slow=False)
            tts.save(str(output_audio_path))
            audio_url = f"/api/voice-translate/audio/{output_audio_filename}"
        except Exception as tts_err:
            print(f"TTS generation notice: {tts_err}")

        return {
            "success": True,
            "source_text": source_text,
            "translated_text": translated_text,
            "audio_url": audio_url
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print("\n========== VOICE TRANSLATE ERROR TRACEBACK ==========")
        traceback.print_exc()
        print("=====================================================\n")
        raise HTTPException(status_code=500, detail=f"Voice translation error: {str(e)}")
    finally:
        # Cleanup temporary uploaded files
        for p in [temp_input_path, wav_path]:
            if p.exists():
                try:
                    os.remove(p)
                except:
                    pass

@router.get("/voice-translate/audio/{filename}")
async def get_translated_audio(filename: str):
    file_path = AUDIO_OUTPUT_DIR / filename
    if file_path.exists():
        return FileResponse(file_path, media_type="audio/mpeg")
    raise HTTPException(status_code=404, detail="Translated audio file not found.")