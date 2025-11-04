"""
🚀 ULTIMATE VTU RESULTS SCRAPER 🚀
==================================

Features:
✅ Multi-semester support (Sem 1-8 with different URLs)
✅ Multi-batch support (21 scheme, 22 scheme, etc.)
✅ Elective subject mapping (21CS48LX → 21CSL481)
✅ Semester auto-detection from subject code
✅ Attempt tracking (handles retakes)
✅ Smart retry logic (stops when failed count constant)
✅ Parallel scraping with ThreadPoolExecutor
✅ Handles diploma students (4xx pattern missing Sem 1-2)
✅ All result statuses (F, P, A, X, W, NE, ABS)
✅ NE (13) format parsing
✅ Multi-table parsing (reads all semester tables)
✅ Headless Chrome
✅ Thread-safe database operations

Usage:
    python ultimate_scraper.py
    
    Enter batch configurations interactively
    Or edit BATCH_CONFIGS below for automated runs
"""

import os
import sys
import warnings
import numpy as np
import cv2
import pytesseract
from PIL import Image
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoAlertPresentException
import time
from bs4 import BeautifulSoup
from datetime import datetime
from db_config import get_db_connection, close_connection
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
import re

# ==================== CONFIGURATION ====================
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

if not sys.warnoptions:
    warnings.simplefilter("ignore")

# Thread-local storage and locks
thread_local = threading.local()
db_lock = threading.Lock()

# ==================== ELECTIVE MAPPING ====================

ELECTIVE_PATTERNS = {
    # Semester 3
    "21CS38X": r"21CS38[0-9]",
    "21CSL38X": r"21CSL38[0-9]",
    # Semester 4
    "21CS48X": r"21CS48[0-9]",
    "21CS48LX": r"21CSL48[0-9]",
    # Semester 5
    "21XX56": r"21[A-Z]{2,4}56",
    "21CS58X": r"21CS58[0-9]",
    "21CSL58X": r"21CSL58[0-9]",
    # Semester 6
    "21XX64X": r"21[A-Z]{2,4}64[0-9]",
    "21XX65X": r"21[A-Z]{2,4}65[0-9]",
    # Semester 7
    "21XX73X": r"21[A-Z]{2,4}73[0-9]",
    "21XX74X": r"21[A-Z]{2,4}74[0-9]",
    "21XX75X": r"21[A-Z]{2,4}75[0-9]",
}

ELECTIVE_CREDITS = {
    "21CS38X": 1, "21CSL38X": 1,
    "21CS48X": 1, "21CS48LX": 1,
    "21XX56": 2,
    "21CS58X": 1, "21CSL58X": 1,
    "21XX64X": 3, "21XX65X": 3,
    "21XX73X": 3, "21XX74X": 3, "21XX75X": 3,
}

def map_actual_to_placeholder(actual_subject_code):
    """
    Maps actual subject code to placeholder.
    Returns (placeholder_code, credits) or (None, None)
    
    Examples:
        21CSL481 → (21CS48LX, 1)
        21CS641  → (21XX64X, 3)
        21CS42   → (None, None)
    """
    for placeholder, pattern in ELECTIVE_PATTERNS.items():
        if re.match(pattern, actual_subject_code):
            return (placeholder, ELECTIVE_CREDITS.get(placeholder, 3))
    return (None, None)

# ==================== CAPTCHA PROCESSING ====================

def mask_captcha(image_path):
    """Processes the CAPTCHA image by applying masking for improved text extraction."""
    try:
        image = cv2.imread(image_path)
        hsv_image = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        lower = np.array([-10, -10, 62])
        upper = np.array([10, 10, 142])
        mask = cv2.inRange(hsv_image, lower, upper)
        masked_image = cv2.bitwise_and(image, image, mask=mask)
        
        thread_id = threading.get_ident()
        processed_image_path = f"masked_captcha_{thread_id}.png"
        cv2.imwrite(processed_image_path, masked_image)
        return processed_image_path
    except Exception as e:
        return None

