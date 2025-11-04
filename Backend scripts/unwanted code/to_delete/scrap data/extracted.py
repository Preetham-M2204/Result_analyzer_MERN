"""
Extracted VTU Results Scraping Logic
This module contains the core web scraping logic for fetching VTU student results.
Uses Selenium + Tesseract OCR for CAPTCHA solving.
"""

import cv2
import numpy as np
import pytesseract
import time
from PIL import Image
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.common.exceptions import (
    UnexpectedAlertPresentException, 
    NoSuchElementException, 
    TimeoutException, 
    NoAlertPresentException
)
from bs4 import BeautifulSoup


# ============================================================================
# CAPTCHA PROCESSING FUNCTIONS
# ============================================================================

def mask_captcha(image_path):
    """
    Processes the CAPTCHA image by applying masking for improved text extraction.
    
    Args:
        image_path: Path to the CAPTCHA image file
        
    Returns:
        Path to the processed/masked CAPTCHA image
    """
    try:
        # Load the image
        image = cv2.imread(image_path)

        # Convert the image to HSV color space
        hsv_image = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

        # Define the color range for masking (specific to VTU CAPTCHA)
        lower = np.array([-10, -10, 62])
        upper = np.array([10, 10, 142])

        # Apply the mask
        mask = cv2.inRange(hsv_image, lower, upper)

        # Use bitwise AND to isolate the masked region
        masked_image = cv2.bitwise_and(image, image, mask=mask)

        # Save the processed image
        processed_image_path = "masked_captcha.png"
        cv2.imwrite(processed_image_path, masked_image)
        return processed_image_path
    except Exception as e:
        print(f"Error processing CAPTCHA: {e}")
        return None


def capture_and_process_captcha(driver):
    """
    Captures the CAPTCHA image from the webpage and processes it with masking.
    
    Args:
        driver: Selenium WebDriver instance
        
    Returns:
        Path to the processed CAPTCHA image ready for OCR
    """
    try:
        # Find the CAPTCHA image element by XPATH
        captcha_element = driver.find_element(By.XPATH, '//*[@id="raj"]/div[2]/div[2]/img')
        captcha_image_path = "captcha.png"
        
        # Take a screenshot of just the CAPTCHA element
        captcha_element.screenshot(captcha_image_path)
        
        # Process the CAPTCHA image with masking
        return mask_captcha(captcha_image_path)
    except Exception as e:
        print(f"Error capturing and processing CAPTCHA: {e}")
        return None


# ============================================================================
# VTU RESULTS SCRAPING FUNCTION
# ============================================================================

