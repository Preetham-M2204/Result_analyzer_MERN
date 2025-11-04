"""
Test VTU Scraper V2 - Display Only (No Database Write)
Tests the scraping logic and shows what would be inserted
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

# ==================== CONFIGURATION ====================
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

if not sys.warnoptions:
    warnings.simplefilter("ignore")

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
        
        processed_image_path = "test_masked_captcha.png"
        cv2.imwrite(processed_image_path, masked_image)
        return processed_image_path
    except Exception as e:
        print(f"❌ Captcha masking error: {e}")
        return None

def capture_and_process_captcha(driver):
    """Captures the CAPTCHA image and processes it with masking."""
    try:
        captcha_element = driver.find_element(By.XPATH, '//*[@id="raj"]/div[2]/div[2]/img')
        captcha_image_path = "test_captcha.png"
        captcha_element.screenshot(captcha_image_path)
        return mask_captcha(captcha_image_path)
    except Exception as e:
        print(f"❌ Captcha capture error: {e}")
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
    import re
    match = re.search(r'\d', subject_code)
    if match:
        return int(match.group())
    return 0  # Default if no digit found

def parse_marks(text):
    """
    Extract numeric marks, handle NE, ABS, X, F, P, W, A
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

# ==================== TEST SCRAPING FUNCTION ====================

