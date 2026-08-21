import os
from faster_whisper import WhisperModel

# Singleton model loader to prevent reloading on every request
_whisper_model = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        # Using "base" model on CPU with int8 quantization for efficient processing
        _whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
    return _whisper_model

def transcribe_audio(audio_path: str, language: str = None):
    model = get_whisper_model()
    lang_param = None if not language or language == "auto" else language
    
    segments, info = model.transcribe(audio_path, language=lang_param)
    text = " ".join([segment.text for segment in segments]).strip()
    detected_lang = info.language if not lang_param else lang_param
    
    return text, detected_lang