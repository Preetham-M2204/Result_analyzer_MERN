# VTU SCRAPER - FASTAPI MICROSERVICE SETUP

## Installation

1. **Install Python dependencies:**
```bash
cd backend/scraper_service
pip install -r requirements.txt
```

2. **Install axios in Node.js backend:**
```bash
cd backend
npm install axios
```

## Running the Services

### 1. Start FastAPI Scraper Service (Terminal 1):
```bash
cd backend/scraper_service
python main.py
```

FastAPI will run on: `http://localhost:8000`

### 2. Start Node.js Backend (Terminal 2):
```bash
cd backend
npm run dev
```

Node.js will run on: `http://localhost:5000`

### 3. Start React Frontend (Terminal 3):
```bash
cd Result_Analyzer
npm run dev
```

Frontend will run on: `http://localhost:5173`

## Update Backend Routes

Replace the scraper controller import in `backend/src/routes/scraperRoutes.js`:

```javascript
// OLD:
const scraperController = require('../controllers/scraperController');

// NEW:
const scraperController = require('../controllers/scraperController_fastapi');
```

## How It Works

1. **Frontend** → Sends scrape request → **Node.js Backend**
2. **Node.js** → Fetches USNs from MySQL → Sends to **FastAPI**
3. **FastAPI** → Runs scraper with ThreadPool → Writes results to MySQL
4. **FastAPI** → Returns only failed USNs → **Node.js**
5. **Node.js** → Updates session status → **Frontend** displays

## Advantages

✅ **Clean logging** - Plain text, no emojis
✅ **Direct database writes** - FastAPI writes to MySQL directly
✅ **Simple progress tracking** - Only success/fail counts
✅ **Proper isolation** - Scraper runs in separate process
✅ **Easy debugging** - FastAPI logs show exact USN status
✅ **Reliable** - No unicode issues, no shell escaping problems

## Testing

Test FastAPI service directly:

```bash
curl -X POST "http://localhost:8000/scrape" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://results.vtu.ac.in/DJcbcs24/index.php",
    "usns": ["1BI22IS001"],
    "workers": 1
  }'
```

## Logging

FastAPI console shows:
```
SCRAPER STARTED - 136 students - 20 workers
SUCCESS 1BI22IS001 - ABDUR RAHMAN - 9 subjects
SUCCESS 1BI22IS002 - STUDENT NAME - 9 subjects
FAILED 1BI22IS003 - Invalid USN or CAPTCHA
...
SCRAPER COMPLETED - Success: 134 - Failed: 2 - Time: 245.32s
```

Clean and simple!
