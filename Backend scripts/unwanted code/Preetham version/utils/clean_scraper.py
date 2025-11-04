"""
SIMPLE VTU Results Scraper
No complicated logic - just works!

User inputs:
1. Semester number (1-8)
2. Scheme (21 or 22)
3. URL
4. Number of workers (optional, default 7)

That's it!
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

# Configuration
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

if not sys.warnoptions:
    warnings.simplefilter("ignore")

thread_local = threading.local()
db_lock = threading.Lock()

# ==================== CAPTCHA PROCESSING ====================

def mask_captcha(image_path):
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
    except:
        return None

def capture_and_process_captcha(driver):
    try:
        captcha_element = driver.find_element(By.XPATH, '//*[@id="raj"]/div[2]/div[2]/img')
        thread_id = threading.get_ident()
        captcha_image_path = f"captcha_{thread_id}.png"
        captcha_element.screenshot(captcha_image_path)
        return mask_captcha(captcha_image_path)
    except:
        return None

def refresh_and_capture_captcha(driver):
    try:
        refresh_button = driver.find_element(By.XPATH, '//*[@id="raj"]/div[2]/div[2]/p/a')
        refresh_button.click()
        time.sleep(1.5)
        return capture_and_process_captcha(driver)
    except:
        return capture_and_process_captcha(driver)

# ==================== HELPER FUNCTIONS ====================

def parse_marks(text):
    """Extract numeric marks from text"""
    if not text or text.strip() in ['NE', 'ABS', '-', 'X', 'A', 'W', 'F', 'P']:
        return 0
    
    if '(' in text:
        try:
            num = text.split('(')[1].split(')')[0]
            return int(num)
        except:
            return 0
    
    try:
        return int(''.join(c for c in text if c.isdigit()))
    except:
        return 0

def get_existing_record(usn, subject_code, semester):
    """Get existing record to check for duplicates"""
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
    except:
        return (0, 0)
    finally:
        cursor.close()
        close_connection(connection)

# ==================== MAIN SCRAPING FUNCTION ====================

def scrape_vtu_result(usn, url, semester):
    """
    Scrape VTU results for ONE student
    semester: User-provided semester number (NO AUTO-DETECTION!)
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
                except:
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
                    return False
                elif "captcha" in alert_text.lower():
                    continue
                else:
                    continue
            except NoAlertPresentException:
                pass
            
            # Parse results
            soup = BeautifulSoup(driver.page_source, "html.parser")
            
            try:
                student_name = soup.find_all("td")[3].text.lstrip(" : ")
                student_usn = soup.find_all("td")[1].text.lstrip(" : ")
            except:
                continue
            
            # Extract ALL result tables
            try:
                all_tables = soup.find_all("div", attrs={"class": "divTable"})
                all_rows = []
                for table in all_tables:
                    table_rows = table.find_all("div", attrs={"class": "divTableRow"})[1:]
                    all_rows.extend(table_rows)
                rows = all_rows
            except:
                continue
            
            if not rows:
                return False
            
            # Insert into database
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
                    
                    # Parse marks
                    internal_marks = parse_marks(internal_text)
                    external_marks = parse_marks(external_text)
                    total_marks = parse_marks(total_text) if total_text != '-' else internal_marks + external_marks
                    
                    # Get existing record
                    existing_attempt, existing_total = get_existing_record(student_usn, subject_code, semester)
                    
                    # Determine attempt number
                    if existing_attempt == 0:
                        new_attempt = 1
                    elif existing_total != total_marks:
                        new_attempt = existing_attempt + 1
                    else:
                        continue  # Same marks - skip
                    
                    # Insert/update result - USE USER-PROVIDED SEMESTER!
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
                        semester,  # USER PROVIDED - NO AUTO DETECTION!
                        internal_marks,
                        external_marks,
                        total_marks,
                        result_status,
                        new_attempt,
                        datetime.now()
                    )
                    
                    try:
                        cursor.execute(upsert_query, data)
                    except:
                        pass
                
                connection.commit()
                cursor.close()
                close_connection(connection)
            
            print(f"✅ {usn}")
            return True
            
        except:
            continue
        
        finally:
            if driver:
                driver.quit()
            try:
                thread_id = threading.get_ident()
                os.remove(f"captcha_{thread_id}.png")
                os.remove(f"masked_captcha_{thread_id}.png")
            except:
                pass
    
    print(f"❌ {usn}")
    return False

