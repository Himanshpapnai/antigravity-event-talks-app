import os
import re
import sys

# Path to search for images
IMAGE_DIR = os.path.dirname(os.path.abspath(__file__))

def install_and_import(package):
    import importlib
    try:
        importlib.import_module(package)
        return True
    except ImportError:
        import subprocess
        print(f"Installing missing dependency: {package}...")
        try:
            # For Windows, easyocr is best because it installs self-contained PyTorch models 
            # and doesn't require installing an external Tesseract binary on the OS.
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])
            return True
        except Exception as e:
            print(f"Failed to install {package}: {e}")
            return False

def clean_extracted_text(text_lines):
    # Combine lines for easier regex searching
    full_text = " ".join(text_lines)
    return full_text

def parse_invoice_info(text):
    # Regex patterns for key fields
    # 1. Invoice Number
    inv_no_match = re.search(r'(?:invoice\s*#|inv(?:oice)?\s*no|invoice\s*number|inv\s*#)\s*:?\s*([a-zA-Z0-9\-]+)', text, re.IGNORECASE)
    inv_no = inv_no_match.group(1) if inv_no_match else "N/A"
    
    # 2. Invoice Date
    # Match YYYY-MM-DD or MM/DD/YYYY or DD Month YYYY
    date_patterns = [
        r'\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b',
        r'\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b',
        r'\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b',
        r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b'
    ]
    
    dates = []
    for pattern in date_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            dates.extend(matches)
            
    # Typically, invoice date is the first date found, and due date is the second date
    inv_date = dates[0] if len(dates) > 0 else "N/A"
    due_date = dates[1] if len(dates) > 1 else "N/A"
    
    # If explicit labels exist:
    inv_date_explicit = re.search(r'(?:invoice\s*date|date\s*of\s*issue|billing\s*date)\s*:?\s*([a-zA-Z0-9\s,\-/]+)', text, re.IGNORECASE)
    if inv_date_explicit:
        inv_date = inv_date_explicit.group(1).strip()
        
    due_date_explicit = re.search(r'(?:due\s*date|payment\s*due)\s*:?\s*([a-zA-Z0-9\s,\-/]+)', text, re.IGNORECASE)
    if due_date_explicit:
        due_date = due_date_explicit.group(1).strip()

    # 3. Due Amount / Total Due
    due_amount_match = re.search(r'(?:due\s*amount|amount\s*due|total\s*due|balance\s*due|due|total)\s*:?\s*(?:\$|usd)?\s*([\d,]+\.\d{2})', text, re.IGNORECASE)
    due_amount = f"${due_amount_match.group(1)}" if due_amount_match else "N/A"

    # 4. Invoice Sent By (Vendor)
    # Often found at the top. We can try to look for typical headers or pick the first capitalized lines
    sent_by_match = re.search(r'(?:from|vendor|sender|billed\s*by)\s*:?\s*([a-zA-Z0-9\s,&]+?)(?:\n|  |to:)', text, re.IGNORECASE)
    sent_by = sent_by_match.group(1).strip() if sent_by_match else "Unknown Vendor"
    
    return {
        "invoice_no": inv_no,
        "invoice_date": inv_date,
        "sent_by": sent_by,
        "due_date": due_date,
        "due_amount": due_amount
    }

def main():
    image_extensions = (".png", ".jpg", ".jpeg", ".tiff", ".bmp")
    image_files = [f for f in os.listdir(IMAGE_DIR) if f.lower().endswith(image_extensions)]
    
    # Also check Images/ subfolder if exists
    sub_img_dir = os.path.join(IMAGE_DIR, "Images")
    if os.path.exists(sub_img_dir):
        image_files.extend([os.path.join("Images", f) for f in os.listdir(sub_img_dir) if f.lower().endswith(image_extensions)])

    if not image_files:
        print("No invoice images found in the folder.")
        return

    # Check and install easyocr
    if not install_and_import("easyocr"):
        print("Required package 'easyocr' could not be loaded. Please install it manually.")
        return
        
    import easyocr
    reader = easyocr.Reader(['en']) # Initialize English OCR reader

    print(f"| Invoice No | Invoice Date | Invoice Sent By | Due Date | Due Amount | File Name |")
    print(f"|---|---|---|---|---|---|")

    for file_name in image_files:
        file_path = os.path.join(IMAGE_DIR, file_name)
        try:
            # Perform OCR
            result = reader.readtext(file_path, detail=0)
            text_block = clean_extracted_text(result)
            
            # Extract data
            data = parse_invoice_info(text_block)
            
            # Output row
            print(f"| {data['invoice_no']} | {data['invoice_date']} | {data['sent_by']} | {data['due_date']} | {data['due_amount']} | {os.path.basename(file_name)} |")
        except Exception as e:
            print(f"| Error | Error | Error | Error | Error | {os.path.basename(file_name)} (OCR failed: {e}) |")

if __name__ == "__main__":
    main()
