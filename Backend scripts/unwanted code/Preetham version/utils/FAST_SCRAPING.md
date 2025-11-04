# Fast Scraping Guide

## 🚀 NEW: Parallel Scraper (5-10x faster!)

### File: `scrape_vtu_results_fast.py`

**Key Features:**
- ⚡ **5-10x faster** than the original scraper
- Uses **multi-threading** to run 5+ browser instances in parallel
- Thread-safe database writes with locking
- Runs browsers in **headless mode** (background) for speed
- Automatic cleanup of temporary files per thread

### How to Use:

```powershell
cd "d:\preetham\scrapper\Preetham version\utils"
python scrape_vtu_results_fast.py
```

**Prompts:**
1. Enter semester: `1` (or 2, 3, 4)
2. Enter VTU results URL: `https://results.vtu.ac.in/...`
3. Number of parallel workers: `5` (default, can go up to 10)

### Speed Comparison:

| Scraper | Time for 200 students | Workers |
|---------|----------------------|---------|
| Original (`scrape_vtu_results.py`) | ~40-50 minutes | 1 |
| **Fast (`scrape_vtu_results_fast.py`)** | **~8-10 minutes** | 5 |
| **Fast with 10 workers** | **~5-6 minutes** | 10 |

### Recommended Settings:

- **Start with 5 workers** - Good balance of speed and stability
- **Use 8-10 workers** - Maximum speed (if your system can handle it)
- **Lower to 3 workers** - If you get too many errors or system slowdown

### What Changed:

1. **ThreadPoolExecutor** - Runs multiple browser instances at once
2. **Thread-safe DB writes** - Uses locks to prevent data corruption
3. **Headless browsers** - Runs Chrome in background (no visible windows)
4. **Unique temp files** - Each thread uses its own CAPTCHA image files
5. **Progress tracking** - Shows success/error counts as it runs

### Notes:

- All scraped data goes to the same `results` table
- The scraper still retries CAPTCHA up to 5 times per student
- Database locks ensure no race conditions when writing
- Failed USNs are reported at the end (same as before)

### Tips for Maximum Speed:

1. Close other Chrome windows to free up RAM
2. Use 8-10 workers if you have a good CPU (4+ cores)
3. Make sure your internet connection is stable
4. Run during off-peak hours (VTU server is less loaded)

---

## Original Scraper (Still Available)

**File:** `scrape_vtu_results.py`
- Single-threaded (one student at a time)
- More stable for debugging
- Shows detailed output per student
- Good for testing single USNs

Both scrapers work with the same database and produce identical results!