# ==================== BATCH SCRAPING WITH RETRY ====================

def scrape_batch_with_retry(usn_list, url, semester, max_workers=7):
    """Scrape batch with smart retry"""
    failed_usns = set(usn_list)
    retry_attempt = 0
    previous_failed_count = len(failed_usns)
    same_count_streak = 0
    
    while failed_usns:
        retry_attempt += 1
        print(f"\n{'='*60}")
        print(f"🔄 Attempt #{retry_attempt}")
        print(f"📋 USNs to scrape: {len(failed_usns)}")
        print(f"{'='*60}\n")
        
        current_failed = set()
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_usn = {
                executor.submit(scrape_vtu_result, usn, url, semester): usn 
                for usn in failed_usns
            }
            
            for future in as_completed(future_to_usn):
                usn = future_to_usn[future]
                try:
                    if not future.result():
                        current_failed.add(usn)
                except:
                    current_failed.add(usn)
        
        current_failed_count = len(current_failed)
        
        # Check stopping criteria
        if current_failed_count == previous_failed_count:
            same_count_streak += 1
            print(f"\n⚠️  Failed count unchanged: {current_failed_count} (Streak: {same_count_streak}/2)")
            
            if same_count_streak >= 2:
                print(f"\n🛑 Stopping: Failed count constant for 2 attempts")
                if current_failed:
                    print(f"📋 Persistent failures ({len(current_failed)}):")
                    for usn in sorted(list(current_failed)[:20]):
                        print(f"   - {usn}")
                    if len(current_failed) > 20:
                        print(f"   ... and {len(current_failed)-20} more")
                break
        else:
            same_count_streak = 0
        
        previous_failed_count = current_failed_count
        failed_usns = current_failed
        
        if not failed_usns:
            print(f"\n✅ All USNs scraped successfully!")
            break
    
    return list(failed_usns)

# ==================== MAIN ====================

if __name__ == "__main__":
    print("="*70)
    print("VTU RESULTS SCRAPER")
    print("="*70)
    print()
    
    # Get user inputs
    semester = int(input("Enter semester number (1-8): ").strip())
    scheme = input("Enter scheme (21 or 22): ").strip()
    url = input("Enter VTU results URL: ").strip()
    workers = input("Number of parallel workers (default 7): ").strip()
    workers = int(workers) if workers else 7
    
    print()
    print("="*70)
    print(f"Configuration:")
    print(f"  Semester: {semester}")
    print(f"  Scheme: {scheme}")
    print(f"  Workers: {workers}")
    print(f"  URL: {url}")
    print("="*70)
    print()
    
    # Get students from database
    connection = get_db_connection()
    if not connection:
        print("❌ Cannot connect to database")
        sys.exit(1)
    
    cursor = connection.cursor()
    cursor.execute("SELECT usn FROM student_details WHERE scheme = %s ORDER BY usn", (scheme,))
    students = [row[0] for row in cursor.fetchall()]
    cursor.close()
    close_connection(connection)
    
    if not students:
        print(f"❌ No students found for scheme {scheme}")
        sys.exit(1)
    
    print(f"✅ Found {len(students)} students for scheme {scheme}")
    print()
    
    start_time = time.time()
    
    # Scrape with retry
    failures = scrape_batch_with_retry(students, url, semester, max_workers=workers)
    
    elapsed = time.time() - start_time
    
    # Final summary
    print()
    print("="*70)
    print("SCRAPING COMPLETE")
    print("="*70)
    print(f"Total students: {len(students)}")
    print(f"Successfully scraped: {len(students) - len(failures)}")
    print(f"Failed: {len(failures)}")
    print(f"Time taken: {elapsed/60:.2f} minutes")
    print("="*70)
