# Manual Test Script for Scraper Integration
# Tests the complete flow: Node.js → FastAPI → Python Scraper

Write-Host "=== VTU Scraper Integration Test ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$backendUrl = "http://localhost:3000"
$fastApiUrl = "http://localhost:8000"
$testUSN = "1BI22IS003"
$resultUrl = "https://results.vtu.ac.in/DJcbcs24/index.php"

# Test 1: FastAPI Health Check
Write-Host "Test 1: FastAPI Health Check" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$fastApiUrl/health" -Method Get
    Write-Host "OK FastAPI is running: $($health.service)" -ForegroundColor Green
} catch {
    Write-Host "FAIL FastAPI not responding. Start it first: cd scraper_service; python main.py" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 2: Backend Health Check (if exists)
Write-Host "Test 2: Backend Server Check" -ForegroundColor Yellow
try {
    # Try admin health endpoint or any endpoint
    $response = Invoke-RestMethod -Uri "$backendUrl/api/scraper/health" -Method Get -Headers @{
        "Authorization" = "Bearer your_admin_token_here"
    }
    Write-Host "OK Backend is running" -ForegroundColor Green
} catch {
    Write-Host "WARNING Backend check failed (might need auth token). Continuing..." -ForegroundColor Yellow
}
Write-Host ""

# Test 3: Direct FastAPI Scraper Call (No Auth)
Write-Host "Test 3: Direct FastAPI Scraper Call" -ForegroundColor Yellow
Write-Host "Scraping USN: $testUSN from $resultUrl" -ForegroundColor Cyan

$scrapeBody = @{
    url = $resultUrl
    semester = 3
    scheme = "22"
    usns = @($testUSN)
    workers = 1
} | ConvertTo-Json

try {
    $scrapeResult = Invoke-RestMethod -Uri "$fastApiUrl/scrape/vtu" -Method Post `
        -ContentType "application/json" -Body $scrapeBody
    
    Write-Host "OK Scraper completed in $($scrapeResult.time_taken)s" -ForegroundColor Green
    Write-Host "   Total: $($scrapeResult.total)" -ForegroundColor Cyan
    Write-Host "   Succeeded: $($scrapeResult.succeeded)" -ForegroundColor Green
    Write-Host "   Failed: $($scrapeResult.failed)" -ForegroundColor $(if ($scrapeResult.failed -eq 0) { "Green" } else { "Red" })
    
    if ($scrapeResult.failed_usns.Count -gt 0) {
        Write-Host "   Failed USNs: $($scrapeResult.failed_usns -join ', ')" -ForegroundColor Red
    }
} catch {
    Write-Host "FAIL Scraper failed: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 4: Check Database (Optional)
Write-Host "Test 4: Verify Database Entry (Manual Check)" -ForegroundColor Yellow
Write-Host "Run this query in MySQL to verify:" -ForegroundColor Cyan
Write-Host "  USE resana;" -ForegroundColor Gray
Write-Host "  SELECT * FROM results WHERE student_usn = '$testUSN' AND semester = 3;" -ForegroundColor Gray
Write-Host ""

# Summary
Write-Host "=== Test Summary ===" -ForegroundColor Green
Write-Host "FastAPI:  OK" -ForegroundColor Green
Write-Host "Scraper:  OK ($($scrapeResult.succeeded) / $($scrapeResult.total) succeeded)" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Start backend: cd backend; npm start" -ForegroundColor Gray
Write-Host "2. Get admin token from login" -ForegroundColor Gray
Write-Host "3. Test backend endpoint: POST /api/scraper/vtu/start" -ForegroundColor Gray
Write-Host "4. Poll progress: GET /api/scraper/progress/:sessionId" -ForegroundColor Gray
