import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

def generate_pdf_from_text(translated_pages: list, output_pdf_path: str):
    doc = SimpleDocTemplate(
        output_pdf_path,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    # Unicode font registration fallback configuration (prioritizing Indic/multilingual fonts)
    font_name = "Helvetica"
    common_fonts = [
        (r"C:\Windows\Fonts\Nirmala.ttc", 0),
        (r"C:\Windows\Fonts\nirmala.ttf", None),
        (r"C:\Windows\Fonts\mangal.ttf", None),
        (r"C:\Windows\Fonts\arialuni.ttf", None),
        (r"C:\Windows\Fonts\segoeui.ttf", None),
        ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", None),
        ("/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf", None),
        ("/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf", None),
        ("/Library/Fonts/Arial Unicode.ms", None),
        ("/System/Library/Fonts/Supplemental/Arial Unicode.ttf", None),
        (r"C:\Windows\Fonts\arial.ttf", None),
    ]
    
    for item in common_fonts:
        fpath, sub_idx = item[0], item[1]
        if os.path.exists(fpath):
            try:
                if sub_idx is not None:
                    pdfmetrics.registerFont(TTFont('UnicodeFont', fpath, subfontIndex=sub_idx))
                else:
                    pdfmetrics.registerFont(TTFont('UnicodeFont', fpath))
                font_name = 'UnicodeFont'
                break
            except Exception:
                pass

    style_normal = ParagraphStyle(
        'NormalUnicode',
        parent=styles['Normal'],
        fontName=font_name,
        fontSize=11,
        leading=16,
        textColor='#111827'
    )

    story = []
    for i, page_item in enumerate(translated_pages):
        text = page_item["text"]
        paragraphs = text.split("\n")
        
        for para in paragraphs:
            if para.strip():
                safe_para = para.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                story.append(Paragraph(safe_para, style_normal))
                story.append(Spacer(1, 8))
            else:
                story.append(Spacer(1, 12))

        if i < len(translated_pages) - 1:
            story.append(PageBreak())

    doc.build(story)
    return output_pdf_path
    