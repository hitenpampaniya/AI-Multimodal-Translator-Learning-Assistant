import os
from faster_whisper import WhisperModel

_whisper_model = None

def get_whisper_model():
    """
    Loads and caches the Whisper model once (singleton pattern).
    Model size options:
      - tiny: Fastest, lowest resource usage, lowest accuracy
      - base: Practical balance for normal development and local hardware (Default)
      - small: Higher accuracy, slightly slower
      - medium / large: High accuracy, heavy CPU/memory footprint
    """
    global _whisper_model
    if _whisper_model is None:
        model_size = os.getenv("WHISPER_MODEL", "base")
        _whisper_model = WhisperModel(model_size, device="cpu", compute_type="int8")
    return _whisper_model

async def speech_to_text(audio_file: str, language: str | None = None):
    if not os.path.exists(audio_file):
        raise FileNotFoundError("Audio file not found.")
    
    model = get_whisper_model()
    lang_param = None if not language or language == "auto" else language
    
    segments, info = model.transcribe(audio_file, language=lang_param)
    text = " ".join([segment.text for segment in segments]).strip()
    detected_lang = info.language if not lang_param else lang_param
    
    return {
        "text": text,
        "language": detected_lang
    }