def scrape_vtu_results(usn, url, tesseract_path=r'C:\Program Files\Tesseract-OCR\tesseract.exe'):
    """
    Core function to scrape VTU results for a given USN.
    
    Args:
        usn: University Seat Number (e.g., "1BI22IS001")
        url: VTU results website URL
        tesseract_path: Path to tesseract.exe (optional)
        
    Returns:
        Dictionary containing:
        - student_info: {usn, name, semester}
        - subjects: List of subject results
        - success: Boolean indicating if scraping was successful
    """
    
    # Set Tesseract path
    pytesseract.pytesseract.tesseract_cmd = tesseract_path
    
    # Chrome options for Selenium
    options = webdriver.ChromeOptions()
    options.add_argument("--window-size=1920,1080")
    # Uncomment below for headless mode
    # options.add_argument("--headless")
    
    max_retries = 5
    retry_count = 0
    
    while retry_count < max_retries:
        driver = webdriver.Chrome(options=options)
        
        try:
            print(f"\n{'='*60}")
            print(f"Scraping results for USN: {usn}")
            print(f"{'='*60}")
            
            # Navigate to the VTU results page
            driver.get(url)
            time.sleep(2)
            
            # Capture and process CAPTCHA
            masked_image_path = capture_and_process_captcha(driver)
            if not masked_image_path:
                raise Exception("Failed to capture CAPTCHA.")

            # Extract CAPTCHA text using OCR
            captcha_text = pytesseract.image_to_string(Image.open(masked_image_path)).strip()
            print(f"Extracted CAPTCHA: {captcha_text}")
            
            # Validate CAPTCHA (VTU CAPTCHAs are typically 6 characters)
            if not captcha_text or len(captcha_text) < 6:
                print("Invalid CAPTCHA length. Retrying...")
                retry_count += 1
                driver.quit()
                continue

            # Fill in the form with USN and CAPTCHA
            usn_input_field = driver.find_element(By.NAME, "lns")
            captcha_input_field = driver.find_element(By.NAME, "captchacode")
            
            usn_input_field.clear()
            usn_input_field.send_keys(usn)
            
            captcha_input_field.clear()
            captcha_input_field.send_keys(captcha_text)
            
            # Submit the form
            driver.find_element(By.ID, "submit").click()
            time.sleep(3)

            # Check for alerts (invalid USN, wrong CAPTCHA, etc.)
            try:
                alert = driver.switch_to.alert
                alert_text = alert.text.strip()
                print(f"Alert detected: {alert_text}")
                alert.accept()
                
                if "University Seat Number is not available or Invalid" in alert_text:
                    print(f"❌ USN {usn} is invalid or not available.")
                    return {
                        'success': False,
                        'error': 'Invalid USN',
                        'usn': usn
                    }
                else:
                    print("Wrong CAPTCHA or other alert. Retrying...")
                    retry_count += 1
                    driver.quit()
                    continue
                    
            except NoAlertPresentException:
                print("✓ No alert present, proceeding with data extraction...")

            # Extract semester from the results page
            try:
                semester_element = driver.find_element(
                    By.XPATH, 
                    '//*[@id="dataPrint"]/div[1]/div/div[2]/div[2]/div[1]/div/div/div[2]/div/div/div[1]/b'
                )
                semester_text = semester_element.text.strip()
                semester = ''.join(char for char in semester_text if char.isdigit())
                print(f"✓ Semester: {semester}")
            except:
                semester = "Unknown"
                print("⚠ Could not extract semester")

            # Parse the results page with BeautifulSoup
            soup = BeautifulSoup(driver.page_source, "html.parser")
            
            # Extract student information
            try:
                all_tds = soup.find_all("td")
                student_name = all_tds[3].text.lstrip(" : ").strip()
                student_usn = all_tds[1].text.lstrip(" : ").strip()
                
                print(f"✓ Student Name: {student_name}")
                print(f"✓ USN: {student_usn}")
            except Exception as e:
                print(f"❌ Error extracting student info: {e}")
                retry_count += 1
                driver.quit()
                continue

            # Extract subject marks from the results table
            try:
                table = soup.find_all("div", attrs={"class": "divTable"})[0]
                rows = table.find_all("div", attrs={"class": "divTableRow"})[1:]  # Skip header
                
                subjects = []
                
                for row in rows:
                    cells = row.find_all("div", attrs={"class": "divTableCell"})
                    
                    if len(cells) >= 6:
                        subject_data = {
                            "subcode": cells[0].text.strip(),
                            "subname": cells[1].text.strip(),
                            "IA": cells[2].text.strip(),      # Internal Assessment
                            "EA": cells[3].text.strip(),      # External Assessment
                            "total": cells[4].text.strip(),
                            "result": cells[5].text.strip()   # P/F
                        }
                        subjects.append(subject_data)
                
                print(f"✓ Extracted {len(subjects)} subjects")
                
                # Return the scraped data
                return {
                    'success': True,
                    'student_info': {
                        'usn': student_usn,
                        'name': student_name,
                        'semester': semester
                    },
                    'subjects': subjects
                }
                
            except Exception as e:
                print(f"❌ Error extracting marks table: {e}")
                retry_count += 1
                driver.quit()
                continue

        except UnexpectedAlertPresentException as e:
            print(f"⚠ Unexpected Alert: {e}. Retrying...")
            retry_count += 1

        except NoSuchElementException as e:
            print(f"❌ Element not found: {e}. Retrying...")
            retry_count += 1

        except TimeoutException:
            print("❌ Page load timeout. Retrying...")
            retry_count += 1

        except Exception as e:
            print(f"❌ Unexpected error: {e}. Retrying...")
            retry_count += 1

        finally:
            driver.quit()
    
    # If all retries failed
    return {
        'success': False,
        'error': 'Max retries exceeded',
        'usn': usn
    }


# ============================================================================
# HELPER FUNCTION - Determine Semester from Subject Code
# ============================================================================

def determine_semester_from_subcode(subcode):
    """
    Determine the semester based on the 4th character of the subject code.
    VTU subject codes format: XXYYZZ (4th char indicates semester)
    
    Args:
        subcode: Subject code (e.g., "18CS31")
        
    Returns:
        Semester number as string
    """
    if len(subcode) < 4:
        return "Unknown"

    sem_indicator = subcode[3]
    
    semester_mapping = {
        "1": "1", "2": "2", "3": "3", "4": "4",
        "5": "5", "6": "6", "7": "7", "8": "8"
    }
    
    return semester_mapping.get(sem_indicator, "Unknown")


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

if __name__ == "__main__":
    # Example: Scrape results for a single USN
    
    TEST_USN = "1BI22IS001"
    VTU_RESULTS_URL = "https://results.vtu.ac.in/..."  # Replace with actual URL
    
    # Call the scraping function
    result = scrape_vtu_results(TEST_USN, VTU_RESULTS_URL)
    
    if result['success']:
        print("\n" + "="*60)
        print("SCRAPING SUCCESSFUL!")
        print("="*60)
        print(f"\nStudent: {result['student_info']['name']}")
        print(f"USN: {result['student_info']['usn']}")
        print(f"Semester: {result['student_info']['semester']}")
        print(f"\nSubjects ({len(result['subjects'])}):")
        print("-"*60)
        
        for subject in result['subjects']:
            print(f"  {subject['subcode']}: {subject['subname']}")
            print(f"    IA: {subject['IA']}, EA: {subject['EA']}, Total: {subject['total']}, Result: {subject['result']}")
    else:
        print("\n" + "="*60)
        print("SCRAPING FAILED!")
        print("="*60)
        print(f"Error: {result.get('error', 'Unknown error')}")
