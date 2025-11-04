# 🔧 Additional Setup Required

## ⚠️ IMPORTANT: Install Tesseract OCR

The VTU scraper uses Tesseract OCR to read CAPTCHA images. You **MUST** install Tesseract separately.

### Windows Installation:

1. **Download Tesseract:**
   - Go to: https://github.com/UB-Mannheim/tesseract/wiki
   - Or direct link: https://digi.bib.uni-mannheim.de/tesseract/tesseract-ocr-w64-setup-5.3.3.20231005.exe

2. **Install Tesseract:**
   - Run the downloaded `.exe` file
   - **IMPORTANT:** Note the installation path (usually `C:\Program Files\Tesseract-OCR`)
   - Make sure to check "Add to PATH" during installation

3. **Update Tesseract Path in Scraper:**
   - Open: `Preetham version\utils\scrape_vtu_results.py`
   - Find line 28:
     ```python
     pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
     ```
   - Update the path if you installed Tesseract in a different location

### Verify Installation:

```powershell
tesseract --version
```

Should output something like:
```
tesseract 5.3.3
```

---

## 🐍 Python Packages Status

### ✅ Already Installed:
- mysql-connector-python
- pandas
- openpyxl
- requests
- beautifulsoup4
- lxml
- selenium
- opencv-python
- pytesseract
- Pillow
- numpy

---

## 🚀 Ready to Run!

Once Tesseract is installed:

```powershell
cd "d:\preetham\scrapper\Preetham version\utils"

# Test database connection
python db_config.py

# Insert students
python insert_students.py

# Create subjects Excel
python create_subjects_excel.py

# Insert subjects
python insert_subjects.py

# Test scraper (AFTER installing Tesseract!)
python scrape_vtu_results.py
```

---

## 📝 Notes:

1. **Tesseract is REQUIRED** - the scraper will NOT work without it
2. The scraper uses **Selenium** (opens Chrome browser) to handle JavaScript and CAPTCHAs
3. Make sure you have **Google Chrome** installed (Selenium uses Chrome by default)
4. The scraper has been adapted from your **original working MongoDB version**
5. All the same scraping logic is preserved, just writes to MySQL instead

---

**Last Updated:** October 24, 2025
