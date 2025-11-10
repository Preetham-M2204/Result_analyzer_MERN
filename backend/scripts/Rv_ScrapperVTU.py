"""
RV RESULTS SCRAPER (REVALUATION)
==================================

This scraper handles VTU Revaluation results which have a different 
structure from regular results.

RV Result Structure:
- Internal Marks (unchanged in RV)
- Old Marks (external from first attempt)
- Old Result
- RV Marks (revaluation external marks)
- RV Result
- Final Marks (internal + RV external)
- Final Result

Key Points:
- RV does NOT create a new attempt (it's revaluation, not re-attempt)
- Only EXTERNAL marks change in RV
- Total marks = internal (unchanged) + RV external (new)
- Letter grades and grade points are set to NULL and recalculated by calculate_grades.py

Important:
After running this scraper, you MUST run calculate_grades.py to:
1. Recalculate letter grades based on new total marks
2. Update grade points
3. Recalculate SGPA/CGPA

Usage:
python Rv_ScrapperVTU.py --url "https://results.vtu.ac.in/..." --usns "1BI22IS001,1BI22IS002"

Then run:
python calculate_grades.py --semester <semester_number>
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

# ==================== CAPTCHA PROCESSING (REUSED FROM ULTIMATE_SCRAPER) ====================

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
        processed_image_path = f"masked_captcha_rv_{thread_id}.png"
        cv2.imwrite(processed_image_path, masked_image)
        return processed_image_path
    except Exception as e:
        return None

def capture_and_process_captcha(driver):
    """Captures the CAPTCHA image and processes it with masking."""
    try:
        captcha_element = driver.find_element(By.XPATH, '//*[@id="raj"]/div[2]/div[2]/img')
        thread_id = threading.get_ident()
        captcha_image_path = f"captcha_rv_{thread_id}.png"
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
    if not text or text.strip() in ['NE', 'ABS', '-', 'X', 'A', 'W', 'F', 'P', '']:
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

# ==================== RV-SPECIFIC TABLE PARSING ====================

def get_latest_attempt_number(usn, subject_code, semester):
    """
    Get the latest attempt number for a subject.
    Returns the next attempt number to use.
    """
    connection = get_db_connection()
    if not connection:
        return 1
    
    cursor = connection.cursor()
    query = """
    SELECT MAX(attempt_number)
    FROM results
    WHERE student_usn = %s AND subject_code = %s AND semester = %s
    """
    
    try:
        cursor.execute(query, (usn, subject_code, semester))
        result = cursor.fetchone()
        if result and result[0]:
            return result[0] + 1  # Next attempt
        return 1  # First attempt (shouldn't happen for RV)
    except Exception:
        return 1
    finally:
        cursor.close()
        close_connection(connection)

# ==================== MAIN RV SCRAPING FUNCTION ====================

def get_vtu_rv_results(usn, url):
    """
    Scrapes VTU REVALUATION results for a single USN.
    
    RV Table Structure:
    - Subject Code
    - Subject Name
    - Internal Marks
    - Old Marks (external)
    - Old Result
    - RV Marks (revaluation external marks)
    - RV Result
    - Final Marks (internal + final external)
    - Final Result
    
    Returns True if successful, False otherwise.
    """
    
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
                    print(f"WARN {usn}: Invalid USN or no RV results")
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
                print(f"OK Found RV results for: {student_name} ({student_usn})")
            except (IndexError, AttributeError) as e:
                print(f"FAIL Could not extract student info: {e}")
                continue
            
            # ==================== RV TABLE PARSING ====================
            # The RV table has a DIFFERENT structure than regular results
            
            try:
                # Find the result table - look for the semester header (e.g., "Semester : 4")
                all_tables = soup.find_all("div", attrs={"class": "divTable"})
                print(f"INFO Found {len(all_tables)} result tables")
                
                if not all_tables:
                    print(f"FAIL No result tables found for {usn}")
                    return False
                
                # Process each table (usually one per semester that had RV)
                for table_idx, table in enumerate(all_tables):
                    # Get rows - skip header row
                    rows = table.find_all("div", attrs={"class": "divTableRow"})[1:]
                    print(f" Table {table_idx+1}: {len(rows)} rows")
                    
                    if not rows:
                        continue
                    
                    # Database operations with lock
                    with db_lock:
                        connection = get_db_connection()
                        if not connection:
                            return False
                        
                        cursor = connection.cursor()
                        
                        for row in rows:
                            cells = row.find_all("div", attrs={"class": "divTableCell"})
                            
                            # RV table has 9 columns:
                            # 0: Subject Code
                            # 1: Subject Name
                            # 2: Internal Marks
                            # 3: Old Marks (external)
                            # 4: Old Result
                            # 5: RV Marks (revaluation external)
                            # 6: RV Result
                            # 7: Final Marks (total)
                            # 8: Final Result
                            
                            if len(cells) < 9:
                                print(f"  WARN Skipping row with {len(cells)} cells (expected 9)")
                                continue
                            
                            subject_code = cells[0].text.strip()
                            subject_name = cells[1].text.strip()
                            internal_text = cells[2].text.strip()
                            old_marks_text = cells[3].text.strip()
                            old_result = cells[4].text.strip()
                            rv_marks_text = cells[5].text.strip()
                            rv_result = cells[6].text.strip()
                            final_marks_text = cells[7].text.strip()
                            final_result = cells[8].text.strip()
                            
                            # Skip header rows
                            if subject_code == 'Subject Code' or not subject_code:
                                continue
                            
                            # Extract semester
                            detected_semester = extract_semester_from_subject_code(subject_code)
                            if detected_semester == 0:
                                print(f"  WARN Could not extract semester from: {subject_code}")
                                continue
                            
                            # Parse marks
                            internal_marks = parse_marks(internal_text)
                            old_external_marks = parse_marks(old_marks_text)
                            rv_external_marks = parse_marks(rv_marks_text)
                            final_marks_vtu = parse_marks(final_marks_text)  # VTU's final marks (for reference only)
                            
                            # CRITICAL: RV only changes EXTERNAL marks
                            # Internal marks stay the same
                            # We must recalculate total = internal + RV external
                            recalculated_total = internal_marks + rv_external_marks
                            
                            # RV is RE-EVALUATION, not re-attempt!
                            # We should UPDATE the existing attempt's marks, not create a new attempt
                            
                            # Check if this result already exists
                            check_query = """
                            SELECT attempt_number, total_marks, result_status, internal_marks, external_marks
                            FROM results 
                            WHERE student_usn = %s 
                              AND subject_code = %s 
                              AND semester = %s
                            ORDER BY attempt_number DESC 
                            LIMIT 1
                            """
                            
                            cursor.execute(check_query, (student_usn, subject_code, detected_semester))
                            existing_record = cursor.fetchone()
                            
                            if existing_record:
                                # Record exists - UPDATE with RV marks (don't change attempt_number)
                                existing_attempt = existing_record[0]
                                existing_total = existing_record[1]
                                existing_status = existing_record[2]
                                existing_internal = existing_record[3]
                                existing_external = existing_record[4]
                                
                                # Verify internal marks match (they shouldn't change in RV)
                                if existing_internal != internal_marks:
                                    print(f"  WARN {subject_code}: Internal marks mismatch (DB:{existing_internal} vs VTU:{internal_marks})")
                                
                                # Update the SAME attempt with RV external marks and recalculated total
                                # DO NOT update letter_grade and grade_points here - let calculate_grades.py do it
                                update_query = """
                                UPDATE results
                                SET internal_marks = %s,
                                    external_marks = %s,
                                    total_marks = %s,
                                    result_status = %s,
                                    letter_grade = NULL,
                                    grade_points = NULL,
                                    scraped_at = %s
                                WHERE student_usn = %s
                                  AND subject_code = %s
                                  AND semester = %s
                                  AND attempt_number = %s
                                """
                                
                                data = (
                                    internal_marks,          # Keep internal same
                                    rv_external_marks,       # Update external with RV marks
                                    recalculated_total,      # Recalculated: internal + RV external
                                    final_result,            # Use final result status (P/F)
                                    datetime.now(),
                                    student_usn,
                                    subject_code,
                                    detected_semester,
                                    existing_attempt         # Keep same attempt number
                                )
                                
                                try:
                                    cursor.execute(update_query, data)
                                    ext_change = f"{existing_external}→{rv_external_marks}" if existing_external != rv_external_marks else str(rv_external_marks)
                                    total_change = f"{existing_total}→{recalculated_total}" if existing_total != recalculated_total else str(recalculated_total)
                                    status_changed = f"{existing_status}→{final_result}" if existing_status != final_result else final_result
                                    print(f"  UPDATE {subject_code}: RV (Attempt {existing_attempt}) | Ext: {ext_change}, Total: {total_change}, Status: {status_changed}")
                                    print(f"         Internal: {internal_marks} (unchanged) + External: {rv_external_marks} (RV) = Total: {recalculated_total}")
                                except Exception as e:
                                    print(f"  FAIL Failed to update RV result for {subject_code}: {e}")
                                
                            else:
                                # No existing record - this shouldn't happen for RV results
                                # (RV implies there was a previous attempt that was evaluated)
                                # But handle it by inserting as attempt 1
                                print(f"  WARN {subject_code}: No existing record found for RV (unusual). Inserting as attempt 1.")
                                
                                insert_query = """
                                INSERT INTO results
                                (student_usn, subject_code, semester, internal_marks, external_marks,
                                 total_marks, result_status, attempt_number, scraped_at)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                                """
                                
                                data = (
                                    student_usn,
                                    subject_code,
                                    detected_semester,
                                    internal_marks,
                                    rv_external_marks,
                                    recalculated_total,  # Use recalculated total
                                    final_result,
                                    1,  # First attempt
                                    datetime.now()
                                )
                                
                                try:
                                    cursor.execute(insert_query, data)
                                    print(f"  INSERT {subject_code}: Old={old_result}, RV={rv_result}, Final={final_result} (Attempt 1)")
                                except Exception as e:
                                    # If foreign key constraint fails, try to add the subject first
                                    if "foreign key constraint" in str(e).lower():
                                        print(f"  WARN Subject {subject_code} not in database, adding it...")
                                        try:
                                            # Infer scheme from subject code
                                            subject_scheme = subject_code[:2] if subject_code[:2] in ['21', '22'] else '21'
                                            cursor.execute("""
                                            INSERT INTO subjects
                                            (subject_code, subject_name, semester, credits, scheme)
                                            VALUES (%s, %s, %s, %s, %s)
                                            ON DUPLICATE KEY UPDATE subject_name = VALUES(subject_name)
                                            """, (subject_code, subject_name, detected_semester, 0, subject_scheme))
                                            
                                            # Retry insert
                                            cursor.execute(insert_query, data)
                                            print(f"  OK Added subject and inserted RV result")
                                        except Exception as e2:
                                            print(f"  FAIL Still failed: {e2}")
                                    else:
                                        print(f"  FAIL Failed to insert RV result for {subject_code}: {e}")
                        
                        connection.commit()
                        cursor.close()
                        close_connection(connection)
                
                print(f"OK {usn} - RV results scraped")
                return True
                
            except Exception as e:
                print(f"FAIL Error parsing RV table for {usn}: {e}")
                continue
        
        except Exception as e:
            print(f"FAIL Error scraping {usn}: {e}")
            continue
        
        finally:
            if driver:
                driver.quit()
            
            # Cleanup temp files
            try:
                thread_id = threading.get_ident()
                os.remove(f"captcha_rv_{thread_id}.png")
                os.remove(f"masked_captcha_rv_{thread_id}.png")
            except:
                pass
    
    print(f"FAIL {usn} - Failed after {max_attempts} attempts")
    return False

# ==================== SMART RETRY LOGIC ====================

def scrape_rv_with_smart_retry(usn_list, url, max_workers=5):
    """
    Scrapes RV results with smart retry logic.
    Stops when failed count stays constant for 2 consecutive attempts.
    """
    failed_usns = set(usn_list)
    retry_attempt = 0
    previous_failed_count = len(failed_usns)
    same_count_streak = 0
    
    while failed_usns:
        retry_attempt += 1
        print(f"\n{'='*60}")
        print(f"RETRY Retry Attempt #{retry_attempt}")
        print(f"INFO USNs to retry: {len(failed_usns)}")
        print(f"{'='*60}\n")
        
        current_failed = set()
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_usn = {
                executor.submit(get_vtu_rv_results, usn, url): usn
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
            print(f"\nWARN Failed count unchanged: {current_failed_count} (Streak: {same_count_streak}/2)")
            
            if same_count_streak >= 2:
                print(f"\nSTOP Stopping retry: Failed count constant for 2 attempts")
                if current_failed:
                    print(f"INFO Persistently failed USNs ({len(current_failed)}):")
                    for usn in sorted(current_failed):
                        print(f"  - {usn}")
                break
        else:
            same_count_streak = 0
        
        previous_failed_count = current_failed_count
        failed_usns = current_failed
        
        if not failed_usns:
            print(f"\nOK All USNs scraped successfully!")
            break
    
    return list(failed_usns)

# ==================== MAIN ====================

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='VTU RV (Revaluation) Results Scraper')
    parser.add_argument('--url', type=str, help='VTU RV Results URL', required=False)
    parser.add_argument('--workers', type=int, default=5, help='Number of parallel workers')
    parser.add_argument('--usns', type=str, help='Comma-separated USN list', required=False)
    parser.add_argument('--scheme', type=str, help='Scheme (21/22)', required=False)
    
    args = parser.parse_args()
    
    print("="*70)
    print("RV SCRAPER VTU REVALUATION RESULTS SCRAPER")
    print("="*70)
    print()
    
    # If arguments provided, use them
    if args.url:
        url = args.url
        workers = args.workers
        
        # Get students
        if args.usns:
            students = [usn.strip() for usn in args.usns.split(',') if usn.strip()]
            print(f"INFO Using provided USN list: {len(students)} students")
        else:
            scheme = args.scheme or '21'
            connection = get_db_connection()
            if not connection:
                sys.exit(0)
            
            cursor = connection.cursor()
            cursor.execute("SELECT usn FROM student_details WHERE scheme = %s ORDER BY usn", (scheme,))
            students = [row[0] for row in cursor.fetchall()]
            cursor.close()
            close_connection(connection)
            
            if not students:
                print(f"FAIL No students found for scheme {scheme}")
                sys.exit(0)
        
        print()
        print("="*70)
        print(f"DATA Configuration:")
        print(f"  URL: {url}")
        print(f"  Students: {len(students)}")
        print(f"  Workers: {workers}")
        print("="*70)
        print()
        
    else:
        # Interactive mode
        print("VTU RV Results Scraper")
        print("="*70)
        print()
        
        url = input("Enter VTU RV Results URL: ").strip()
        if not url:
            print("FAIL No URL provided. Exiting.")
            sys.exit(0)
        
        mode = input("Choose mode:\n1. Single USN\n2. Entire Batch\nEnter choice (1/2): ").strip()
        
        if mode == '1':
            usn = input("Enter USN: ").strip().upper()
            if not usn:
                print("FAIL No USN provided. Exiting.")
                sys.exit(0)
            students = [usn]
            workers = 1
        
        elif mode == '2':
            scheme = input("Enter Scheme (21/22): ").strip() or '21'
            
            workers_input = input("Number of parallel workers (default 5): ").strip() or "5"
            try:
                workers = int(workers_input)
            except:
                workers = 5
            
            # Get students
            connection = get_db_connection()
            if not connection:
                sys.exit(0)
            
            cursor = connection.cursor()
            cursor.execute("SELECT usn FROM student_details WHERE scheme = %s ORDER BY usn", (scheme,))
            students = [row[0] for row in cursor.fetchall()]
            cursor.close()
            close_connection(connection)
            
            if not students:
                print(f"FAIL No students found for scheme {scheme}")
                sys.exit(0)
        
        else:
            print("FAIL Invalid choice. Exiting.")
            sys.exit(0)
        
        print()
        print("="*70)
        print(f"DATA Configuration:")
        print(f"  URL: {url}")
        print(f"  Students: {len(students)}")
        print(f"  Workers: {workers}")
        print("="*70)
        print()
        
        confirm = input("Start scraping RV results? (yes/no): ").strip().lower()
        if confirm != 'yes':
            print("Cancelled.")
            sys.exit(0)
    
    print()
    print("="*70)
    print("STARTING RV SCRAPE...")
    print("="*70)
    print()
    
    # Initial scrape
    failed_usns = []
    success_count = 0
    start_time = time.time()
    
    with ThreadPoolExecutor(max_workers=workers) as executor:
        future_to_usn = {
            executor.submit(get_vtu_rv_results, usn, url): usn
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
    print(f"Initial RV Scrape Complete:")
    print(f"OK Success: {success_count}/{len(students)}")
    print(f"FAIL Failed: {len(failed_usns)}")
    print(f"TIME Time: {elapsed:.2f}s ({elapsed/60:.2f} min)")
    print(f"{'='*60}")
    
    # Retry failed USNs
    if failed_usns:
        persistent_failures = scrape_rv_with_smart_retry(failed_usns, url, workers)
        final_success = len(students) - len(persistent_failures)
        
        print(f"\n{'='*60}")
        print(f"FINAL RV STATS:")
        print(f"OK Successfully scraped: {final_success}/{len(students)} ({final_success/len(students)*100:.1f}%)")
        print(f"FAIL Permanently failed: {len(persistent_failures)}")
        print(f"{'='*60}\n")
    else:
        print(f"\nOK All RV results scraped successfully!")
    
    print()
    print("="*70)
    print("DONE RV SCRAPING COMPLETE!")
    print("="*70)
