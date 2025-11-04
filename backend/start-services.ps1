# VTU Scraper Services Startup Script
# This script starts both the FastAPI service and Node.js backend

Write-Host "Starting VTU Results Scraper Services..." -ForegroundColor Cyan
Write-Host ""

# Check if Python is available
Write-Host "Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "OK $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "FAIL Python not found. Please install Python 3.11+" -ForegroundColor Red
    exit 1
}

# Check if Node.js is available
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "OK Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "FAIL Node.js not found. Please install Node.js" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting FastAPI Scraper Service (Port 8000)..." -ForegroundColor Cyan

# Start FastAPI in background
$fastApiJob = Start-Job -ScriptBlock {
    Set-Location "d:\preetham\scrapper\backend\scraper_service"
    python main.py
}

Write-Host "FastAPI service started (Job ID: $($fastApiJob.Id))" -ForegroundColor Green

# Wait for FastAPI to initialize
Write-Host "Waiting for FastAPI to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Check if FastAPI is running
try {
    $healthCheck = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get
    Write-Host "OK FastAPI health check passed: $($healthCheck.service)" -ForegroundColor Green
} catch {
    Write-Host "FAIL FastAPI not responding. Check logs with: Receive-Job -Id $($fastApiJob.Id)" -ForegroundColor Red
    Stop-Job -Id $fastApiJob.Id
    Remove-Job -Id $fastApiJob.Id
    exit 1
}

Write-Host ""
Write-Host "Starting Node.js Backend (Port 5000)..." -ForegroundColor Cyan

# Start Node.js in background
$nodeJob = Start-Job -ScriptBlock {
    Set-Location "d:\preetham\scrapper\backend"
    npm start
}

Write-Host "Node.js backend started (Job ID: $($nodeJob.Id))" -ForegroundColor Green

Write-Host ""
Write-Host "=== All Services Running ===" -ForegroundColor Green
Write-Host "FastAPI:  http://localhost:8000 (Job $($fastApiJob.Id))" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:3000 (Job $($nodeJob.Id))" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

# Monitor jobs
try {
    while ($true) {
        # Check if jobs are still running
        if ((Get-Job -Id $fastApiJob.Id).State -ne "Running") {
            Write-Host "FAIL FastAPI service stopped unexpectedly" -ForegroundColor Red
            break
        }
        if ((Get-Job -Id $nodeJob.Id).State -ne "Running") {
            Write-Host "FAIL Node.js backend stopped unexpectedly" -ForegroundColor Red
            break
        }
        
        Start-Sleep -Seconds 5
    }
} finally {
    # Cleanup on exit
    Write-Host ""
    Write-Host "Stopping services..." -ForegroundColor Yellow
    
    Stop-Job -Id $fastApiJob.Id, $nodeJob.Id -ErrorAction SilentlyContinue
    Remove-Job -Id $fastApiJob.Id, $nodeJob.Id -ErrorAction SilentlyContinue
    
    Write-Host "All services stopped" -ForegroundColor Green
}
