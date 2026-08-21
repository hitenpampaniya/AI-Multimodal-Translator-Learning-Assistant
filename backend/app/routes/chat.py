from fastapi import APIRouter, HTTPException
from app.schemas import ChatRequest, ChatResponse
from app.chatbot import get_tutor_response

router = APIRouter(prefix="/api", tags=["Chatbot"])

@router.post("/chat", response_model=ChatResponse)
async def chat_with_tutor(payload: ChatRequest):
    try:
        if not payload.message or not payload.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty.")
        
        reply = get_tutor_response(
            message=payload.message.strip(),
            native_language=payload.native_language,
            learning_language=payload.learning_language,
            level=payload.level
        )
        return ChatResponse(reply=reply)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Unable to connect to AI tutor. Please try again.")