def test_scrape_vtu_results(usn, url):
    """
    Test scraping for a single USN - DISPLAY ONLY, NO DATABASE WRITE
    """
    print("="*80)
    print(f"🧪 TESTING SCRAPER V2 - DISPLAY MODE")
    print("="*80)
    print(f"USN: {usn}")
    print(f"URL: {url}")
    print("="*80)
    
    options = webdriver.ChromeOptions()
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-blink-features=AutomationControlled")
    # options.add_argument("--headless")  # Comment out to see browser
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    
    max_attempts = 10
    
    for attempt in range(max_attempts):
        driver = None
        try:
            print(f"\n🔄 Attempt {attempt + 1}/{max_attempts}")
            
            driver = webdriver.Chrome(options=options)
            driver.get(url)
            time.sleep(2)
            
            # Get CAPTCHA
            print("📸 Capturing CAPTCHA...")
            masked_image_path = refresh_and_capture_captcha(driver)
            if not masked_image_path:
                print("❌ Failed to capture CAPTCHA")
                continue
            
            # OCR CAPTCHA
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
                print(f"❌ Invalid CAPTCHA: '{captcha_text}'")
                continue
            
            print(f"✅ CAPTCHA Solved: {captcha_text}")
            
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
                    print(f"⚠️  Invalid USN")
                    return False
                elif "captcha" in alert_text.lower():
                    print(f"❌ Wrong CAPTCHA, retrying...")
                    continue
                else:
                    print(f"⚠️  Alert: {alert_text}")
                    continue
            except NoAlertPresentException:
                pass
            
            # Parse with BeautifulSoup
            soup = BeautifulSoup(driver.page_source, "html.parser")
            
            # Get student info
            try:
                student_name = soup.find_all("td")[3].text.lstrip(" : ").strip()
                student_usn = soup.find_all("td")[1].text.lstrip(" : ").strip()
                print(f"\n{'='*80}")
                print(f"✅ SUCCESSFULLY SCRAPED")
                print(f"{'='*80}")
                print(f"Student Name: {student_name}")
                print(f"Student USN:  {student_usn}")
            except (IndexError, AttributeError) as e:
                print(f"❌ Failed to extract student info")
                continue
            
            # Extract semester
            try:
                semester_element = driver.find_element(
                    By.XPATH, 
                    '//*[@id="dataPrint"]/div[1]/div/div[2]/div[2]/div[1]/div/div/div[2]/div/div/div[1]/b'
                )
                text = semester_element.text.strip()
                numeric_part = ''.join(char for char in text if char.isdigit())
                page_semester = int(numeric_part) if numeric_part else 0
                print(f"Page Semester: {page_semester}")
            except Exception:
                page_semester = 0
                print(f"Page Semester: Unable to detect")
            
            # Extract ALL result tables (VTU shows multiple tables for different semesters)
            try:
                all_tables = soup.find_all("div", attrs={"class": "divTable"})
                print(f"\n📋 Found {len(all_tables)} result table(s)")
                
                all_rows = []
                for table_idx, table in enumerate(all_tables):
                    table_rows = table.find_all("div", attrs={"class": "divTableRow"})[1:]  # Skip header
                    all_rows.extend(table_rows)
                    print(f"   Table {table_idx + 1}: {len(table_rows)} subjects")
                
                rows = all_rows
            except (IndexError, AttributeError):
                print("❌ Failed to extract results table")
                continue
            
            if not rows:
                print("❌ No results found")
                return False
            
            print(f"\n{'='*80}")
            print(f"📊 RESULTS (What would be inserted into database)")
            print(f"{'='*80}\n")
            
            # Display table header
            print(f"{'Subject Code':<15} {'Sem':<5} {'Internal':<12} {'External':<12} {'Total':<8} {'Status':<8} {'Attempt':<8}")
            print(f"{'-'*90}")
            
            # Process each subject
            for idx, row in enumerate(rows, 1):
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
                
                # Parse marks using the new logic
                internal_marks = parse_marks(internal_text)
                external_marks = parse_marks(external_text)
                total_marks = parse_marks(total_text) if total_text != '-' else internal_marks + external_marks
                
                # Simulated attempt number (would check DB in real scenario)
                attempt_number = 1
                
                # Check for indicators of retake
                if "NE" in internal_text or "NE" in external_text or "ABS" in internal_text or "ABS" in external_text:
                    print(f"{subject_code:<15} {detected_semester:<5} {internal_text:<12} {external_text:<12} {total_marks:<8} {result_status:<8} {attempt_number:<8} ⚠️ RETAKE/ISSUE")
                else:
                    print(f"{subject_code:<15} {detected_semester:<5} {internal_marks:<12} {external_marks:<12} {total_marks:<8} {result_status:<8} {attempt_number:<8}")
            
            print(f"\n{'='*80}")
            print(f"✅ TEST COMPLETED SUCCESSFULLY")
            print(f"{'='*80}")
            print(f"\n📋 DATABASE INSERT STATEMENTS (Would be executed):")
            print(f"{'-'*80}")
            
            for idx, row in enumerate(rows, 1):
                cells = row.find_all("div", attrs={"class": "divTableCell"})
                
                if len(cells) < 6:
                    continue
                
                subject_code = cells[0].text.strip()
                internal_text = cells[2].text.strip()
                external_text = cells[3].text.strip()
                total_text = cells[4].text.strip()
                result_status = cells[5].text.strip()
                
                # Extract semester from subject code
                detected_semester = extract_semester_from_subject_code(subject_code)
                
                internal_marks = parse_marks(internal_text)
                external_marks = parse_marks(external_text)
                total_marks = parse_marks(total_text) if total_text != '-' else internal_marks + external_marks
                
                print(f"""
INSERT INTO results 
(student_usn, subject_code, semester, internal_marks, external_marks, total_marks, result_status, attempt_number, scraped_at)
VALUES ('{student_usn}', '{subject_code}', {detected_semester}, {internal_marks}, {external_marks}, {total_marks}, '{result_status}', 1, NOW());
-- Note: Semester {detected_semester} extracted from subject code '{subject_code}'
""")
            
            print(f"{'='*80}\n")
            
            return True
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
            continue
        
        finally:
            if driver:
                driver.quit()
            # Cleanup temp files
            try:
                os.remove("test_captcha.png")
                os.remove("test_masked_captcha.png")
            except:
                pass
    
    print(f"\n❌ Failed after {max_attempts} attempts")
    return False

# ==================== MAIN ====================

if __name__ == "__main__":
    USN = "1BI23IS127"
    URL = "https://results.vtu.ac.in/JJEcbcs25/index.php"
    
    test_scrape_vtu_results(USN, URL)
