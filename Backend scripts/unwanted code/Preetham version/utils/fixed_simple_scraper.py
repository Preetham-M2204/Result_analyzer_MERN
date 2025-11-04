"""
FIXED SIMPLE SCRAPER - No buggy semester detection
User provides: URL, Semester number, Scheme
Scraper stores exactly what you tell it to store
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

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
warnings.simplefilter("ignore")

thread_local = threading.local()
db_lock = threading.Lock()

# ==================== CAPTCHA ====================

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

# ==================== HELPERS ====================

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

# ==================== MAIN SCRAPER ====================

def scrape_usn(usn, url, semester_number):
    """
    Scrape one USN and store with the GIVEN semester number.
    NO semester detection - we trust what the user tells us.
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
            
            usn_input_field = driver.find_element(By.NAME, "lns")
            captcha_input_field = driver.find_element(By.NAME, "captchacode")
            usn_input_field.clear()
            captcha_input_field.clear()
            usn_input_field.send_keys(usn)
            captcha_input_field.send_keys(captcha_text)
            driver.find_element(By.ID, "submit").click()
            time.sleep(3)
            
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
            
            soup = BeautifulSoup(driver.page_source, "html.parser")
            
            try:
                student_name = soup.find_all("td")[3].text.lstrip(" : ")
                student_usn = soup.find_all("td")[1].text.lstrip(" : ")
            except:
                continue
            
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
                    
                    internal_marks = parse_marks(internal_text)
                    external_marks = parse_marks(external_text)
                    total_marks = parse_marks(total_text) if total_text != '-' else internal_marks + external_marks
                    
                    # Store with GIVEN semester number - NO DETECTION
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
                        scraped_at = VALUES(scraped_at)
                    """
                    
                    try:
                        cursor.execute(upsert_query, (
                            student_usn, subject_code, semester_number,
                            internal_marks, external_marks, total_marks,
                            result_status, 1, datetime.now()
                        ))
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

# ==================== BATCH SCRAPER ====================

def scrape_batch(url, semester, scheme, max_workers=7):
    """
    Scrape all students of given scheme for given semester.
    Keeps retrying failures until count stabilizes.
    """
    print("="*70)
    print(f"SCRAPING SEMESTER {semester} - SCHEME {scheme}")
    print("="*70)
    print(f"URL: {url}")
    print()
    
    # Get students
    connection = get_db_connection()
    if not connection:
        return
    
    cursor = connection.cursor()
    cursor.execute("SELECT usn FROM student_details WHERE scheme = %s ORDER BY usn", (scheme,))
    students = [row[0] for row in cursor.fetchall()]
    cursor.close()
    close_connection(connection)
    
    print(f"✅ Found {len(students)} students (scheme {scheme})")
    print(f"🚀 Using {max_workers} workers")
    print()
    
    # Initial scrape
    failed_usns = []
    success_count = 0
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_usn = {
            executor.submit(scrape_usn, usn, url, semester): usn 
            for usn in students
        }
        
        for future in as_completed(future_to_usn):
            usn = future_to_usn[future]
            try:
                if future.result():
                    success_count += 1
                else:
                    failed_usns.append(usn)
            except:
                failed_usns.append(usn)
    
    print(f"\n{'='*70}")
    print(f"Initial: ✅ {success_count}/{len(students)} | ❌ {len(failed_usns)}")
    print(f"{'='*70}")
    
    # Retry loop
    retry_count = 0
    prev_failed_count = len(failed_usns)
    same_streak = 0
    
    while failed_usns:
        retry_count += 1
        print(f"\n🔄 Retry #{retry_count} - {len(failed_usns)} USNs")
        
        current_failed = []
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_usn = {
                executor.submit(scrape_usn, usn, url, semester): usn 
                for usn in failed_usns
            }
            
            for future in as_completed(future_to_usn):
                usn = future_to_usn[future]
                try:
                    if not future.result():
                        current_failed.append(usn)
                except:
                    current_failed.append(usn)
        
        if len(current_failed) == prev_failed_count:
            same_streak += 1
            if same_streak >= 2:
                print(f"\n🛑 Stopping - failed count constant for 2 retries")
                break
        else:
            same_streak = 0
        
        prev_failed_count = len(current_failed)
        failed_usns = current_failed
    
    final_success = len(students) - len(failed_usns)
    print(f"\n{'='*70}")
    print(f"FINAL: ✅ {final_success}/{len(students)} ({final_success/len(students)*100:.1f}%)")
    if failed_usns:
        print(f"❌ Failed: {len(failed_usns)} USNs")
        for usn in failed_usns[:10]:
            print(f"   - {usn}")
    print(f"{'='*70}\n")

# ==================== MAIN ====================

if __name__ == "__main__":
    print("="*70)
    print("🚀 FIXED SIMPLE VTU SCRAPER")
    print("="*70)
    print("No buggy semester detection - you control everything!")
    print()
    
    url = input("Enter VTU results URL: ").strip()
    semester = int(input("Enter semester number (1-8): ").strip())
    scheme = input("Enter scheme (21/22): ").strip()
    workers = int(input("Workers (default 7): ").strip() or "7")
    
    scrape_batch(url, semester, scheme, workers)
    
    print("\n✅ DONE!")
