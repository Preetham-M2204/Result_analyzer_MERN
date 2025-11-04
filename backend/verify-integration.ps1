# ✅ INTEGRATION VERIFICATION CHECKLIST
# Run this before testing to ensure everything is ready

Write-Host "=== VTU Scraper Integration Verification ===" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check 1: File Structure
Write-Host "Check 1: Verify File Structure" -ForegroundColor Yellow
$requiredFiles = @(
    "src\controllers\scraperController.js",
    "src\routes\scraper.js",
    "scraper_service\main.py",
    "scripts\ultimate_scraper.py",
    "scripts\db_config.py"
)

foreach ($file in $requiredFiles) {
    $fullPath = "d:\preetham\scrapper\backend\$file"
    if (Test-Path $fullPath) {
        Write-Host "   OK $file" -ForegroundColor Green
    } else {
        Write-Host "   FAIL $file not found" -ForegroundColor Red
        $allGood = $false
    }
}
Write-Host ""

# Check 2: Old Files Deleted
Write-Host "Check 2: Verify Old Files Deleted" -ForegroundColor Yellow
$deletedFiles = @(
    "src\controllers\scraperController_fastapi.js"
)

foreach ($file in $deletedFiles) {
    $fullPath = "d:\preetham\scrapper\backend\$file"
    if (-not (Test-Path $fullPath)) {
        Write-Host "   OK $file deleted" -ForegroundColor Green
    } else {
        Write-Host "   FAIL $file still exists (should be deleted)" -ForegroundColor Red
        $allGood = $false
    }
}
Write-Host ""

# Check 3: scraperController.js is clean (not corrupted)
Write-Host "Check 3: Verify scraperController.js is clean" -ForegroundColor Yellow
$controllerPath = "d:\preetham\scrapper\backend\src\controllers\scraperController.js"
$controllerContent = Get-Content $controllerPath -Raw

if ($controllerContent -match "\*\*/\*\*/\*\*") {
    Write-Host "   FAIL File is corrupted (contains /**/**/**)" -ForegroundColor Red
    $allGood = $false
} elseif ($controllerContent -match "python-shell") {
    Write-Host "   FAIL File still has old python-shell code" -ForegroundColor Red
    $allGood = $false
} elseif ($controllerContent -match "axios") {
    Write-Host "   OK File uses axios (FastAPI integration)" -ForegroundColor Green
} else {
    Write-Host "   WARNING Cannot verify axios usage" -ForegroundColor Yellow
}

$controllerSize = (Get-Item $controllerPath).Length
if ($controllerSize -lt 5000) {
    Write-Host "   OK File size is clean ($controllerSize bytes, expected < 5KB)" -ForegroundColor Green
} else {
    Write-Host "   WARNING File is larger than expected ($controllerSize bytes)" -ForegroundColor Yellow
}
Write-Host ""

# Check 4: Routes point to correct controller
Write-Host "Check 4: Verify Routes Configuration" -ForegroundColor Yellow
$routesPath = "d:\preetham\scrapper\backend\src\routes\scraper.js"
$routesContent = Get-Content $routesPath -Raw

if ($routesContent -match "scraperController_fastapi") {
    Write-Host "   FAIL Routes still point to old controller" -ForegroundColor Red
    $allGood = $false
} elseif ($routesContent -match "require\('\.\./controllers/scraperController'\)") {
    Write-Host "   OK Routes point to new controller" -ForegroundColor Green
} else {
    Write-Host "   WARNING Cannot verify routes" -ForegroundColor Yellow
}

if ($routesContent -match "/health") {
    Write-Host "   OK Health endpoint exists" -ForegroundColor Green
} else {
    Write-Host "   WARNING Health endpoint not found" -ForegroundColor Yellow
}

if ($routesContent -match "/sessions") {
    Write-Host "   OK Sessions endpoint exists" -ForegroundColor Green
} else {
    Write-Host "   WARNING Sessions endpoint not found" -ForegroundColor Yellow
}
Write-Host ""