def capture_and_process_captcha(driver):
    """Captures the CAPTCHA image and processes it with masking."""
    try:
        captcha_element = driver.find_element(By.XPATH, '//*[@id="raj"]/div[2]/div[2]/img')
        thread_id = threading.get_ident()
        captcha_image_path = f"captcha_{thread_id}.png"
        captcha_element.screenshot(captcha_image_path)
        return mask_captcha(captcha_image_path)
    except Exception as e:
        return None

def refresh_and_capture_captcha(driver):
    """Refreshes the CAPTCHA by clicking the refresh button, then captures and processes it."""
    try:
        refresh_button = driver.find_element(By.XPATH, '//*[@id="raj"]/div[2]/div[2]/p/a')
        refresh_button.click()
        time.sleep(1.5)
        return capture_and_process_captcha(driver)
    except Exception as e:
        return capture_and_process_captcha(driver)

# ==================== HELPER FUNCTIONS ====================

def extract_semester_from_subject_code(subject_code):
    """
    Extract semester number from subject code.
    Examples: 
        BMATS101→1, BCS302→3, BESCK204C→2, BCS401→4
        21CS42→4, 21IS81→8, 21MAT31→3
    
    Logic: 
    - For 21-scheme (21XXnn): Last digit before optional letters
    - For 22-scheme (BXXnnn): First digit after letters
    """
    # Try 21-scheme pattern: 21XX(nn)
    match = re.search(r'21[A-Z]{2,4}(\d)', subject_code)
    if match:
        return int(match.group(1))
    
    # Try 22-scheme pattern: BXXX(n)nn
    match = re.search(r'B[A-Z]+(\d)', subject_code)
    if match:
        return int(match.group(1))
    
    # Fallback: find last single digit before letters
    match = re.search(r'(\d)(?=[A-Z]*$)', subject_code)
    if match:
        return int(match.group(1))
    
    # Last fallback: first digit
    match = re.search(r'\d', subject_code)
    if match:
        return int(match.group())
    
    return 0

def parse_marks(text):
    """
    Extract numeric marks, handle NE, ABS, X, etc.
    Examples: "45"→45, "NE (13)"→13, "NE"→0, "ABS"→0, "X"→0
    """
    if not text or text.strip() in ['NE', 'ABS', '-', 'X', 'A', 'W', 'F', 'P']:
        return 0
    
    # Extract number from "NE (13)" → 13
    if '(' in text:
        try:
            num = text.split('(')[1].split(')')[0]
            return int(num)
        except:
            return 0
    
    # Regular number
    try:
        return int(''.join(c for c in text if c.isdigit()))
    except:
        return 0

def get_existing_record(usn, subject_code, semester):
    """
    Get existing record for a student's subject in a semester.
    Returns (attempt_number, total_marks) or (0, 0) if not found.
    """
    connection = get_db_connection()
    if not connection:
        return (0, 0)
    
    cursor = connection.cursor()
    
    query = """
    SELECT attempt_number, total_marks 
    FROM results 
    WHERE student_usn = %s AND subject_code = %s AND semester = %s
    """
    
    try:
        cursor.execute(query, (usn, subject_code, semester))
        result = cursor.fetchone()
        if result:
            return (result[0], result[1])
        return (0, 0)
    except Exception:
        return (0, 0)
    finally:
        cursor.close()
        close_connection(connection)

def is_diploma_student(usn):
    """
    Check if USN belongs to diploma student (4xx pattern).
    Examples: 1BI23IS401 → True, 1BI23IS001 → False
    """
    # Extract roll number (last 3 digits)
    match = re.search(r'(\d{3})$', usn)
    if match:
        roll_num = int(match.group(1))
        return 400 <= roll_num <= 499
    return False

# ==================== MAIN SCRAPING FUNCTION ====================

