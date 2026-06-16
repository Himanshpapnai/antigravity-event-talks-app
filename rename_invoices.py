import os
import re
import sys
from datetime import datetime

# Path to invoices
INVOICE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Financial", "Invoices")

# Date pattern helpers
MONTHS = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
    'january': 1, 'february': 2, 'march': 3, 'april': 4, 'june': 6,
    'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
}

def install_and_import(package):
    import importlib
    try:
        importlib.import_module(package)
        return True
    except ImportError:
        import subprocess
        print(f"Installing missing dependency: {package}...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])
            return True
        except Exception as e:
            print(f"Failed to install {package}: {e}")
            return False

def parse_date(text):
    # 1. YYYY-MM-DD or YYYY/MM/DD
    match = re.search(r'\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b', text)
    if match:
        return f"{match.group(1)}-{int(match.group(2)):02d}-{int(match.group(3)):02d}"
    
    # 2. MM/DD/YYYY or DD/MM/YYYY or MM-DD-YYYY or DD-MM-YYYY
    match = re.search(r'\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b', text)
    if match:
        val1, val2, year = int(match.group(1)), int(match.group(2)), match.group(3)
        # Ambiguous case: assume Month/Day/Year or Day/Month/Year.
        # If val1 > 12, it's definitely DD/MM/YYYY. If val2 > 12, it's MM/DD/YYYY.
        if val1 > 12:
            return f"{year}-{val2:02d}-{val1:02d}"
        else:
            # Standard US assumption
            return f"{year}-{val1:02d}-{val2:02d}"

    # 3. Month DD, YYYY (e.g. June 16, 2026 or Jun 16, 2026)
    match = re.search(r'\b([a-zA-Z]{3,10})\s+(\d{1,2}),?\s+(\d{4})\b', text)
    if match:
        m_name = match.group(1).lower()
        if m_name in MONTHS:
            m_num = MONTHS[m_name]
            return f"{match.group(3)}-{m_num:02d}-{int(match.group(2)):02d}"

    # 4. DD Month YYYY (e.g. 16 June 2026)
    match = re.search(r'\b(\d{1,2})\s+([a-zA-Z]{3,10})\s+(\d{4})\b', text)
    if match:
        m_name = match.group(2).lower()
        if m_name in MONTHS:
            m_num = MONTHS[m_name]
            return f"{match.group(3)}-{m_num:02d}-{int(match.group(1)):02d}"
            
    return None

def process_invoices():
    if not os.path.exists(INVOICE_DIR):
        print(f"Directory {INVOICE_DIR} does not exist. Please create it first.")
        return

    # Check/install pypdf
    if not install_and_import("pypdf"):
        print("Required package 'pypdf' could not be loaded. Aborting.")
        return
        
    import pypdf

    pdf_files = [f for f in os.listdir(INVOICE_DIR) if f.lower().endswith(".pdf")]
    
    if not pdf_files:
        print(f"No PDF files found in {INVOICE_DIR}.")
        return

    print(f"Found {len(pdf_files)} PDF file(s) to scan.\n")

    for file_name in pdf_files:
        file_path = os.path.join(INVOICE_DIR, file_name)
        
        # Skip already renamed invoices to prevent loop renames
        if re.match(r'^invoice_\d{4}-\d{2}-\d{2}_', file_name):
            print(f"Skipping already organized file: {file_name}")
            continue

        print(f"Scanning: {file_name}...")
        try:
            date_found = None
            with open(file_path, "rb") as f:
                reader = pypdf.PdfReader(f)
                
                # Check first page content
                if reader.pages:
                    text = reader.pages[0].extract_text()
                    date_found = parse_date(text)
            
            if date_found:
                new_name = f"invoice_{date_found}_{file_name}"
                new_path = os.path.join(INVOICE_DIR, new_name)
                os.rename(file_path, new_path)
                print(f"  -> Successfully renamed to: {new_name}")
            else:
                print(f"  -> No date found in content.")
        except Exception as e:
            print(f"  -> Error scanning file: {e}")

if __name__ == "__main__":
    process_invoices()
