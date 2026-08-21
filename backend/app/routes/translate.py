"""
translate.py
------------
Text translation API.
"""

from fastapi import APIRouter, HTTPException
import asyncio

from app.schemas import TranslationRequest, TranslationResponse
from app.translator import translate_text, get_languages


router = APIRouter()


@router.post("/translate", response_model=TranslationResponse)
async def translate(request: TranslationRequest):

    try:
        result = await asyncio.to_thread(
            translate_text,
            text=request.text,
            source=request.source,
            target=request.target
        )

        return {
            "translated_text": result
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


@router.get("/languages")
def languages():

    try:
        return get_languages()

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )