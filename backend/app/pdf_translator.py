import os
import asyncio
import fitz  # PyMuPDF
from app.translator import translate_text

def extract_text_from_pdf(pdf_path: str):
    doc = fitz.open(pdf_path)
    pages_text = []
    for page_num, page in enumerate(doc):
        text = page.get_text("text").strip()
        pages_text.append({
            "page": page_num + 1,
            "text": text
        })
    doc.close()
    return pages_text

async def translate_pdf_content(pdf_path: str, source_lang: str, target_lang: str, progress_callback=None):
    # Run text extraction asynchronously in a separate thread
    pages_data = await asyncio.to_thread(extract_text_from_pdf, pdf_path)
    
    total_text = "".join([p["text"] for p in pages_data]).strip()
    if not total_text or len(total_text) < 5:
        raise ValueError("This PDF appears to be scanned/image-based. OCR is required.")

    translated_pages = []
    for item in pages_data:
        page_num = item["page"]
        text = item["text"]
        
        if not text:
            translated_pages.append({"page": page_num, "text": ""})
            continue

        try:
            # Translate the entire page text block at once to avoid hanging and speed up processing
            translated_text = await asyncio.to_thread(
                translate_text,
                text=text,
                target=target_lang,
                source=source_lang if source_lang != "auto" else "auto"
            )
            if not translated_text:
                translated_text = text
        except Exception as e:
            try:
                translated_text = await asyncio.to_thread(
                    translate_text,
                    text,
                    target_lang,
                    source_lang
                )
            except Exception:
                translated_text = text

        translated_pages.append({
            "page": page_num,
            "text": translated_text
        })

    return translated_pages