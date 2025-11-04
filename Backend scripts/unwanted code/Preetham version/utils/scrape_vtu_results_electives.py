"""
Updated scrape_vtu_results.py with elective subject support
This version integrates with elective_subjects_mapper.py
"""

import os
import sys
from scrape_vtu_results import *  # Import everything from original
from elective_subjects_mapper import map_actual_to_placeholder, store_elective_choice

def get_vtu_results_with_electives(usn, url, semester, max_attempts=3):
    """
    Enhanced version that handles elective subjects using mapping
    
    Logic:
    1. Scrape VTU results as usual
    2. For each subject code, check if it's an elective using map_actual_to_placeholder()
    3. If elective:
       - Store actual code/name (what student chose)
       - Mark is_elective = TRUE
       - Map to placeholder for reference
    4. If not elective:
       - Store normally
    """
    for attempt in range(1, max_attempts + 1):
        driver = None
        try:
            # Setup WebDriver
            options = webdriver.ChromeOptions()
            options.add_argument("--headless")
            options.add_argument("--disable-gpu")
            options.add_argument("--no-sandbox")
            options.add_argument("--disable-dev-shm-usage")
            options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            
            driver = webdriver.Chrome(options=options)
            driver.get(url)
            time.sleep(2)
            
            # Input USN
            driver.find_element(By.NAME, "lns").send_keys(usn)
            
            # Process CAPTCHA
            captcha_path = capture_and_process_captcha(driver)
            if not captcha_path:
                print(f"⚠️  CAPTCHA capture failed on attempt {attempt}")
                continue
            
            # Extract text from masked CAPTCHA
            image = Image.open(captcha_path)
            captcha_text = pytesseract.image_to_string(image, config='--psm 7').strip()
            
            if len(captcha_text) < 3:
                print(f"⚠️  Invalid CAPTCHA (too short). Refreshing...")
                captcha_path = refresh_and_capture_captcha(driver, url)
                if not captcha_path:
                    continue
                image = Image.open(captcha_path)
                captcha_text = pytesseract.image_to_string(image, config='--psm 7').strip()
            
            print(f"🔑 CAPTCHA: {captcha_text}")
            
            # Input CAPTCHA and submit
            driver.find_element(By.NAME, "captchacode").send_keys(captcha_text)
            driver.find_element(By.ID, "submit").click()
            time.sleep(3)
            
            # Check for alerts (invalid CAPTCHA)
            try:
                alert = driver.switch_to.alert
                alert_text = alert.text
                print(f"⚠️  Alert: {alert_text}")
                alert.accept()
                continue
            except NoAlertPresentException:
                pass
            
            # Parse results page
            soup = BeautifulSoup(driver.page_source, "html.parser")
            
            # Extract student details
            try:
                student_name = soup.find_all("td")[0].text.lstrip(" : ")
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
            
            # Get database connection
            connection = get_db_connection()
            if not connection:
                return False
            
            cursor = connection.cursor()
            
            # Process each subject
            for row in rows:
                cells = row.find_all("div", attrs={"class": "divTableCell"})
                
                if len(cells) < 6:
                    continue
                
                actual_subject_code = cells[0].text.strip()
                actual_subject_name = cells[1].text.strip()
                internal_marks = cells[2].text.strip()
                external_marks = cells[3].text.strip()
                total_marks = cells[4].text.strip()
                result_status = cells[5].text.strip()
                
                # Determine semester from subject code
                detected_semester = determine_semester(actual_subject_code)
                
                # Convert marks
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
                
                # ==================== ELECTIVE MAPPING ====================
                # Check if this subject is an elective
                placeholder_code, elective_type, credits = map_actual_to_placeholder(actual_subject_code)
                
                if placeholder_code:
                    # This is an ELECTIVE
                    print(f"  🎓 ELECTIVE: {actual_subject_code} ({actual_subject_name}) → {placeholder_code}")
                    
                    # Store the ACTUAL subject choice (not placeholder)
                    # Also store in elective_subjects table for future reference
                    cursor.execute("""
                        INSERT INTO elective_subjects 
                        (subject_code, subject_name, semester, credits, placeholder_code, scheme)
                        VALUES (%s, %s, %s, %s, %s, '21')
                        ON DUPLICATE KEY UPDATE 
                            subject_name = VALUES(subject_name),
                            placeholder_code = VALUES(placeholder_code)
                    """, (actual_subject_code, actual_subject_name, detected_semester, credits, placeholder_code))
                    
                    # Store result with actual code (what student chose)
                    insert_query = """
                    INSERT INTO results 
                    (student_usn, subject_code, semester, internal_marks, external_marks, 
                     total_marks, result_status, attempt_number, is_elective, scraped_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE, NOW())
                    ON DUPLICATE KEY UPDATE
                        internal_marks = VALUES(internal_marks),
                        external_marks = VALUES(external_marks),
                        total_marks = VALUES(total_marks),
                        result_status = VALUES(result_status),
                        scraped_at = VALUES(scraped_at)
                    """
                    
                    cursor.execute(insert_query, (
                        student_usn, actual_subject_code, detected_semester,
                        internal_marks, external_marks, total_marks,
                        result_status, 1
                    ))
                    
                    print(f"    ✅ Stored as elective: {actual_subject_code} → {placeholder_code}")
                
                else:
                    # NOT an elective - store normally
                    insert_query = """
                    INSERT INTO results 
                    (student_usn, subject_code, semester, internal_marks, external_marks, 
                     total_marks, result_status, attempt_number, is_elective, scraped_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, FALSE, NOW())
                    ON DUPLICATE KEY UPDATE
                        internal_marks = VALUES(internal_marks),
                        external_marks = VALUES(external_marks),
                        total_marks = VALUES(total_marks),
                        result_status = VALUES(result_status),
                        scraped_at = VALUES(scraped_at)
                    """
                    
                    cursor.execute(insert_query, (
                        student_usn, actual_subject_code, detected_semester,
                        internal_marks, external_marks, total_marks,
                        result_status, 1
                    ))
                    
                    print(f"  ✅ {actual_subject_code}: {total_marks} ({result_status})")
            
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
            import traceback
            traceback.print_exc()
            continue
        
        finally:
            if driver:
                driver.quit()
    
    # If all attempts failed
    print(f"❌ Failed to scrape {usn} after {max_attempts} attempts")
    return False


if __name__ == "__main__":
    # Example usage
    url = "https://results.vtu.ac.in/resultpage.php"
    test_usn = "1BI21CS127"  # 21-scheme student
    semester = 4
    
    print("="*60)
    print("VTU Results Scraper with Elective Support")
    print("="*60)
    print(f"Testing with: {test_usn}")
    print(f"URL: {url}")
    print("="*60 + "\n")
    
    success = get_vtu_results_with_electives(test_usn, url, semester)
    
    if success:
        print("\n✅ Test scraping completed successfully!")
    else:
        print("\n❌ Test scraping failed!")
