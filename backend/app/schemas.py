from pydantic import BaseModel, Field



class TranslationRequest(BaseModel):
    text: str = Field(..., min_length=1)
    source: str
    target: str


class TranslationResponse(BaseModel):
    translated_text: str

class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1)
    voice: str = Field(..., min_length=1)
    speed: str = "1.0x"

class SpeechToTextResponse(BaseModel):
    text: str
    language: str | None = None

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    native_language: str = "English"
    learning_language: str = "Hindi"
    level: str = "Beginner"

class ChatResponse(BaseModel):
    reply: str