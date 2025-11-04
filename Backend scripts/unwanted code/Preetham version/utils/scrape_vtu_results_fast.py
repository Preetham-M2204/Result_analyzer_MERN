"""
VTU Results Scraper - FAST PARALLEL VERSION
Uses ThreadPoolExecutor for concurrent scraping (much faster than sequential)
Each thread runs its own browser instance to scrape multiple students in parallel

Usage:
    python scrape_vtu_results_fast.py
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
from selenium.common.exceptions import (
    UnexpectedAlertPresentException, 
    NoSuchElementException, 
    TimeoutException, 
    NoAlertPresentException
)
import time
from bs4 import BeautifulSoup
from datetime import datetime
from db_config import get_db_connection, close_connection
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

# ==================== CONFIGURATION ====================
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

if not sys.warnoptions:
    warnings.simplefilter("ignore")

# Thread-local storage for browser instances
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
        
        # Use thread ID to avoid conflicts
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

# ==================== SCRAPING FUNCTION ====================

def get_vtu_results(usn, url, target_semester):
    """
    Scrapes VTU results for a single USN.
    Returns True if successful, False otherwise.
    """
    options = webdriver.ChromeOptions()
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--headless")  # Run in background for speed
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--log-level=3")  # Suppress logs
    
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
            
            # Extract semester
            try:
                semester_element = driver.find_element(
                    By.XPATH, 
                    '//*[@id="dataPrint"]/div[1]/div/div[2]/div[2]/div[1]/div/div/div[2]/div/div/div[1]/b'
                )
                text = semester_element.text.strip()
                numeric_part = ''.join(char for char in text if char.isdigit())
                detected_semester = int(numeric_part) if numeric_part else target_semester
            except NoSuchElementException:
                continue
            
            # Parse with BeautifulSoup
            soup = BeautifulSoup(driver.page_source, "html.parser")
            
            try:
                student_name = soup.find_all("td")[3].text.lstrip(" : ")
                student_usn = soup.find_all("td")[1].text.lstrip(" : ")
            except (IndexError, AttributeError):
                continue
            
            # Extract result table
            try:
                table = soup.find_all("div", attrs={"class": "divTable"})[0]
                rows = table.find_all("div", attrs={"class": "divTableRow"})[1:]
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
                    internal_marks = cells[2].text.strip()
                    external_marks = cells[3].text.strip()
                    total_marks = cells[4].text.strip()
                    result_status = cells[5].text.strip()
                    
                    try:
                        internal_marks = int(internal_marks) if internal_marks.isdigit() else 0
                    except:
                        internal_marks = 0
                    
                    try:
                        external_marks = int(external_marks) if external_marks.isdigit() else 0
                    except:
                        external_marks = 0
                    
                    try:
                        total_marks = int(total_marks) if total_marks.isdigit() else internal_marks + external_marks
                    except:
                        total_marks = internal_marks + external_marks
                    
                    insert_query = """
                    INSERT INTO results 
                    (student_usn, subject_code, semester, internal_marks, external_marks, total_marks, result_status, attempt_number, scraped_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        internal_marks = VALUES(internal_marks),
                        external_marks = VALUES(external_marks),
                        total_marks = VALUES(total_marks),
                        result_status = VALUES(result_status),
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
                        1,
                        datetime.now()
                    )
                    
                    try:
                        cursor.execute(insert_query, data)
                    except Exception:
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

# ==================== PARALLEL SCRAPING ====================

def scrape_all_students_parallel(url, semester, max_workers=5):
    """
    Scrape results for all students in parallel.
    max_workers: Number of parallel browser instances (default 5, increase for faster scraping)
    """
    try:
        connection = get_db_connection()
        if not connection:
            return
        
        cursor = connection.cursor()
        
        # For semesters 1 and 2, skip diploma/lateral entry students (1BI24IS4XX series)
        # They join from semester 3
        if semester in [1, 2]:
            cursor.execute("SELECT usn, name FROM student_details WHERE usn NOT LIKE '1BI24IS4%' ORDER BY usn")
            print(f"📋 Note: Skipping lateral entry students (1BI24IS4XX) for semester {semester}")
        else:
            cursor.execute("SELECT usn, name FROM student_details ORDER BY usn")
        
        students = cursor.fetchall()
        cursor.close()
        close_connection(connection)
        
        total_students = len(students)
        print(f"\n📊 Found {total_students} students to scrape")
        print(f"🚀 Using {max_workers} parallel workers for faster scraping")
        print("="*60)
        
        success_count = 0
        error_count = 0
        
        start_time = time.time()
        
        # Use ThreadPoolExecutor for parallel scraping
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all tasks
            future_to_usn = {
                executor.submit(get_vtu_results, usn, url, semester): (usn, name) 
                for usn, name in students
            }
            
            # Process completed tasks
            for future in as_completed(future_to_usn):
                usn, name = future_to_usn[future]
                try:
                    if future.result():
                        success_count += 1
                    else:
                        error_count += 1
                except Exception:
                    error_count += 1
        
        elapsed_time = time.time() - start_time
        
        print("\n" + "="*60)
        print(f"✅ Successfully scraped: {success_count} students")
        print(f"❌ Errors/Not Found: {error_count}")
        print(f"⏱️  Total time: {elapsed_time:.2f} seconds")
        print(f"⚡ Average: {elapsed_time/total_students:.2f} seconds per student")
        print("="*60)
        
    except Exception as e:
        print(f"❌ Error in parallel scraping: {e}")

# ==================== MAIN ====================

if __name__ == "__main__":
    print("="*60)
    print("🚀 VTU RESULTS SCRAPER - FAST PARALLEL VERSION")
    print("="*60)
    print()
    
    semester = int(input("Enter semester (1/2/3/4): ").strip())
    url = input("Enter VTU results URL: ").strip()
    workers = input("Number of parallel workers (default 5, max 10): ").strip()
    
    try:
        workers = int(workers) if workers else 5
        workers = min(workers, 10)  # Cap at 10 to avoid overwhelming the system
    except:
        workers = 5
    
    print("\n⚠️  WARNING: This will scrape results for ALL students!")
    confirm = input("Continue? (yes/no): ").strip().lower()
    
    if confirm in ['yes', 'y']:
        scrape_all_students_parallel(url, semester, max_workers=workers)
    else:
        print("❌ Cancelled")
