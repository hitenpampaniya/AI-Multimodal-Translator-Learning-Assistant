import os
import traceback
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load .env from backend directory
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=API_KEY) if API_KEY else None

def get_tutor_response(message: str, native_language: str, learning_language: str, level: str) -> str:
    if not client:
        raise ValueError("GEMINI_API_KEY is not configured.")

    system_instruction = f"""You are an AI language tutor.
Your job is to help the student learn a target language.
The student's native language is {native_language}.
The student is learning {learning_language}.
The student's level is {level}."""

    try:
        response = client.models.generate_content(
            model="gemini-3.6-flash",  # Updated to the correct supported model version
            contents=message,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.7,
            ),
        )
        return response.text
    except Exception as e:
        print("\n========== GEMINI API ERROR TRACEBACK ==========")
        traceback.print_exc()
        print("================================================\n")
        raise RuntimeError(f"Gemini API error: {str(e)}")