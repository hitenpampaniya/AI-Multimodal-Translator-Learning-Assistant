"""
ocr.py
------
Image OCR service using Pytesseract with fallback to EasyOCR
for robust text extraction across platforms.
"""

from PIL import Image, ImageEnhance, ImageFilter
import pytesseract
import os
import shutil

# Lazy-loaded EasyOCR reader instance
_easyocr_reader = None

def _get_easyocr_reader():
    global _easyocr_reader
    if _easyocr_reader is None:
        try:
            import easyocr
            _easyocr_reader = easyocr.Reader(['en'], gpu=False)
        except Exception as e:
            print(f"[OCR] EasyOCR init notice: {e}")
            _easyocr_reader = False
    return _easyocr_reader if _easyocr_reader is not False else None


def _init_tesseract():
    if hasattr(pytesseract.pytesseract, "tesseract_cmd") and os.path.exists(pytesseract.pytesseract.tesseract_cmd):
        return True

    tesseract_in_path = shutil.which("tesseract")
    if tesseract_in_path:
        pytesseract.pytesseract.tesseract_cmd = tesseract_in_path
        return True

    possible_paths = [
        r'C:\Program Files\Tesseract-OCR\tesseract.exe',
        r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
        os.path.expanduser(r'~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe'),
    ]

    for p in possible_paths:
        if os.path.exists(p):
            pytesseract.pytesseract.tesseract_cmd = p
            tessdata = os.path.join(os.path.dirname(p), "tessdata")
            if os.path.exists(tessdata):
                os.environ['TESSDATA_PREFIX'] = tessdata
            return True

    return False


# Initialize tesseract path on import
_init_tesseract()


def extract_text_from_image(image_path: str) -> str:
    """
    Extracts text from an image file path using Pytesseract with 
    EasyOCR fallback.
    """
    if not os.path.exists(image_path):
        raise ValueError("Image file does not exist.")

    extracted_text = ""

    # 1. Try Pytesseract if tesseract executable is found
    if _init_tesseract():
        try:
            with Image.open(image_path) as img:
                print(f"[OCR] Processing image with Pytesseract: {image_path}")
                if img.mode != 'RGB':
                    img = img.convert('RGB')

                img_gray = img.convert('L')
                enhancer = ImageEnhance.Contrast(img_gray)
                img_enhanced = enhancer.enhance(2.0)
                img_sharpened = img_enhanced.filter(ImageFilter.SHARPEN)

                config = r'--oem 3 --psm 3'
                extracted_text = pytesseract.image_to_string(img_sharpened, lang='eng', config=config).strip()

                if not extracted_text:
                    extracted_text = pytesseract.image_to_string(img, lang='eng').strip()

                if extracted_text:
                    print(f"[OCR Success (Pytesseract)] Snippet: {repr(extracted_text[:80])}")
                    return extracted_text
        except Exception as pytesseract_err:
            print(f"[OCR Notice] Pytesseract failed: {pytesseract_err}. Falling back to EasyOCR...")

    # 2. EasyOCR Fallback
    reader = _get_easyocr_reader()
    if reader:
        try:
            print(f"[OCR] Processing image with EasyOCR fallback: {image_path}")
            results = reader.readtext(image_path, detail=0)
            extracted_text = " ".join(results).strip()
            if extracted_text:
                print(f"[OCR Success (EasyOCR)] Snippet: {repr(extracted_text[:80])}")
                return extracted_text
        except Exception as easyocr_err:
            print(f"[OCR Error] EasyOCR failed: {easyocr_err}")

    if not extracted_text:
        print("[OCR Warning] No text extracted by available engines.")

    return extracted_text


# Helper function aliases
extract_text = extract_text_from_image
ocr_image = extract_text_from_image
run_ocr = extract_text_from_image