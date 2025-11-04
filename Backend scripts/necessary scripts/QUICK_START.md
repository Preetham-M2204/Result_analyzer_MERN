# 🚀 VTU Results Scraper - Quick Start

## ✅ What I've Created for You

### 📁 Files Created:
```
d:\preetham\scrapper\
├── database_schema.sql           # Database schema (run this first in MySQL)
├── SCHEMA_DOCUMENTATION.md       # Detailed schema documentation
├── requirements.txt              # Python dependencies
└── Preetham version\
    ├── 2023_details.xlsx         # Your student data (already exists)
    ├── semester_3_subjects.xlsx  # Will be generated
    └── utils\
        ├── __init__.py
        ├── db_config.py          # MySQL connection config
        ├── insert_students.py    # Insert students from Excel
        ├── create_subjects_excel.py  # Generate subjects Excel
        ├── insert_subjects.py    # Insert subjects into DB
        ├── scrape_vtu_results.py # Main scraper script
        ├── run_setup.py          # Master setup script
        └── README.md             # Detailed documentation
```

---

## 🎯 Step-by-Step Execution

### 1️⃣ Install Python Packages
```powershell
cd "d:\preetham\scrapper"
pip install mysql-connector-python pandas openpyxl requests beautifulsoup4 lxml
```

### 2️⃣ Create Database Tables (If Not Done)
```powershell
mysql -u root -p resana < database_schema.sql
# Password: 123456
```

### 3️⃣ Run Automated Setup
```powershell
cd "Preetham version\utils"
python run_setup.py
```

This will automatically:
- ✅ Test database connection
- ✅ Create semester_3_subjects.xlsx
- ✅ Insert all students (with cgpa=0.00)
- ✅ Insert all subjects

### 4️⃣ Test Scraper with One USN
```powershell
python scrape_vtu_results.py
# Choose option 2
# Enter a test USN (e.g., from your results image)
```

### 5️⃣ Scrape All Students
```powershell
python scrape_vtu_results.py
# Choose option 1
# Confirm 'yes'
```

---

## 📊 Semester 3 Subjects Included

| Code | Name | Credits |
|------|------|---------|
| BCS301 | MATHEMATICS FOR COMPUTER SCIENCE | 4 |
| BCS302 | DIGITAL DESIGN & COMPUTER ORGANIZATION | 4 |
| BCS303 | OPERATING SYSTEMS | 4 |
| BCS304 | DATA STRUCTURES AND APPLICATIONS | 3 |
| BCSL305 | DATA STRUCTURES LAB | 1 |
| BCS306A | OBJECT ORIENTED PROGRAMMING WITH JAVA | 3 |
| BCS306B | UNIX PROGRAMMING | 3 |
| BCS306C | SOFTWARE ENGINEERING | 3 |
| BSCK307 | SOCIAL CONNECT AND RESPONSIBILITY | 1 |
| BCS358D | DATA VISUALIZATION WITH PYTHON | 1 |
| BCS358E | WEB TECHNOLOGIES | 1 |
| BPEK359 | PHYSICAL EDUCATION | 0 |
| BNSK359 | NATIONAL SERVICE SCHEME | 0 |
| BYOK359 | YOGA | 0 |

---

## 🔍 Verify Your Data

```sql
-- Connect to MySQL
mysql -u root -p resana

-- Check students
SELECT COUNT(*) FROM student_details;
SELECT usn, name, batch, section, cgpa FROM student_details LIMIT 5;

-- Check subjects  
SELECT COUNT(*) FROM subjects WHERE semester = 3;
SELECT subject_code, subject_name, credits FROM subjects WHERE semester = 3;

-- Check results (after scraping)
SELECT COUNT(*) FROM results WHERE semester = 3;
SELECT 
    r.student_usn,
    s.subject_name,
    r.internal_marks,
    r.external_marks,
    r.total_marks,
    r.result_status
FROM results r
JOIN subjects s ON r.subject_code = s.subject_code
WHERE r.semester = 3
LIMIT 10;
```

---

## ⚙️ Configuration

### Database Config (`db_config.py`)
```python
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '123456',
    'database': 'resana'
}
```

### VTU URL (`scrape_vtu_results.py`)
```python
VTU_RESULTS_URL = "https://results.vtu.ac.in/DJcbcs25/index.php"
```

---

## 🛠️ Individual Scripts (If You Want to Run Manually)

```powershell
# Test database connection
python db_config.py

# Generate subjects Excel
python create_subjects_excel.py

# Insert students
python insert_students.py

# Insert subjects
python insert_subjects.py

# Scrape results
python scrape_vtu_results.py
```

---

## 📝 Notes

### ✅ What's Handled:
- NULL values for empty Excel cells
- Initial CGPA set to 0.00
- Default batch = 2023, discipline = VTU
- Rate limiting (2 seconds between scrapes)
- Error handling and logging
- Duplicate prevention (ON DUPLICATE KEY UPDATE)

### ⚠️ Important:
1. **Run in order**: Students → Subjects → Results (foreign key dependencies)
2. **Test first**: Always test scraper with single USN before bulk scraping
3. **VTU availability**: VTU portal may be down at certain times
4. **Rate limiting**: Don't remove the 2-second delay (respect VTU servers)

### 🔄 For Semester 4 Later:
1. You'll provide the Semester 4 VTU URL
2. Create `semester_4_subjects.xlsx` (similar structure)
3. Update `VTU_RESULTS_URL` in scraper
4. Run with `semester=4`

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| MySQL connection error | Check MySQL is running, verify credentials |
| Excel file not found | Check file path matches your actual location |
| Import errors | Run `pip install -r requirements.txt` |
| No results when scraping | Check VTU portal is up, verify USN format |
| Foreign key error | Ensure students & subjects inserted before results |

---

## 📞 Ready to Execute!

**Start with:**
```powershell
cd "d:\preetham\scrapper\Preetham version\utils"
python run_setup.py
```

**Questions before proceeding?** Let me know! 🚀
