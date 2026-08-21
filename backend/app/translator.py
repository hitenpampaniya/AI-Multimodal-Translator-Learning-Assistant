"""
translator.py
--------------
Text translation service.

Uses deep-translator (Google Translate backend) with batched
requests and robust chunking for long texts and paragraphs.
"""

from deep_translator import GoogleTranslator

# Character limit per translate request (safety margin under the
# real ~5000 char limit imposed by the backend).
MAX_CHARS_PER_CHUNK = 4500


def _chunk_text(text: str, max_chars: int) -> list[str]:
    """
    Splits text into chunks under max_chars, preserving line breaks 
    and safely handling individual lines that exceed max_chars.
    """
    if len(text) <= max_chars:
        return [text]

    lines = text.split("\n")
    chunks = []
    current_chunk = []
    current_len = 0

    for line in lines:
        # +1 accounts for the newline character joining them back
        line_len = len(line) + 1

        # If a single line itself exceeds max_chars, split it forcefully
        if line_len > max_chars:
            if current_chunk:
                chunks.append("\n".join(current_chunk))
                current_chunk = []
                current_len = 0
            
            for i in range(0, len(line), max_chars):
                chunks.append(line[i:i + max_chars])
            continue

        if current_len + line_len > max_chars and current_chunk:
            chunks.append("\n".join(current_chunk))
            current_chunk = [line]
            current_len = line_len
        else:
            current_chunk.append(line)
            current_len += line_len

    if current_chunk:
        chunks.append("\n".join(current_chunk))

    return chunks


def translate_text(text: str, source: str = "auto", target: str = "en") -> str:
    """
    Translate text (can be multi-line) to the target language.

    Args:
        text: The full text to translate.
        source: Source language code, or "auto" to detect.
        target: Target language code, e.g. "hi", "fr", "es".

    Returns:
        Translated text, with line breaks and structure preserved.
    """
    if not text or not text.strip():
        raise ValueError("No text provided to translate.")

    chunks = _chunk_text(text, MAX_CHARS_PER_CHUNK)
    translator = GoogleTranslator(source=source, target=target)

    translated_chunks = []
    for chunk in chunks:
        # Preserve empty lines/whitespace chunks without hitting the translator API
        if not chunk.strip():
            translated_chunks.append(chunk)
            continue
        try:
            translated = translator.translate(chunk)
            translated_chunks.append(translated or "")
        except Exception as error:
            raise RuntimeError(f"Translation failed: {error}")

    return "\n".join(translated_chunks)


def get_languages() -> dict:
    """
    Returns supported languages as a dict of {code: name}.
    """
    try:
        name_to_code = GoogleTranslator().get_supported_languages(as_dict=True)
        if isinstance(name_to_code, dict):
            return {code: name for name, code in name_to_code.items()}
        return {}
    except Exception as error:
        raise RuntimeError(f"Could not fetch languages: {error}")