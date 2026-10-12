import json
import os
import time
from google import genai
from google.genai import types
from PyPDF2 import PdfReader, PdfWriter

def extract_batched_schedule(file_path):
    client = genai.Client()
    print(f"Reading multi-page document: {file_path}...")
    
    reader = PdfReader(file_path)
    total_pages = len(reader.pages)
    batch_size = 5  # Send 5 pages at a time to drastically reduce API requests
    
    print(f"Found {total_pages} pages. Processing in batches of {batch_size}...\n")
    all_student_records = []
    
    prompt = """
    Analyze these pages of a college exam seating plan.
    1. Find every 13-digit student roll number.
    2. Identify the Room Number and Subject for each roll number based on the surrounding text/headers.
    3. Determine Date/Timing if present (leave blank if not).
    Return ONLY a valid, flat JSON array of objects with keys: "rollNo", "subject", "room", "date", "timing".
    Output pure JSON, no markdown blocks.
    """

    for i in range(0, total_pages, batch_size):
        end_page = min(i + batch_size, total_pages)
        print(f"--- Processing Pages {i + 1} to {end_page} of {total_pages} ---")
        
        # Bundle multiple pages into one temporary PDF
        writer = PdfWriter()
        for j in range(i, end_page):
            writer.add_page(reader.pages[j])
            
        temp_filename = f"temp_batch_{i}.pdf"
        with open(temp_filename, "wb") as f:
            writer.write(f)
            
        with open(temp_filename, "rb") as f:
            document_bytes = f.read()
            
        document_part = types.Part.from_bytes(data=document_bytes, mime_type="application/pdf")
        
        try:
            response = client.models.generate_content(
                model="gemini-3.6-flash", # Back to the modern model
                contents=[document_part, prompt]
            )
            
            raw_text = response.text.strip().removeprefix('```json').removesuffix('```')
            batch_data = json.loads(raw_text)
            
            valid_records = [
                rec for rec in batch_data 
                if str(rec.get("rollNo")).isdigit() and len(str(rec.get("rollNo"))) == 13
            ]
            all_student_records.extend(valid_records)
            print(f"-> Successfully extracted {len(valid_records)} students from this batch.")
            
        except json.JSONDecodeError:
            print(f"-> [!] JSON Error on batch {i + 1}-{end_page}.")
        except Exception as e:
            print(f"-> [!] API Error on batch {i + 1}-{end_page}: {e}")
            
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
            
        # Brief pause to respect the per-minute limits
        if end_page < total_pages:
            time.sleep(5)

    print(f"\nSaving all {len(all_student_records)} records to seating_plan.json...")
    with open('seating_plan.json', 'w') as f:
        json.dump(all_student_records, f, indent=4)
        
    print("Success! Your database is ready.")

if __name__ == "__main__":
    extract_batched_schedule("SEATING PLAN 2ND & 3RD YEAR 2026-27 ODD SEM.pdf")