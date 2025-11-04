# Year-Based Scraper Changes (Scheme Deprecated)

## Summary
Updated VTU scraper to **auto-detect scheme from batch year**, removing manual scheme input requirement.

**Pattern**: 
- **Batch 2021 → Scheme 21**
- **Batch 2022+ → Scheme 22**

---

## Changes Made

### 1. Backend Controller (`backend/src/controllers/scraperController.js`)

#### ✅ Removed scheme requirement from request body
```javascript
// OLD: Required scheme in request
const { url, mode, usn, batchYear, semester, scheme, workers } = req.body;
if (!url || !semester || !scheme) { ... }

// NEW: Auto-detect scheme from batch
const { url, mode, usn, batchYear, semester, workers } = req.body;
if (!url || !semester) { ... }
```

#### ✅ Auto-detect scheme logic
```javascript
let scheme = '22'; // Default scheme

if (mode === 'single') {
  // Get scheme from database for this student
  const [rows] = await mysqlPool.execute('SELECT scheme FROM student_details WHERE usn = ?', [usn]);
  if (rows.length > 0 && rows[0].scheme) {
    scheme = rows[0].scheme;
  }
} else if (mode === 'batch') {
  // Auto-detect from batch year: 2021 = scheme 21, 2022+ = scheme 22
  scheme = batchYear <= 2021 ? '21' : '22';
}
```

#### ✅ Store scheme in session for retry
```javascript
activeSessions.set(sessionId, {
  type: 'vtu',
  status: 'running',
  batch: batchYear,
  scheme: scheme,  // ← Store for retry
  ...
});
```

#### ✅ Return detected scheme in response
```javascript
res.status(200).json({
  success: true,
  data: {
    sessionId,
    totalUSNs: students.length,
    workers: workers || 20,
    scheme  // ← Frontend can show detected scheme
  }
});
```

#### ✅ Updated retry logic to auto-detect scheme
```javascript
// In retryFailedUSNs function
let scheme = originalSession.scheme || '22';
if (!originalSession.scheme && failedUSNs.length > 0) {
  const [rows] = await mysqlPool.execute('SELECT batch, scheme FROM student_details WHERE usn = ?', [failedUSNs[0]]);
  if (rows.length > 0) {
    scheme = rows[0].scheme || (rows[0].batch <= 2021 ? '21' : '22');
  }
}
```

---

### 2. Frontend (`Result_Analyzer/src/pages/AdminDashboard.tsx`)

#### ✅ Removed scheme state variable
```javascript
// REMOVED
const [scheme, setScheme] = useState('22');
```

#### ✅ Removed scheme input field from UI
```javascript
// REMOVED from JSX:
<label>📋 Scheme:</label>
<input 
  type="text" 
  value={scheme}
  onChange={(e) => setScheme(e.target.value)}
  placeholder="e.g., 22" 
  className="scraper-input" 
/>
```

#### ✅ Removed scheme from button validation
```javascript
// OLD
disabled={!vtuUrl || !semester || !scheme || ...}

// NEW
disabled={!vtuUrl || !semester || ...}
```

#### ✅ Updated info box to explain auto-detection
```javascript
<li>✅ Scheme auto-detected: 2021 batch = 21 scheme, 2022+ = 22 scheme</li>
```

#### ✅ Show detected scheme in success message
```javascript
const detectedScheme = response.data.scheme || (parseInt(batchYear) <= 2021 ? '21' : '22');
alert(`✅ VTU Scraper started!\n...
Scheme: ${detectedScheme} (auto-detected)`);
```

#### ✅ Removed scheme from retry parameters
```javascript
// REMOVED from retryParams
retryParams.scheme = scheme;

// NOW: Scheme auto-detected in backend
// Scheme will be auto-detected from batch in backend
```

---

## Database Schema (No Changes Required)

The database still has both columns:
```sql
CREATE TABLE student_details (
    usn VARCHAR(20) PRIMARY KEY,
    batch INT NOT NULL,              -- Year joined (2021, 2022, 2023...)
    scheme VARCHAR(10) DEFAULT '22', -- Curriculum scheme ('21' or '22')
    ...
);
```

**But now:**
- ✅ Scheme is **auto-detected** from batch year
- ✅ No manual input required
- ✅ Consistent mapping: 2021 → '21', 2022+ → '22'

---

## Testing Steps

### 1. Test Single USN Scraper
```bash
POST http://localhost:3000/scraper/vtu/start
{
  "url": "https://results.vtu.ac.in/...",
  "mode": "single",
  "usn": "1BI23IS001",
  "semester": "4",
  "workers": 20
}
# ✅ Should auto-detect scheme from database
```

### 2. Test Batch Year Scraper (2021 Batch)
```bash
POST http://localhost:3000/scraper/vtu/start
{
  "url": "https://results.vtu.ac.in/...",
  "mode": "batch",
  "batchYear": 2021,
  "semester": "4",
  "workers": 20
}
# ✅ Should use scheme '21'
```

### 3. Test Batch Year Scraper (2023 Batch)
```bash
POST http://localhost:3000/scraper/vtu/start
{
  "url": "https://results.vtu.ac.in/...",
  "mode": "batch",
  "batchYear": 2023,
  "semester": "4",
  "workers": 20
}
# ✅ Should use scheme '22'
```

### 4. Test Retry Feature
```bash
# Start scraper → get sessionId
# Then retry failed USNs (scheme auto-detected from session)
POST http://localhost:3000/scraper/retry/:sessionId
{
  "url": "https://results.vtu.ac.in/...",
  "semester": "4",
  "workers": 20
}
# ✅ Should reuse original scheme from session
```

---

## Benefits

1. ✅ **Simpler UI**: No more scheme dropdown clutter
2. ✅ **Fewer Errors**: Can't select wrong scheme for batch year
3. ✅ **Consistent Logic**: Scheme always matches batch year
4. ✅ **Future-proof**: New batches auto-get scheme '22'
5. ✅ **Backward Compatible**: Old database data still works

---

## Files Modified

1. `backend/src/controllers/scraperController.js` (startVTUScraper + retryFailedUSNs)
2. `Result_Analyzer/src/pages/AdminDashboard.tsx` (removed scheme UI + validation)

---

## Migration Notes

**No database migration needed!** The `scheme` column still exists and is used internally. We just:
- ✅ Auto-populate it based on batch year
- ✅ No longer ask user to input it manually
- ✅ Validate consistency: 2021 batch must have scheme '21', 2022+ must have '22'

---

**Status**: ✅ COMPLETE - Scheme is now year-based and auto-detected!
