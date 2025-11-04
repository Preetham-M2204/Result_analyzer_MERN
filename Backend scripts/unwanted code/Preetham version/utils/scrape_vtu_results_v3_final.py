"""
VTU Results Scraper - VERSION 3 FINAL (Production Ready)
Features:
- ✅ Detects semester from subject code (not page-level)
- ✅ Handles multiple attempts with attempt counter
- ✅ Stores only LATEST attempt with attempt count (space-efficient)
- ✅ Parses NE (13), ABS, X, F, P, W correctly
- ✅ Smart retry logic for failed USNs
- ✅ Multi-batch support
- ✅ Parallel scraping

Usage:
    python scrape_vtu_results_v3_final.py
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

# Thread-local storage
thread_local = threading.local()

# Lock for database writes
db_lock = threading.Lock()

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
        BMATS101 → 1
        BCS302 → 3
        BESCK204C → 2
        BCS401 → 4
    
    Logic: Find first digit in the subject code
    """
    match = re.search(r'\d', subject_code)
    if match:
        return int(match.group())
    return 0  # Default if no digit found

def parse_marks(text):
    """
    Extract numeric marks, handle NE, ABS, X, etc.
    Examples:
        "45" → 45
        "NE (13)" → 13
        "NE" → 0
        "ABS" → 0
        "A" → 0
        "X" → 0
        "-" → 0
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

# ==================== SCRAPING FUNCTION ====================

def get_vtu_results(usn, url, target_semester=None):
    """
    Scrapes VTU results for a single USN.
    - Detects semester from subject code
    - Updates existing records with new attempt count
    - Handles all result statuses: F, W, P, A, X, NE
    
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
            except (IndexError, AttributeError):
                continue
            
            # Extract ALL result tables (VTU shows multiple tables for different semesters)
            try:
                all_tables = soup.find_all("div", attrs={"class": "divTable"})
                all_rows = []
                for table in all_tables:
                    table_rows = table.find_all("div", attrs={"class": "divTableRow"})[1:]  # Skip header
                    all_rows.extend(table_rows)
                rows = all_rows
            except (IndexError, AttributeError):
                continue
            
            if not rows:
                return False
            
            # Insert into database with lock
            with db_lock:
                connection = get_db_connection()
                if not connection:
                    return False
                
                cursor = connection.cursor()
                
                for row in rows:
                    cells = row.find_all("div", attrs={"class": "divTableCell"})
                    
                    if len(cells) < 6:
                        continue
                    
                    subject_code = cells[0].text.strip()
                    subject_name = cells[1].text.strip()
                    internal_text = cells[2].text.strip()
                    external_text = cells[3].text.strip()
                    total_text = cells[4].text.strip()
                    result_status = cells[5].text.strip()
                    
                    # Extract semester from subject code
                    detected_semester = extract_semester_from_subject_code(subject_code)
                    
                    # Parse marks
                    internal_marks = parse_marks(internal_text)
                    external_marks = parse_marks(external_text)
                    total_marks = parse_marks(total_text) if total_text != '-' else internal_marks + external_marks
                    
                    # Get existing record
                    existing_attempt, existing_total = get_existing_record(student_usn, subject_code, detected_semester)
                    
                    # Determine new attempt number
                    if existing_attempt == 0:
                        # First time seeing this subject
                        new_attempt = 1
                    elif existing_total != total_marks:
                        # Marks changed - student retook exam
                        new_attempt = existing_attempt + 1
                    else:
                        # Same marks - skip (already have this data)
                        continue
                    
                    # Insert or update (replace existing with new attempt count)
                    upsert_query = """
                    INSERT INTO results 
                    (student_usn, subject_code, semester, internal_marks, external_marks, 
                     total_marks, result_status, attempt_number, scraped_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        internal_marks = VALUES(internal_marks),
                        external_marks = VALUES(external_marks),
                        total_marks = VALUES(total_marks),
                        result_status = VALUES(result_status),
                        attempt_number = VALUES(attempt_number),
                        scraped_at = VALUES(scraped_at)
                    """
                    
                    data = (
                        student_usn,
                        subject_code,
                        detected_semester,
                        internal_marks,
                        external_marks,
                        total_marks,
                        result_status,
                        new_attempt,
                        datetime.now()
                    )
                    
                    try:
                        cursor.execute(upsert_query, data)
                    except Exception as e:
                        pass
                
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

