# Files Moved to `to_delete` Folder

This folder contains obsolete code, old implementations, and temporary files that are no longer needed for the current VTU Results Scraper system.

## 📦 Contents

### From Root Directory
- **`oldcode/`** - Entire old implementation with mini-project-main
  - Contains: achyuthVersion.py, clean.py, resultsextraction.py, old Flask app, Sem 3/4 analysis scripts
- **`scrap data/`** - Old scraping experiments
- **`scrapper.py`** - Old root-level scraper (replaced by Preetham version)
- **`requirements.py`** - Duplicate/old requirements file

### From `Preetham version/utils/`
- **`old_utils/`** - Deprecated utility scripts
  - `create_subjects_excel.py` - Old Excel generation
  - `export_results_excel.py` - Old export logic
  - `import_sem3_excel_to_db.py` - Excel import (now using direct scraping)
  - `insert_sem4_subjects.py` - One-time setup script
  - `insert_students.py` - One-time setup script
  - `insert_subjects.py` - One-time setup script
  - `run_setup.py` - Old setup runner
  - `README.md` - Old readme
  - `SETUP_TESSERACT.md` - Old Tesseract docs
  - `semester_3_analysis.xlsx` - Old analysis file
  - `rescrape_missing_sem4.py` - Failed rescrape attempt
  - `captcha.png`, `masked_captcha.png` - Temporary CAPTCHA images

### From `Preetham version/`
- **`2023_details.xlsx`** - Old student data
- **`semester_3_subjects.xlsx`** - Old subject data

### Temporary Files
- **`missing_sem4_usns.txt`** - Output from find_missing_sem4.py (can be regenerated)
- **`__pycache__/`** - Python bytecode cache

## ⚠️ Safe to Delete

**You can safely delete this entire `to_delete` folder** once you've verified:
1. ✅ Current scraper works (`scrape_vtu_results.py`)
2. ✅ SGPA computation works (`compute_sgpa.py`)
3. ✅ Database has all required data
4. ✅ No references to old code remain

## 🔄 What Replaced What

| Old Code | New Code |
|----------|----------|
| `oldcode/mini-project-main/` | `Preetham version/utils/scrape_vtu_results.py` |
| Excel import scripts | Direct scraping to MySQL |
| Multiple setup scripts | Database schema + direct operations |
| Flask app (old) | (Future: New web interface if needed) |
| CSV analysis scripts | Database queries + compute_sgpa.py |

## 📅 Moved On
**October 25, 2025** - Cleanup after successful SGPA implementation and database migration