# Check 5: Dependencies
Write-Host "Check 5: Verify Dependencies" -ForegroundColor Yellow

# Check axios
$axiosVersion = npm list axios --depth=0 2>&1 | Select-String "axios@"
if ($axiosVersion) {
    Write-Host "   OK axios installed ($axiosVersion)" -ForegroundColor Green
} else {
    Write-Host "   FAIL axios not installed - run: npm install axios" -ForegroundColor Red
    $allGood = $false
}

# Check Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "   OK Python installed ($pythonVersion)" -ForegroundColor Green
} catch {
    Write-Host "   FAIL Python not found" -ForegroundColor Red
    $allGood = $false
}

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "   OK Node.js installed ($nodeVersion)" -ForegroundColor Green
} catch {
    Write-Host "   FAIL Node.js not found" -ForegroundColor Red
    $allGood = $false
}
Write-Host ""

# Check 6: Python Logs are Clean
Write-Host "Check 6: Verify Python Logs are Clean (No Emojis/Brackets)" -ForegroundColor Yellow
$ultimateScraperPath = "d:\preetham\scrapper\backend\scripts\ultimate_scraper.py"
$ultimateScraperContent = Get-Content $ultimateScraperPath -Raw

if ($ultimateScraperContent -match "\[OK\]" -or $ultimateScraperContent -match "\[FAIL\]" -or $ultimateScraperContent -match "\[INFO\]") {
    Write-Host "   FAIL ultimate_scraper.py still has [brackets]" -ForegroundColor Red
    $allGood = $false
} else {
    Write-Host "   OK ultimate_scraper.py has no [brackets]" -ForegroundColor Green
}

if ($ultimateScraperContent -match "✅" -or $ultimateScraperContent -match "❌") {
    Write-Host "   FAIL ultimate_scraper.py still has emojis" -ForegroundColor Red
    $allGood = $false
} else {
    Write-Host "   OK ultimate_scraper.py has no emojis" -ForegroundColor Green
}

$dbConfigPath = "d:\preetham\scrapper\backend\scripts\db_config.py"
$dbConfigContent = Get-Content $dbConfigPath -Raw

if ($dbConfigContent -match "✅" -or $dbConfigContent -match "❌") {
    Write-Host "   FAIL db_config.py still has emojis" -ForegroundColor Red
    $allGood = $false
} else {
    Write-Host "   OK db_config.py has no emojis" -ForegroundColor Green
}
Write-Host ""

# Check 7: FastAPI Log Parser
Write-Host "Check 7: Verify FastAPI Log Parser" -ForegroundColor Yellow
$fastApiPath = "d:\preetham\scrapper\backend\scraper_service\main.py"
$fastApiContent = Get-Content $fastApiPath -Raw

if ($fastApiContent -match "len\(parts\) == 2") {
    Write-Host "   OK Parser checks for exact 2-word lines" -ForegroundColor Green
} else {
    Write-Host "   WARNING Parser might not filter multi-word lines" -ForegroundColor Yellow
}

if ($fastApiContent -match "parts\[0\] == 'OK'") {
    Write-Host "   OK Parser checks for exact 'OK' prefix" -ForegroundColor Green
} else {
    Write-Host "   WARNING Parser might not check exact prefix" -ForegroundColor Yellow
}
Write-Host ""

# Final Summary
Write-Host "=== Verification Summary ===" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "✅ ALL CHECKS PASSED - READY TO START SERVICES" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Start FastAPI: cd scraper_service; python main.py" -ForegroundColor Gray
    Write-Host "2. Start Backend: npm start" -ForegroundColor Gray
    Write-Host "3. Run tests: .\test-integration.ps1" -ForegroundColor Gray
} else {
    Write-Host "❌ SOME CHECKS FAILED - FIX ISSUES BEFORE STARTING" -ForegroundColor Red
}
Write-Host ""