def scrape_with_smart_retry(usn_list, url, max_workers=5):
    """
    Scrapes USNs with smart retry logic.
    Stops retrying when:
    - Failed USN count stays constant for 2 consecutive attempts
    - All USNs are successfully scraped
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
                executor.submit(get_vtu_results, usn, url): usn 
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
                print(f"📋 Persistently failed USNs ({len(current_failed)}):")
                for usn in sorted(current_failed):
                    print(f"   - {usn}")
                break
        else:
            same_count_streak = 0  # Reset streak
        
        previous_failed_count = current_failed_count
        failed_usns = current_failed
        
        if not failed_usns:
            print(f"\n✅ All USNs scraped successfully!")
            break
    
    return list(failed_usns)

# ==================== MULTI-BATCH SUPPORT ====================

def scrape_multiple_batches(batch_configs, max_workers=5):
    """
    Scrape multiple batches with different configurations.
    
    batch_configs = [
        {"batch_name": "2023 Batch", "url": "...", "usn_pattern": "1BI23IS%"},
        {"batch_name": "2024 Batch", "url": "...", "usn_pattern": "1BI24IS%"},
    ]
    """
    overall_start = time.time()
    
    for i, config in enumerate(batch_configs, 1):
        print(f"\n{'#'*60}")
        print(f"BATCH {i}/{len(batch_configs)}: {config['batch_name']}")
        print(f"{'#'*60}\n")
        
        # Get students matching pattern
        connection = get_db_connection()
        if not connection:
            continue
        
        cursor = connection.cursor()
        cursor.execute(
            "SELECT usn FROM student_details WHERE usn LIKE %s ORDER BY usn",
            (config['usn_pattern'],)
        )
        students = [row[0] for row in cursor.fetchall()]
        cursor.close()
        close_connection(connection)
        
        print(f"📊 Found {len(students)} students matching pattern: {config['usn_pattern']}")
        
        # Initial scrape
        failed_usns = []
        success_count = 0
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_usn = {
                executor.submit(get_vtu_results, usn, config['url']): usn 
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
        print(f"Initial Scrape Complete:")
        print(f"✅ Success: {success_count}/{len(students)}")
        print(f"❌ Failed: {len(failed_usns)}")
        print(f"⏱️  Time: {elapsed:.2f}s")
        print(f"{'='*60}")
        
        # Retry failed USNs with smart logic
        if failed_usns:
            persistent_failures = scrape_with_smart_retry(failed_usns, config['url'], max_workers)
            
            final_success = len(students) - len(persistent_failures)
            print(f"\n📊 FINAL STATS FOR {config['batch_name']}:")
            print(f"   ✅ Successfully scraped: {final_success}/{len(students)}")
            print(f"   ❌ Permanently failed: {len(persistent_failures)}")
    
    overall_elapsed = time.time() - overall_start
    print(f"\n{'#'*60}")
    print(f"ALL BATCHES COMPLETE")
    print(f"⏱️  Total Time: {overall_elapsed/60:.2f} minutes")
    print(f"{'#'*60}\n")

# ==================== SINGLE BATCH SCRAPING ====================

def scrape_single_batch(url, usn_pattern=None, max_workers=5):
    """
    Scrape a single batch with retry logic.
    """
    connection = get_db_connection()
    if not connection:
        return
    
    cursor = connection.cursor()
    
    if usn_pattern:
        cursor.execute(
            "SELECT usn FROM student_details WHERE usn LIKE %s ORDER BY usn",
            (usn_pattern,)
        )
    else:
        cursor.execute("SELECT usn FROM student_details ORDER BY usn")
    
    students = [row[0] for row in cursor.fetchall()]
    cursor.close()
    close_connection(connection)
    
    print(f"\n📊 Found {len(students)} students to scrape")
    print(f"🚀 Using {max_workers} parallel workers")
    print("="*60)
    
    # Initial scrape
    failed_usns = []
    success_count = 0
    
    start_time = time.time()
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_usn = {
            executor.submit(get_vtu_results, usn, url): usn 
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
    print(f"Initial Scrape Complete:")
    print(f"✅ Success: {success_count}/{len(students)}")
    print(f"❌ Failed: {len(failed_usns)}")
    print(f"⏱️  Time: {elapsed:.2f}s ({elapsed/60:.2f} min)")
    print(f"{'='*60}")
    
    # Retry failed USNs
    if failed_usns:
        persistent_failures = scrape_with_smart_retry(failed_usns, url, max_workers)
        
        final_success = len(students) - len(persistent_failures)
        print(f"\n{'='*60}")
        print(f"FINAL STATISTICS:")
        print(f"✅ Successfully scraped: {final_success}/{len(students)} ({final_success/len(students)*100:.1f}%)")
        print(f"❌ Permanently failed: {len(persistent_failures)}")
        print(f"{'='*60}\n")

# ==================== MAIN ====================

if __name__ == "__main__":
    print("="*60)
    print("🚀 VTU RESULTS SCRAPER - VERSION 3 FINAL")
    print("="*60)
    print("Features:")
    print("  ✅ Auto-detects semester from subject code")
    print("  ✅ Tracks attempt count (space-efficient)")
    print("  ✅ Handles NE, ABS, X, F, P, W, A")
    print("  ✅ Smart retry logic")
    print("  ✅ Multi-batch support")
    print("  ✅ Parallel scraping")
    print("="*60)
    print()
    
    mode = input("Select mode:\n  1. Single batch\n  2. Multiple batches\nChoice (1/2): ").strip()
    
    if mode == "2":
        # Multi-batch example
        print("\n📋 Multi-Batch Mode")
        print("Enter batch configurations (or type 'done' when finished)")
        
        batch_configs = []
        while True:
            print(f"\nBatch #{len(batch_configs) + 1}:")
            batch_name = input("  Batch name (or 'done'): ").strip()
            if batch_name.lower() == 'done':
                break
            
            url = input("  VTU results URL: ").strip()
            usn_pattern = input("  USN pattern (e.g., 1BI23IS%): ").strip()
            
            batch_configs.append({
                "batch_name": batch_name,
                "url": url,
                "usn_pattern": usn_pattern
            })
        
        if batch_configs:
            workers = int(input("\nNumber of parallel workers (5-10): ").strip() or "5")
            scrape_multiple_batches(batch_configs, max_workers=workers)
    
    else:
        # Single batch
        url = input("Enter VTU results URL: ").strip()
        usn_pattern = input("USN pattern (leave blank for all, e.g., 1BI23IS%): ").strip() or None
        workers = int(input("Number of parallel workers (5-10): ").strip() or "5")
        
        print("\n⚠️  Starting scrape...")
        scrape_single_batch(url, usn_pattern, max_workers=workers)
