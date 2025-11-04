# Python Scraper Scripts

This folder contains the Python scraper scripts used by the backend Node.js server.

## Files

### Core Scrapers
- **`ultimate_scraper.py`** - VTU official results scraper
  - Multi-threaded scraping with configurable workers
  - CAPTCHA solving with Tesseract OCR
  - Elective subject mapping
  - Smart retry logic (keeps trying until failed count constant)
  - Auto-detects semester from subject codes
  
- **`AUTONOMOUS_scrapper.py`** - Autonomous college results scraper
  - Selenium-based browser automation
  - Requires USN + DOB from database
  - JavaScript form manipulation
  - Supports multiple DOB formats

### Configuration
- **`db_config.py`** - MySQL database connection configuration
  - Modify this file to set your MySQL credentials
  - Used by both scraper scripts

### Utilities
- **`hashPassword.js`** - Node.js password hashing utility
- **`seedUsers.js`** - Database seeding script for initial users

## Python Requirements

Install required Python packages:

```bash
pip install -r requirements.txt
```

Required packages:
- `selenium` - Browser automation
- `beautifulsoup4` - HTML parsing
- `pytesseract` - CAPTCHA OCR
- `opencv-python` - Image processing
- `pillow` - Image manipulation
- `mysql-connector-python` - MySQL database
- `pandas` - Excel/CSV handling
- `webdriver-manager` - ChromeDriver management
- `numpy` - Numerical operations

## Tesseract OCR Setup

**VTU scraper requires Tesseract OCR:**

1. Download: https://github.com/UB-Mannheim/tesseract/wiki
2. Install to: `C:\Program Files\Tesseract-OCR\`
3. Verify installation:
   ```bash
   tesseract --version
   ```

If installed to different location, update `ultimate_scraper.py` line 46:
```python
pytesseract.pytesseract.tesseract_cmd = r'C:\Your\Path\To\tesseract.exe'
```

## MySQL Configuration

Edit `db_config.py` to set your MySQL credentials:

```python
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',          # Change this
    'password': 'your_password',  # Change this
    'database': 'vtu_results'
}
```

## Usage

### VTU Scraper (CLI Mode)

```bash
python ultimate_scraper.py --url "https://results.vtu.ac.in/..." --semester 4 --scheme 22 --workers 20 --usns "1BI23IS001,1BI23IS002"
```

**Arguments:**
- `--url` - VTU results URL (required)
- `--semester` - Semester number 1-8 (required)
- `--scheme` - Scheme 21/22 (required)
- `--workers` - Number of parallel threads (default 7)
- `--usns` - Comma-separated USN list (optional, fetches from DB if not provided)

### Autonomous Scraper (CLI Mode)

```bash
python AUTONOMOUS_scrapper.py --url "https://ioncudos.in/..." --workers 20 --students '[{"usn":"1BI23IS001","dob":"01/01/2005"}]'
```

**Arguments:**
- `--url` - Results URL (required)
- `--workers` - Number of parallel workers (default 1)
- `--students` - JSON array with USN + DOB (required)

### Interactive Mode

Both scripts also support interactive mode (no arguments):

```bash
python ultimate_scraper.py
# Will prompt for URL, semester, scheme, workers
```

## How Backend Uses These Scripts

The Node.js backend (via `scraperController.js`) spawns Python processes:

1. **User clicks "Start Scraper"** in frontend
2. **Backend validates** inputs and fetches students from MySQL
3. **Backend spawns Python** process with PythonShell:
   ```javascript
   const scriptPath = path.join(__dirname, '../../scripts/ultimate_scraper.py');
   ```
4. **Python script runs** and outputs progress (✅/❌ symbols)
5. **Backend parses stdout** to track progress
6. **Frontend polls** `/api/scraper/progress/:sessionId` for updates
7. **Results stored** in MySQL database

## Database Schema

Scripts expect these tables:

### student_details
```sql
CREATE TABLE student_details (
    student_usn VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100),
    batch VARCHAR(4),
    section VARCHAR(1),
    scheme VARCHAR(2),
    dob VARCHAR(20)  -- Required for Autonomous scraper
);
```

### subjects
```sql
CREATE TABLE subjects (
    subject_code VARCHAR(20) PRIMARY KEY,
    subject_name VARCHAR(200),
    semester INT,
    credits INT,
    scheme VARCHAR(2),
    is_placeholder BOOLEAN
);
```

### results
```sql
CREATE TABLE results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_usn VARCHAR(20),
    subject_code VARCHAR(20),
    semester INT,
    internal_marks INT,
    external_marks INT,
    total_marks INT,
    result_status VARCHAR(10),
    attempt_number INT DEFAULT 1,
    is_elective BOOLEAN DEFAULT 0,
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_result (student_usn, subject_code, semester)
);
```

## Troubleshooting

### Python not found
```
Error: python: command not found
```
**Solution:** Install Python 3.x and add to PATH, or update `pythonPath` in `scraperController.js`

### Tesseract not found
```
TesseractNotFoundError: tesseract is not installed
```
**Solution:** Install Tesseract OCR and update path in `ultimate_scraper.py`

### MySQL connection failed
```
Error: Access denied for user 'root'@'localhost'
```
**Solution:** Check credentials in `db_config.py`

### ChromeDriver issues (Autonomous scraper)
```
SessionNotCreatedException: Chrome version mismatch
```
**Solution:** The script uses `webdriver-manager` to auto-download ChromeDriver. Ensure Chrome browser is installed.

### DOB missing (Autonomous scraper)
```
Error: Students must have DOB in database
```
**Solution:** Add DOB column to student_details table and populate it

## Performance Tips

### VTU Scraper
- **Workers:** 10-30 recommended (too many may cause CAPTCHA failures)
- **Retry logic:** Automatically keeps trying until failed count constant
- **CAPTCHA:** Uses Tesseract OCR (may fail ~10-20% of time, hence retry logic)

### Autonomous Scraper
- **Workers:** Currently single-threaded (parameter unused)
- **Speed:** Slower than VTU (Selenium overhead)
- **Headless:** Runs in headless Chrome (no GUI)

## Development

To modify scrapers:

1. Edit Python scripts in this folder
2. Test standalone: `python ultimate_scraper.py`
3. Test via backend: Start backend server, use frontend UI
4. Check logs in terminal where backend is running

## Environment Setup Checklist

Before running scrapers, ensure:

- [ ] Python 3.x installed and in PATH
- [ ] All Python packages installed (`pip install -r requirements.txt`)
- [ ] Tesseract OCR installed (VTU scraper only)
- [ ] Chrome browser installed (Autonomous scraper only)
- [ ] MySQL database running and accessible
- [ ] `db_config.py` configured with correct credentials
- [ ] Database tables created (use `database_schema.sql`)
- [ ] Students imported into `student_details` table
- [ ] Node.js backend running (`npm start` in backend folder)

## Support

For issues:
1. Check terminal output for error messages
2. Verify database connectivity: `python -c "from db_config import get_db_connection; print(get_db_connection())"`
3. Test Tesseract: `tesseract --version`
4. Test Python: `python --version`
5. Check backend logs when scraper runs

---

**Last Updated:** November 2, 2025
