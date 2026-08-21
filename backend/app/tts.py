import os
import uuid
import edge_tts

AUDIO_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "audio")
os.makedirs(AUDIO_DIR, exist_ok=True)

def convert_speed_to_rate(speed: str) -> str:
    speed_map = {
        "0.5x": "-50%",
        "0.75x": "-25%",
        "1.0x": "+0%",
        "1.25x": "+25%",
        "1.5x": "+50%",
        "2.0x": "+100%"
    }
    return speed_map.get(speed, "+0%")

async def generate_speech(text: str, voice: str, speed: str = "1.0x") -> str:
    if not text or not text.strip():
        raise ValueError("Text cannot be empty.")
    
    rate = convert_speed_to_rate(speed)
    filename = f"{uuid.uuid4()}.mp3"
    output_file = os.path.join(AUDIO_DIR, filename)

    communicate = edge_tts.Communicate(text.strip(), voice, rate=rate)
    await communicate.save(output_file)
    return output_file

async def get_available_voices():
    voices = await edge_tts.list_voices()
    formatted_voices = []
    for v in voices:
        locale = v.get("Locale", "en-US")
        language = locale.split("-")[0]
        formatted_voices.append({
            "name": v.get("ShortName") or v.get("Name"),
            "language": language,
            "gender": v.get("Gender"),
            "locale": locale
        })
    return formatted_voices