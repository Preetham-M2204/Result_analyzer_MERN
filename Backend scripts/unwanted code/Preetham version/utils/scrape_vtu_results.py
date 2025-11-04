"""
VTU Results Scraper (MySQL Version)
Based on original working MongoDB scraper - adapted for MySQL
Uses Selenium + BeautifulSoup + Tesseract OCR for CAPTCHA
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

# ==================== CONFIGURATION ====================
# Tesseract Path - UPDATE THIS TO YOUR TESSERACT INSTALLATION PATH
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

if not sys.warnoptions:
    warnings.simplefilter("ignore")

# ==================== CAPTCHA PROCESSING ====================

def mask_captcha(image_path):
    """
    Processes the CAPTCHA image by applying masking for improved text extraction.
    """
    try:
        image = cv2.imread(image_path)
        hsv_image = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

        # Define the color range for masking
        lower = np.array([-10, -10, 62])
        upper = np.array([10, 10, 142])

        mask = cv2.inRange(hsv_image, lower, upper)
        masked_image = cv2.bitwise_and(image, image, mask=mask)

        processed_image_path = "masked_captcha.png"
        cv2.imwrite(processed_image_path, masked_image)
        return processed_image_path
    except Exception as e:
        print(f"❌ Error processing CAPTCHA: {e}")
        return None

def capture_and_process_captcha(driver):
    """
    Captures the CAPTCHA image and processes it with masking.
    """
    try:
        captcha_element = driver.find_element(By.XPATH, '//*[@id="raj"]/div[2]/div[2]/img')
        captcha_image_path = "captcha.png"
        captcha_element.screenshot(captcha_image_path)
        return mask_captcha(captcha_image_path)
    except Exception as e:
        print(f"❌ Error capturing CAPTCHA: {e}")
        return None

def refresh_and_capture_captcha(driver, url: str = None):
    """
    Refreshes the CAPTCHA by clicking the refresh button, then captures and processes it.
    """
    try:
        refresh_button = driver.find_element(By.XPATH, '//*[@id="raj"]/div[2]/div[2]/p/a')
        refresh_button.click()
        time.sleep(1.5)
        return capture_and_process_captcha(driver)
    except Exception as e:
        print(f"❌ Error refreshing CAPTCHA: {e}")
        return capture_and_process_captcha(driver)

# ==================== HELPER FUNCTIONS ====================

def determine_semester(subcode):
    """
    Determine the semester based on the 4th character of the subject code.
    """
    if len(subcode) < 4:
        return 0
    
    sem_indicator = subcode[3]
    semester_mapping = {
        "1": 1, "2": 2, "3": 3, "4": 4,
        "5": 5, "6": 6, "7": 7, "8": 8
    }
    return semester_mapping.get(sem_indicator, 0)

# ==================== MAIN SCRAPING FUNCTION ====================

def get_vtu_results(usn, url, target_semester):
    """
    Automates fetching VTU results and stores them in MySQL database.
    Based on the original working MongoDB scraper logic.
    """
    options = webdriver.ChromeOptions()
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-blink-features=AutomationControlled")
    # options.add_argument("--headless")  # Uncomment to run in background
    
    max_attempts = 5  # Maximum retry attempts for CAPTCHA
    
    for attempt in range(max_attempts):
        driver = None
        try:
            driver = webdriver.Chrome(options=options)
            driver.get(url)
            time.sleep(2)  # Wait for page to load
            
            # Refresh CAPTCHA and capture it
            print(f"🔄 Attempt {attempt + 1}/{max_attempts}: Refreshing CAPTCHA...")
            masked_image_path = refresh_and_capture_captcha(driver, url)
            if not masked_image_path:
                print(f"⚠️  Failed to process CAPTCHA image")
                continue
            
            # Use stricter OCR config and try multiple times per attempt
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
            # Remove spaces and special characters
            print(f"🔍 Extracted CAPTCHA: '{captcha_text}'")
            
            if not captcha_text or len(captcha_text) < 6:
                print(f"⚠️  CAPTCHA too short ({len(captcha_text)} chars), retrying...")
                continue
            
            # Fill in the form
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
                print(f"⚠️  Alert detected: {alert_text}")
                alert.accept()
                
                if "University Seat Number is not available or Invalid" in alert_text:
                    print(f"⚠️  USN {usn}: Invalid USN. Skipping.")
                    return False
                elif "captcha" in alert_text.lower():
                    print(f"⚠️  Invalid CAPTCHA, retrying...")
                    continue
                else:
                    print(f"⚠️  Unexpected alert, retrying...")
                    continue
            except NoAlertPresentException:
                print("✅ No alert, proceeding to extract results...")
            
            # Verify we're on results page
            try:
                # Extract semester
                semester_element = driver.find_element(
                    By.XPATH, 
                    '//*[@id="dataPrint"]/div[1]/div/div[2]/div[2]/div[1]/div/div/div[2]/div/div/div[1]/b'
                )
                text = semester_element.text.strip()
                numeric_part = ''.join(char for char in text if char.isdigit())
                detected_semester = int(numeric_part) if numeric_part else target_semester
                
                print(f"📊 Detected Semester: {detected_semester}")
            except NoSuchElementException:
                print(f"⚠️  Results page not loaded properly, retrying...")
                continue
            
            # Parse with BeautifulSoup
            soup = BeautifulSoup(driver.page_source, "html.parser")
            
            try:
                student_name = soup.find_all("td")[3].text.lstrip(" : ")
                student_usn = soup.find_all("td")[1].text.lstrip(" : ")
            except (IndexError, AttributeError):
                print(f"⚠️  Could not extract student details, retrying...")
                continue
            
            print(f"👤 Student: {student_name} ({student_usn})")
            
            # Extract result table
            try:
                table = soup.find_all("div", attrs={"class": "divTable"})[0]
                rows = table.find_all("div", attrs={"class": "divTableRow"})[1:]
            except (IndexError, AttributeError):
                print(f"⚠️  Could not find results table, retrying...")
                continue
            
            if not rows:
                print(f"⚠️  No results found for {usn}")
                return False
            
            # Insert into database
            connection = get_db_connection()
            if not connection:
                return False
            
            cursor = connection.cursor()
            
            # Insert results for each subject
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
                
                # Convert marks to integers (handle '-', 'AB', etc.)
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
                
                # Insert into results table
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
                    1,  # attempt_number
                    datetime.now()
                )
                
                try:
                    cursor.execute(insert_query, data)
                    print(f"  ✅ {subject_code}: {total_marks} ({result_status})")
                except Exception as e:
                    print(f"  ❌ Error inserting {subject_code}: {e}")
            
            connection.commit()
            cursor.close()
            close_connection(connection)
            
            print(f"✅ Successfully scraped {usn}")
            return True
            
        except UnexpectedAlertPresentException as e:
            print(f"⚠️  Unexpected Alert: {e}. Retrying...")
            continue
            
        except NoSuchElementException as e:
            print(f"⚠️  Element not found: {e}. Retrying...")
            continue
            
        except TimeoutException:
            print(f"⏱️  Timeout. Retrying...")
            continue
            
        except Exception as e:
            print(f"❌ Error: {e}. Retrying...")
            continue
        
        finally:
            if driver:
                driver.quit()
    
    # If all attempts failed
    print(f"❌ Failed to scrape {usn} after {max_attempts} attempts")
    return False

# ==================== BATCH SCRAPING ====================

def scrape_all_students(url, semester):
    """
    Scrape results for all students in the database.
    """
    try:
        connection = get_db_connection()
        if not connection:
            return
        
        cursor = connection.cursor()
        cursor.execute("SELECT usn, name FROM student_details ORDER BY usn")
        students = cursor.fetchall()
        
        total_students = len(students)
        print(f"\n📊 Found {total_students} students to scrape")
        print("="*60)
        
        cursor.close()
        close_connection(connection)
        
        success_count = 0
        error_count = 0
        
        for idx, (usn, name) in enumerate(students, 1):
            print(f"\n[{idx}/{total_students}] 🔍 Scraping: {usn} - {name}")
            
            if get_vtu_results(usn, url, semester):
                success_count += 1
            else:
                error_count += 1
            
            # Rate limiting
            time.sleep(3)
        
        print("\n" + "="*60)
        print(f"✅ Successfully scraped: {success_count} students")
        print(f"❌ Errors/Not Found: {error_count}")
        print("="*60)
        
    except Exception as e:
        print(f"❌ Error in scrape_all_students: {e}")

def scrape_single_usn(usn, url, semester):
    """
    Scrape results for a single USN (for testing).
    """
    print(f"🔍 Testing scraper with USN: {usn}")
    print("="*60)
    
    success = get_vtu_results(usn, url, semester)
    
    if success:
        print("\n✅ Scraping successful!")
    else:
        print("\n❌ Scraping failed or no results found")

# ==================== MAIN ====================

if __name__ == "__main__":
    print("="*60)
    print("🚀 VTU RESULTS SCRAPER - SELENIUM VERSION")
    print("="*60)
    print()
    print("Options:")
    print("1. Scrape all students from database")
    print("2. Test with single USN")
    print()
    
    choice = input("Enter choice (1/2): ").strip()
    
    if choice == '1':
        semester = int(input("Enter semester (3/4): ").strip())
        url = input("Enter VTU results URL: ").strip()
        
        print("\n⚠️  WARNING: This will scrape results for ALL students!")
        confirm = input("Continue? (yes/no): ").strip().lower()
        
        if confirm == 'yes' or confirm == 'y':
            scrape_all_students(url, semester)
        else:
            print("❌ Cancelled")
    
    elif choice == '2':
        test_usn = input("\nEnter USN to test: ").strip().upper()
        semester = int(input("Enter semester (3/4): ").strip())
        url = input("Enter VTU results URL: ").strip()
        
        scrape_single_usn(test_usn, url, semester)
    
    else:
        print("❌ Invalid choice")
        sys.exit(1)