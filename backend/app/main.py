"""
main.py
-------
Main entry point for the Translation API.

Features:
- Text translation
- Image text translation & Camera OCR
- Text-to-Speech (TTS)
- Voice Translator
- Speech-to-Text (STT)
- Image Text to Voice
- PDF Translator
- AI Language Tutor Chatbot
- CORS support
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


# ============================================================
# CREATE FASTAPI APP
# ============================================================

app = FastAPI(
    title="Translation & AI Assistant API",
    description="Text, Voice, Image, Camera Translation & Speech/AI API",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    # Frontend access
    allow_origins=["*"],
    # Cookies / authentication
    allow_credentials=True,
    # HTTP methods
    allow_methods=["*"],
    # HTTP headers
    allow_headers=["*"],
)


# ============================================================
# ROUTES
# ============================================================

from app.routes.translate import router as translate_router
from app.routes.image_translate import router as image_translate_router
from app.routes.tts import router as tts_router
from app.routes.voice_translate import router as voice_translate_router
from app.routes.speech_to_text import router as speech_to_text_router
from app.routes.image_tts import router as image_tts_router
from app.routes.pdf_translate import router as pdf_translate_router
from app.routes.chat import router as chat_router


# 1. Text Translation Routes (Supports /api/translate, /api/languages)
app.include_router(
    translate_router,
    prefix="/api",
    tags=["Text Translation"]
)

# 2. Image Translation / OCR Routes (Supports /api/ocr for Image & Camera capture)
app.include_router(
    image_translate_router,
    prefix="/api",
    tags=["Image & Camera Translation"]
)

# 3. Text-to-Speech Routes
app.include_router(tts_router)

# 4. Voice Translator Routes
app.include_router(voice_translate_router)

# 5. Speech-to-Text Routes
app.include_router(speech_to_text_router)

# 6. Image Text to Voice Routes
app.include_router(image_tts_router)

# 7. PDF Translation Routes
app.include_router(pdf_translate_router)

# 8. Chat Routes (AI Language Tutor)    
app.include_router(chat_router)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    """
    Check whether API is running.
    """
    return {
        "success": True,
        "message": "Translation & Camera API is running successfully"
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health_check():
    """
    Health check endpoint.
    """
    return {
        "status": "healthy"
    }