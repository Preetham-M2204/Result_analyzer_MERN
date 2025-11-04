# 🚀 ULTIMATE SCRAPER - Quick Start Guide

## Features Included

✅ **Multi-Semester Support** - Scrape Sem 1-8 with different URLs  
✅ **Elective Mapping** - Auto-maps 21CS48LX → 21CSL481  
✅ **Smart Retry** - Keeps retrying failed USNs until count stabilizes  
✅ **Diploma Student Handling** - Skips Sem 1-2 for 4xx students  
✅ **Parallel Scraping** - 5-10 workers for speed  
✅ **Attempt Tracking** - Tracks retakes automatically  
✅ **All Statuses** - F, P, A, X, W, NE, ABS  
✅ **Headless Chrome** - Runs in background  

## Quick Start

### 1. Run the scraper

```bash
cd "d:\preetham\scrapper\Preetham version\utils"
python ultimate_scraper.py
```

### 2. Interactive Input

The scraper will prompt you:

```
Enter batch name: 21 Scheme IS
Enter USN pattern: 1BI21IS%
Enter scheme: 21

Semester 1 URL: https://results.vtu.ac.in/...
Semester 2 URL: https://results.vtu.ac.in/...
Semester 3 URL: https://results.vtu.ac.in/...
Semester 4 URL: https://results.vtu.ac.in/...
Semester 5 URL: [leave blank to skip]
Semester 6 URL: [leave blank to skip]
Semester 7 URL: [leave blank to skip]
Semester 8 URL: [leave blank to skip]

Number of parallel workers: 7
```

### 3. What Happens

For **each semester**:
1. ✅ Scrapes all students matching pattern
2. ✅ Auto-detects semester from subject codes
3. ✅ Maps elective codes (21CSL481 → 21CS48LX)
4. ✅ Stores in database with is_elective flag
5. ✅ Retries failed USNs with smart logic
6. ✅ Stops when failed count stays same for 2 attempts

## Example Output

```
#####################################################################
📚 SEMESTER 4
🔗 URL: https://results.vtu.ac.in/resultpage.php?sem=4
👥 Students: 69
#####################################################################

✅ 1BI21IS001
✅ 1BI21IS002
✅ 1BI21IS003
⏭️  1BI21IS401: Diploma student (skipping Sem 1)
❌ 1BI21IS005

============================================================
Initial Scrape Complete (Sem 4):
✅ Success: 66/69
❌ Failed: 3
⏱️  Time: 245.32s (4.09 min)
============================================================

============================================================
🔄 Retry Attempt #1
📋 USNs to retry: 3
============================================================

✅ 1BI21IS005
✅ 1BI21IS006
❌ 1BI21IS007

============================================================
FINAL STATS - SEMESTER 4:
✅ Successfully scraped: 68/69 (98.6%)
❌ Permanently failed: 1
============================================================
```

## Elective Detection

When scraping **21 scheme students**, the scraper automatically:

1. **Detects electives**: Matches patterns like `21CSL48[0-9]`
2. **Maps to placeholder**: `21CSL481` → `21CS48LX`
3. **Stores actual choice**: Student's chosen subject (Web Programming)
4. **Marks in database**: `is_elective = TRUE`
5. **Populates elective_subjects**: For future reference

### Example:

**Student 1BI21IS001 results:**
```
Subject Code | Subject Name          | Marks | Elective?
-------------|-----------------------|-------|----------
21CS42       | Design & Analysis     | 95    | FALSE
21CSL481     | Web Programming       | 88    | TRUE  ← Detected & mapped to 21CS48LX
21CS43       | Microcontroller       | 92    | FALSE
```

**Database storage:**
```sql
-- results table
1BI21IS001 | 21CSL481 | 4 | 18 | 70 | 88 | P | 1 | TRUE | 2025-10-27

-- elective_subjects table
21CSL481 | Web Programming | 4 | 1 | 21CS48LX | 21
```

## Diploma Student Handling

Students with USN ending in **400-499** are diploma students:
- ✅ **Sem 1-2**: Auto-skipped (they joined in Sem 3)
- ✅ **Sem 3-8**: Scraped normally

