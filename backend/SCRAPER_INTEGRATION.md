# VTU Results Scraper Integration

## Architecture

```
Frontend (React) → Node.js Backend → FastAPI Service → Python Scrapers
                         ↓                 ↓                  ↓
                      MySQL DB         Port 8000      ultimate_scraper.py
```

## Quick Start

### 1. Start FastAPI Service
```bash
cd backend/scraper_service
python main.py
```

### 2. Start Node.js Backend
```bash
cd backend
npm start
```

### 3. Test Health Check
```bash
GET http://localhost:5000/api/scraper/health
```

## API Endpoints

### Start VTU Scraper
```http
POST /api/scraper/vtu/start
Authorization: Bearer <admin_token>

Body:
{
  "url": "https://results.vtu.ac.in/DJcbcs24/index.php",
  "mode": "batch",          // or "single"
  "batchYear": 2022,        // required for batch mode
  "usn": "1BI22IS001",      // required for single mode
  "semester": 3,
  "scheme": "22",
  "workers": 20
}

Response:
{
  "success": true,
  "message": "Scraper started",
  "data": {
    "sessionId": "vtu_1234567890",
    "totalUSNs": 136,
    "workers": 20
  }
}
```

### Get Scraper Progress
```http
GET /api/scraper/progress/:sessionId
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": {
    "type": "vtu",
    "status": "running",      // or "completed", "failed", "stopped"
    "total": 136,
    "processed": 136,
    "success": 135,
    "failed": 1,
    "failures": ["1BI22IS099"],
    "startTime": "2025-11-03T10:00:00.000Z",
    "endTime": "2025-11-03T10:15:00.000Z",
    "timeTaken": 900.5
  }
}
```

### Stop Scraper
```http
POST /api/scraper/stop/:sessionId
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "message": "Scraper stopped"
}
```

### Health Check
```http
GET /api/scraper/health
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "fastapi": true,
  "service": "VTU Scraper Wrapper"
}
```

## Files Structure

```
backend/
├── scraper_service/          # FastAPI microservice
│   ├── main.py              # FastAPI app (wrapper)
│   └── requirements.txt     # Python dependencies
│
├── scripts/                  # Python scrapers
│   ├── ultimate_scraper.py  # VTU scraper
│   ├── db_config.py         # Database config
│   └── requirements.txt     # Scraper dependencies
│
└── src/
    ├── controllers/
    │   └── scraperController.js  # NEW - Clean FastAPI integration
    └── routes/
        └── scraper.js            # Scraper routes
```

## How It Works

1. **Admin starts scraper** → Frontend sends request to Node.js
2. **Node.js fetches USNs** → Queries MySQL for student list
3. **Node.js calls FastAPI** → POST `/scrape/vtu` with USNs
4. **FastAPI runs Python** → Executes `ultimate_scraper.py` via subprocess
5. **Python scrapes results** → Uses Selenium + Tesseract OCR
6. **Python writes to DB** → Direct MySQL writes with smart update logic
7. **FastAPI returns failed USNs** → Sends back failed USNs to Node.js
8. **Node.js tracks progress** → Stores session in memory
9. **Frontend polls progress** → GET `/progress/:sessionId` every 2 seconds

## Troubleshooting

### FastAPI not starting
```bash
cd backend/scraper_service
python main.py
# Should show: Uvicorn running on http://0.0.0.0:8000
```

### Health check fails
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy","service":"VTU Scraper Wrapper"}
```

### Scraper fails silently
Check Python scraper directly:
```bash
cd backend/scripts
python ultimate_scraper.py --url https://results.vtu.ac.in/DJcbcs24/index.php --semester 3 --scheme 22 --usns 1BI22IS003
```

## Clean Code Principles

- ✅ **Single Responsibility**: Node.js handles API, Python handles scraping
- ✅ **Separation of Concerns**: FastAPI wraps existing scrapers without changing logic
- ✅ **No Code Duplication**: Removed old `scraperController_fastapi.js` and `python-shell` code
- ✅ **Clean Documentation**: JSDoc comments on all controller functions
- ✅ **Error Handling**: Try-catch blocks with proper HTTP status codes
- ✅ **Type Safety**: Pydantic models in FastAPI for request validation
