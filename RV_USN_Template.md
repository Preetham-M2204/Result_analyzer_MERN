# RV Scraper - Excel Template Guide

## 📋 How to Create Excel File for RV Scraping

### Excel Format:
- **First column** should contain USNs
- Header row is optional (will be auto-detected and skipped)
- Only the first column is read, other columns are ignored

### Example Excel Structure:

| USN         |
|-------------|
| 1BI23IS001  |
| 1BI23IS015  |
| 1BI23IS027  |
| 1BI23IS042  |
| 1BI23IS098  |

OR (with header):

| Student USN |
|-------------|
| 1BI23IS001  |
| 1BI23IS015  |
| 1BI23IS027  |

OR (simple list without header):

```
1BI23IS001
1BI23IS015
1BI23IS027
1BI23IS042
1BI23IS098
```

---

## 📝 Steps to Use:

### 1. Create Excel File
- Open Microsoft Excel or Google Sheets
- Create a new file
- Put USNs in **Column A** (first column)
- Optionally add header "USN" in first row
- Save as `.xlsx` or `.xls` format

### 2. In Admin Dashboard
1. Login as ADMIN
2. Go to **Scraper** tab
3. Select **"📝 RV (Revaluation) Results"**
4. Enter RV URL (e.g., `https://results.vtu.ac.in/rvjcfsd_cbcs/index.php`)
5. Enter Semester (e.g., `4`)
6. Select **"📄 Import Excel"** mode
7. Click **"Choose File"** and upload your Excel
8. Alert shows: "✅ Loaded X USNs from Excel file"
9. Click **"Start RV Scraper"**

### 3. Monitor Progress
- Progress card shows real-time updates
- Success/Failed counts
- Logs from scraper
- Session completes when all USNs processed

---

## ✅ Benefits of Excel Import for RV:

1. **Efficient**: Only 5-15 students apply for RV (not entire batch)
2. **Accurate**: You control exactly which USNs to scrape
3. **Reusable**: Save Excel file for future reference
4. **Flexible**: Easy to add/remove USNs
5. **Batch processing**: Process all RV students at once

---

## 🎯 Example Workflow:

1. **College receives RV applications** (e.g., 8 students)
2. **Create Excel file** with those 8 USNs
3. **Upload to RV scraper**
4. **Start scraping** → Updates marks for 8 students
5. **Auto-recalculation** → Grades and SGPA/CGPA updated
6. **Done!** ✅

---

## 📊 Sample Excel File (Copy this):

You can copy this data into Excel:

```
1BI23IS001
1BI23IS015
1BI23IS027
1BI23IS042
1BI23IS056
1BI23IS073
1BI23IS098
1BI23IS112
```

Or create your own with actual RV applicant USNs.

---

## ⚠️ Important Notes:

- **First column only**: Other columns are ignored
- **Case insensitive**: 1bi23is001 → 1BI23IS001 (auto-converted)
- **Empty rows skipped**: Blank cells are ignored
- **Header auto-detected**: If first row contains "usn" text
- **File types**: `.xlsx` or `.xls` only
- **No special formatting**: Plain text USNs work best

---

## 🚨 Common Errors:

### Error: "No USNs found in Excel file"
**Cause:** USNs not in first column  
**Solution:** Move USNs to Column A

### Error: "Failed to parse Excel file"
**Cause:** File not in .xlsx/.xls format  
**Solution:** Save as Excel format (not CSV or TXT)

### Error: "No valid USNs provided"
**Cause:** All rows are empty  
**Solution:** Add USNs to the file

---

## 💡 Pro Tip:

Keep a master Excel file with all RV applicants across semesters:

| Semester | USN         | Subject   | Applied Date |
|----------|-------------|-----------|--------------|
| 4        | 1BI23IS001  | BCS403    | 2025-11-05   |
| 4        | 1BI23IS015  | BCS403    | 2025-11-05   |
| 6        | 1BI22IS042  | BCS601    | 2025-11-08   |

Then extract USNs for specific semester when scraping!

---

**Created:** November 10, 2025  
**Purpose:** RV Scraper Excel Import Guide