def get_vtu_results(usn, url, expected_semester=None):
    """
    Scrapes VTU results for a single USN with elective support.
    
    Features:
    - Auto-detects semester from subject code
    - Maps elective codes to placeholders
    - Tracks attempt numbers
    - Handles all result statuses
    - Reads ALL tables (multi-semester support)
    
    Returns True if successful, False otherwise.
    """
    # Check if diploma student trying to access Sem 1-2
    if expected_semester in [1, 2] and is_diploma_student(usn):
        print(f"⏭️  {usn}: Diploma student (skipping Sem {expected_semester})")
        return True  # Return True to not retry
    
    options = webdriver.ChromeOptions()
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--headless")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--log-level=3")
    
    max_attempts = 5
    
    for attempt in range(max_attempts):
        driver = None
        try:
            driver = webdriver.Chrome(options=options)
            driver.get(url)
            time.sleep(2)
            
            masked_image_path = refresh_and_capture_captcha(driver)
            if not masked_image_path:
                continue
            
            img = Image.open(masked_image_path)
            ocr_configs = [
                r'--psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
                r'--psm 8 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            ]
            captcha_text = ''
            for cfg in ocr_configs:
                try:
                    captcha_text = pytesseract.image_to_string(img, config=cfg).strip()
                    captcha_text = ''.join(c for c in captcha_text if c.isalnum())
                    if len(captcha_text) >= 6:
                        break
                except Exception:
                    continue
            
            if not captcha_text or len(captcha_text) < 6:
                continue
            
            # Fill form
            usn_input_field = driver.find_element(By.NAME, "lns")
            captcha_input_field = driver.find_element(By.NAME, "captchacode")
            usn_input_field.clear()
            captcha_input_field.clear()
            usn_input_field.send_keys(usn)
            captcha_input_field.send_keys(captcha_text)
            driver.find_element(By.ID, "submit").click()
            time.sleep(3)
            
            # Check for alert
            try:
                alert = driver.switch_to.alert
                alert_text = alert.text.strip()
                alert.accept()
                
                if "University Seat Number is not available or Invalid" in alert_text:
                    print(f"⚠️  {usn}: Invalid USN")
                    return False
                elif "captcha" in alert_text.lower():
                    continue
                else:
                    continue
            except NoAlertPresentException:
                pass
            
            # Parse with BeautifulSoup
            soup = BeautifulSoup(driver.page_source, "html.parser")
            
            try:
                student_name = soup.find_all("td")[3].text.lstrip(" : ")
                student_usn = soup.find_all("td")[1].text.lstrip(" : ")
                print(f"✅ Found student: {student_name} ({student_usn})")
            except (IndexError, AttributeError) as e:
                print(f"❌ Could not extract student info: {e}")
                continue
            
            # Extract ALL result tables (VTU shows multiple tables for different semesters)
            try:
                all_tables = soup.find_all("div", attrs={"class": "divTable"})
                print(f"📋 Found {len(all_tables)} result tables")
                all_rows = []
                for idx, table in enumerate(all_tables):
                    table_rows = table.find_all("div", attrs={"class": "divTableRow"})[1:]  # Skip header
                    print(f"  Table {idx+1}: {len(table_rows)} rows")
                    all_rows.extend(table_rows)
                rows = all_rows
                print(f"📊 Total rows to process: {len(rows)}")
            except (IndexError, AttributeError) as e:
                print(f"❌ Could not extract tables: {e}")
                continue
            
            if not rows:
                return False
            
            # Process results with database lock
            with db_lock:
                connection = get_db_connection()
                if not connection:
                    return False
                
                cursor = connection.cursor()
                
                for row in rows:
                    cells = row.find_all("div", attrs={"class": "divTableCell"})
                    
                    if len(cells) < 6:
                        continue
                    
                    actual_subject_code = cells[0].text.strip()
                    actual_subject_name = cells[1].text.strip()
                    internal_text = cells[2].text.strip()
                    external_text = cells[3].text.strip()
                    total_text = cells[4].text.strip()
                    result_status = cells[5].text.strip()
                    
                    # Skip header rows
                    if actual_subject_code == 'Subject Code' or not actual_subject_code:
                        continue
                    
                    # Extract semester from subject code (handles both 2-letter and 3-letter dept codes)
                    # Examples: 21IS81 → Sem 8, 21INT82 → Sem 8, 21CS43 → Sem 4, 21NS83 → Sem 8
                    match = re.search(r'(?:21|22)[A-Z]+(\d)', actual_subject_code)
                    if match:
                        detected_semester = int(match.group(1))
                    else:
                        detected_semester = expected_semester  # Fallback to user input
                    
                    # Parse marks
                    internal_marks = parse_marks(internal_text)
                    external_marks = parse_marks(external_text)
                    total_marks = parse_marks(total_text) if total_text != '-' else internal_marks + external_marks
                    
                    # ==================== ELECTIVE MAPPING ====================
                    placeholder_code, elective_credits = map_actual_to_placeholder(actual_subject_code)
                    is_elective = placeholder_code is not None
                    
                    if is_elective:
                        # Store actual elective choice in elective_subjects table
                        try:
                            cursor.execute("""
                                INSERT INTO elective_subjects 
                                (subject_code, subject_name, semester, credits, placeholder_code, scheme)
                                VALUES (%s, %s, %s, %s, %s, '21')
                                ON DUPLICATE KEY UPDATE 
                                    subject_name = VALUES(subject_name),
                                    placeholder_code = VALUES(placeholder_code)
                            """, (actual_subject_code, actual_subject_name, detected_semester, 
                                  elective_credits, placeholder_code))
                        except Exception:
                            pass  # Table might not exist for non-21 scheme
                    
                    # Get existing record
                    existing_attempt, existing_total = get_existing_record(student_usn, actual_subject_code, detected_semester)
                    
                    # Determine new attempt number
                    if existing_attempt == 0:
                        new_attempt = 1
                    elif existing_total != total_marks:
                        new_attempt = existing_attempt + 1
                    else:
                        continue  # Same marks - skip
                    
                    # Insert or update result
                    upsert_query = """
                    INSERT INTO results 
                    (student_usn, subject_code, semester, internal_marks, external_marks, 
                     total_marks, result_status, attempt_number, is_elective, scraped_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        internal_marks = VALUES(internal_marks),
                        external_marks = VALUES(external_marks),
                        total_marks = VALUES(total_marks),
                        result_status = VALUES(result_status),
                        attempt_number = VALUES(attempt_number),
                        is_elective = VALUES(is_elective),
                        scraped_at = VALUES(scraped_at)
                    """
                    
                    data = (
                        student_usn,
                        actual_subject_code,
                        detected_semester,
                        internal_marks,
                        external_marks,
                        total_marks,
                        result_status,
                        new_attempt,
                        is_elective,
                        datetime.now()
                    )
                    
                    try:
                        cursor.execute(upsert_query, data)
                    except Exception as e:
                        # If foreign key constraint fails, try to add the subject first
                        if "foreign key constraint" in str(e).lower():
                            print(f"  ⚠️  Subject {actual_subject_code} not in database, adding it...")
                            try:
                                # Infer scheme from subject code
                                subject_scheme = actual_subject_code[:2] if actual_subject_code[:2] in ['21', '22'] else '21'
                                cursor.execute("""
                                    INSERT INTO subjects 
                                    (subject_code, subject_name, semester, credits, scheme, is_placeholder)
                                    VALUES (%s, %s, %s, %s, %s, 0)
                                    ON DUPLICATE KEY UPDATE subject_name = VALUES(subject_name)
                                """, (actual_subject_code, actual_subject_name, detected_semester, 0, subject_scheme))
                                
                                # Now retry the results insert
                                cursor.execute(upsert_query, data)
                                print(f"  ✅ Added subject and inserted result")
                            except Exception as e2:
                                print(f"  ❌ Still failed: {e2}")
                        else:
                            print(f"  ❌ Failed to insert {actual_subject_code}: {e}")
                
                connection.commit()
                cursor.close()
                close_connection(connection)
            
            print(f"✅ {usn}")
            return True
            
        except Exception:
            continue
        
        finally:
            if driver:
                driver.quit()
            # Cleanup temp files
            try:
                thread_id = threading.get_ident()
                os.remove(f"captcha_{thread_id}.png")
                os.remove(f"masked_captcha_{thread_id}.png")
            except:
                pass
    
    print(f"❌ {usn}")
    return False

# ==================== SMART RETRY LOGIC ====================

def scrape_with_smart_retry(usn_list, url, expected_semester=None, max_workers=5):
    """
    Scrapes USNs with smart retry logic.
    Stops when failed count stays constant for 2 consecutive attempts.
    """
    failed_usns = set(usn_list)
    retry_attempt = 0
    previous_failed_count = len(failed_usns)
    same_count_streak = 0
    
    while failed_usns:
        retry_attempt += 1
        print(f"\n{'='*60}")
        print(f"🔄 Retry Attempt #{retry_attempt}")
        print(f"📋 USNs to retry: {len(failed_usns)}")
        print(f"{'='*60}\n")
        
        current_failed = set()
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_usn = {
                executor.submit(get_vtu_results, usn, url, expected_semester): usn 
                for usn in failed_usns
            }
            
            for future in as_completed(future_to_usn):
                usn = future_to_usn[future]
                try:
                    if not future.result():
                        current_failed.add(usn)
                except Exception:
                    current_failed.add(usn)
        
        current_failed_count = len(current_failed)
        
        # Check stopping criteria
        if current_failed_count == previous_failed_count:
            same_count_streak += 1
            print(f"\n⚠️  Failed count unchanged: {current_failed_count} (Streak: {same_count_streak}/2)")
            
            if same_count_streak >= 2:
                print(f"\n🛑 Stopping retry: Failed count constant for 2 attempts")
                if current_failed:
                    print(f"📋 Persistently failed USNs ({len(current_failed)}):")
                    for usn in sorted(current_failed):
                        print(f"   - {usn}")
                break
        else:
            same_count_streak = 0
        
        previous_failed_count = current_failed_count
        failed_usns = current_failed
        
        if not failed_usns:
            print(f"\n✅ All USNs scraped successfully!")
            break
    
    return list(failed_usns)

# ==================== SEMESTER-WISE SCRAPING ====================

def scrape_semester_batch(semester_config, students, max_workers=5):
    """
    Scrape a single semester with retry logic.
    
    semester_config = {
        "semester": 4,
        "url": "https://results.vtu.ac.in/..."
    }
    """
    semester = semester_config["semester"]
    url = semester_config["url"]
    
    print(f"\n{'#'*60}")
    print(f"📚 SEMESTER {semester}")
    print(f"🔗 URL: {url}")
    print(f"👥 Students: {len(students)}")
    print(f"{'#'*60}\n")
    
    # Initial scrape
    failed_usns = []
    success_count = 0
    
    start_time = time.time()
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_usn = {
            executor.submit(get_vtu_results, usn, url, semester): usn 
            for usn in students
        }
        
        for future in as_completed(future_to_usn):
            usn = future_to_usn[future]
            try:
                if future.result():
                    success_count += 1
                else:
                    failed_usns.append(usn)
            except Exception:
                failed_usns.append(usn)
    
    elapsed = time.time() - start_time
    
    print(f"\n{'='*60}")
    print(f"Initial Scrape Complete (Sem {semester}):")
    print(f"✅ Success: {success_count}/{len(students)}")
    print(f"❌ Failed: {len(failed_usns)}")
    print(f"⏱️  Time: {elapsed:.2f}s ({elapsed/60:.2f} min)")
    print(f"{'='*60}")
    
    # Retry failed USNs
    if failed_usns:
        persistent_failures = scrape_with_smart_retry(failed_usns, url, semester, max_workers)
        
        final_success = len(students) - len(persistent_failures)
        print(f"\n{'='*60}")
        print(f"FINAL STATS - SEMESTER {semester}:")
        print(f"✅ Successfully scraped: {final_success}/{len(students)} ({final_success/len(students)*100:.1f}%)")
        print(f"❌ Permanently failed: {len(persistent_failures)}")
        print(f"{'='*60}\n")
        
        return persistent_failures
    
    return []

# ==================== MULTI-SEMESTER BATCH SCRAPING ====================

def scrape_batch_all_semesters(batch_config, max_workers=5):
    """
    Scrape all semesters for a batch.
    
    batch_config = {
        "batch_name": "21 Scheme IS",
        "usn_pattern": "1BI21IS%",
        "scheme": "21",
        "semesters": [
            {"semester": 1, "url": "..."},
            {"semester": 2, "url": "..."},
            ...
        ]
    }
    """
    print(f"\n{'#'*70}")
    print(f"🎓 BATCH: {batch_config['batch_name']}")
    print(f"📋 Pattern: {batch_config['usn_pattern']}")
    print(f"📚 Semesters: {len(batch_config['semesters'])}")
    print(f"{'#'*70}\n")
    
    # Get students
    connection = get_db_connection()
    if not connection:
        return
    
    cursor = connection.cursor()
    cursor.execute(
        "SELECT usn FROM student_details WHERE usn LIKE %s ORDER BY usn",
        (batch_config['usn_pattern'],)
    )
    students = [row[0] for row in cursor.fetchall()]
    cursor.close()
    close_connection(connection)
    
    if not students:
        print(f"❌ No students found matching pattern: {batch_config['usn_pattern']}")
        return
    
    print(f"✅ Found {len(students)} students")
    
    # Check for diploma students
    diploma_count = sum(1 for usn in students if is_diploma_student(usn))
    if diploma_count > 0:
        print(f"⚠️  Detected {diploma_count} diploma students (will skip Sem 1-2)")
    
    print(f"🚀 Using {max_workers} parallel workers\n")
    
    overall_start = time.time()
    all_failures = {}
    
    # Scrape each semester
    for sem_config in batch_config['semesters']:
        failures = scrape_semester_batch(sem_config, students, max_workers)
        if failures:
            all_failures[sem_config['semester']] = failures
        
        # Small delay between semesters
        time.sleep(2)
    
    overall_elapsed = time.time() - overall_start
    
    # Final summary
    print(f"\n{'='*70}")
    print(f"🎉 BATCH COMPLETE: {batch_config['batch_name']}")
    print(f"⏱️  Total Time: {overall_elapsed/60:.2f} minutes")
    print(f"{'='*70}")
    
    if all_failures:
        print(f"\n⚠️  PERSISTENT FAILURES BY SEMESTER:")
        for sem, usns in sorted(all_failures.items()):
            print(f"   Sem {sem}: {len(usns)} USNs")
            for usn in usns[:5]:  # Show first 5
                print(f"      - {usn}")
            if len(usns) > 5:
                print(f"      ... and {len(usns)-5} more")
    else:
        print(f"\n✅ NO PERSISTENT FAILURES - ALL STUDENTS SCRAPED SUCCESSFULLY!")
    
    print()

# ==================== MAIN ====================


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='VTU Results Scraper')
    parser.add_argument('--url', type=str, help='VTU Results URL', required=False)
    parser.add_argument('--semester', type=int, help='Semester (1-8)', required=False)
    parser.add_argument('--scheme', type=str, help='Scheme (21/22)', required=False)
    parser.add_argument('--workers', type=int, default=7, help='Number of parallel workers')
    parser.add_argument('--usns', type=str, help='Comma-separated USN list', required=False)
    
    args = parser.parse_args()
    
    print("="*70)
    print("🚀 VTU RESULTS SCRAPER")
    print("="*70)
    print()
    
    # If arguments provided, use them; otherwise use interactive mode
    if args.url and args.semester and args.scheme:
        url = args.url
        semester = args.semester
        scheme = args.scheme
        workers = args.workers
        
        # Validate inputs
        if semester < 1 or semester > 8:
            print("❌ Invalid semester. Must be 1-8.")
            sys.exit(0)
        
        if scheme not in ['21', '22']:
            print("❌ Invalid scheme. Must be 21 or 22.")
            sys.exit(0)
        
        # Get students
        if args.usns:
            # Use provided USN list
            students = [usn.strip() for usn in args.usns.split(',') if usn.strip()]
            print(f"📋 Using provided USN list: {len(students)} students")
        else:
            # Fetch from database by scheme
            connection = get_db_connection()
            if not connection:
                sys.exit(0)
            
            cursor = connection.cursor()
            cursor.execute("SELECT usn FROM student_details WHERE scheme = %s ORDER BY usn", (scheme,))
            students = [row[0] for row in cursor.fetchall()]
            cursor.close()
            close_connection(connection)
        
        if not students:
            print(f"❌ No students found")
            sys.exit(0)
        
        print()
        print("="*70)
        print(f"📊 Configuration:")
        print(f"   URL: {url}")
        print(f"   Semester: {semester}")
        print(f"   Scheme: {scheme}")
        print(f"   Students: {len(students)}")
        print(f"   Workers: {workers}")
        print("="*70)
        print()
        
        # Auto-start when using CLI args (no confirmation prompt)
        print("="*70)
        print("STARTING SCRAPE...")
        print("="*70)
        print()
        
    else:
        # Interactive mode (original behavior)
        url = input("Enter VTU Results URL: ").strip()
        if not url:
            print("❌ No URL provided. Exiting.")
            sys.exit(0)
        
        semester = input("Enter Semester (1-8): ").strip()
        try:
            semester = int(semester)
            if semester < 1 or semester > 8:
                print("❌ Invalid semester. Must be 1-8.")
                sys.exit(0)
        except:
            print("❌ Invalid semester number.")
            sys.exit(0)
        
        scheme = input("Enter Scheme (21/22): ").strip()
        if scheme not in ['21', '22']:
            print("❌ Invalid scheme. Must be 21 or 22.")
            sys.exit(0)
        
        workers_input = input("Number of parallel workers (default 7): ").strip() or "7"
        try:
            workers = int(workers_input)
        except:
            workers = 7
        
        # Get students for this scheme
        connection = get_db_connection()
        if not connection:
            sys.exit(0)
        
        cursor = connection.cursor()
        cursor.execute("SELECT usn FROM student_details WHERE scheme = %s ORDER BY usn", (scheme,))
        students = [row[0] for row in cursor.fetchall()]
        cursor.close()
        close_connection(connection)
        
        if not students:
            print(f"❌ No students found with scheme '{scheme}'")
            sys.exit(0)
        
        print()
        print("="*70)
        print(f"📊 Configuration:")
        print(f"   URL: {url}")
        print(f"   Semester: {semester}")
        print(f"   Scheme: {scheme}")
        print(f"   Students: {len(students)}")
        print(f"   Workers: {workers}")
        print("="*70)
        print()
        
        confirm = input("Start scraping? (yes/no): ").strip().lower()
        if confirm != 'yes':
            print("Cancelled.")
            sys.exit(0)
        
        print()
        print("="*70)
        print("STARTING SCRAPE...")
        print("="*70)
        print()
    
    semester_config = {
        "semester": semester,
        "url": url
    }
    
    failures = scrape_semester_batch(semester_config, students, max_workers=workers)
    
    print()
    print("="*70)
    print("🎉 SCRAPING COMPLETE!")
    print("="*70)
    
    if failures:
        print(f"⚠️  {len(failures)} persistent failures:")
        for usn in failures[:20]:
            print(f"   - {usn}")
        if len(failures) > 20:
            print(f"   ... and {len(failures)-20} more")
    else:
        print("✅ All students scraped successfully!")
    
    print("="*70)