**Example:**
```
1BI21IS001 → Regular student (scrapes all sems)
1BI21IS401 → Diploma student (skips Sem 1-2, scrapes Sem 3-8)
```

## Smart Retry Logic

The scraper keeps retrying failed USNs until:
1. All succeed ✅
2. Failed count stays **constant for 2 attempts** 🛑

**Why?** Some USNs might be:
- Invalid (not in VTU database)
- Suspended students
- Technical issues that won't resolve

**Example:**
```
Initial: 3 failed
Retry 1: 1 failed  ← Still improving, continue
Retry 2: 1 failed  ← Same count (streak = 1)
Retry 3: 1 failed  ← Same count (streak = 2) → STOP
```

## Database Tables Updated

### 1. `results` table
```sql
student_usn    | 1BI21IS001
subject_code   | 21CSL481 (actual chosen subject)
semester       | 4 (auto-detected)
internal_marks | 18
external_marks | 70
total_marks    | 88
result_status  | P
attempt_number | 1
is_elective    | TRUE
scraped_at     | 2025-10-27 10:30:00
```

### 2. `elective_subjects` table
```sql
subject_code     | 21CSL481
subject_name     | Web Programming
semester         | 4
credits          | 1
placeholder_code | 21CS48LX
scheme           | 21
```

### 3. `subjects` table
```sql
subject_code   | 21CS48LX
subject_name   | Ability Enhancement Course - IV
semester       | 4
credits        | 1
scheme         | 21
is_placeholder | TRUE
```

## Performance Tips

### Workers (Threads)
- **5 workers**: Slower, more stable (good for slow internet)
- **7 workers**: Balanced (recommended)
- **10 workers**: Faster, might trigger rate limits

### Estimated Time
- **69 students × 1 semester**: ~4-6 minutes (7 workers)
- **69 students × 4 semesters**: ~20-30 minutes
- **69 students × 8 semesters**: ~40-60 minutes

## Troubleshooting

### ❌ "No students found matching pattern"
**Fix**: Check database - make sure students exist
```bash
python -c "from db_config import *; c=get_db_connection(); cur=c.cursor(); cur.execute('SELECT COUNT(*) FROM student_details WHERE usn LIKE \"1BI21IS%\"'); print(cur.fetchone())"
```

### ❌ "Unknown column 'is_elective'"
**Fix**: Run elective mapper first
```bash
python elective_subjects_mapper.py
```

### ❌ All USNs failing
**Fix**: Check VTU URL is correct and site is up
```
Visit the URL in browser and verify it loads
```

### ⚠️ Some diploma students showing in Sem 1-2 failures
**Fix**: This is normal - they're auto-skipped and counted as "success"

## Next Steps After Scraping

### 1. Verify Results
```sql
-- Check total results
SELECT COUNT(*) FROM results WHERE student_usn LIKE '1BI21IS%';

-- Check electives
SELECT COUNT(*) FROM results WHERE is_elective = TRUE AND student_usn LIKE '1BI21IS%';

-- Check by semester
SELECT semester, COUNT(*) as count 
FROM results 
WHERE student_usn LIKE '1BI21IS%' 
GROUP BY semester 
ORDER BY semester;
```

### 2. Check Elective Choices
```sql
-- See what electives students chose
SELECT 
    es.placeholder_code,
    es.subject_code,
    es.subject_name,
    COUNT(*) as students_chosen
FROM results r
JOIN elective_subjects es ON r.subject_code = es.subject_code
WHERE r.student_usn LIKE '1BI21IS%' AND r.is_elective = TRUE
GROUP BY es.placeholder_code, es.subject_code, es.subject_name
ORDER BY es.placeholder_code, students_chosen DESC;
```

### 3. Export to Excel
```bash
python export_results_excel.py
```

## Files Created

- **ultimate_scraper.py** - Main scraper (THIS IS THE ONE YOU RUN)
- **elective_subjects_mapper.py** - Elective mapping logic (auto-used)
- **ULTIMATE_SCRAPER_GUIDE.md** - This guide

## Support

**Ready to scrape!** Just run:
```bash
python ultimate_scraper.py
```

Paste URLs when prompted, sit back, and watch the magic happen! 🎉
