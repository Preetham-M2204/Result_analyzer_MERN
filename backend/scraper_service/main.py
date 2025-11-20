"""
VTU RESULTS SCRAPER - FASTAPI WRAPPER
======================================
Simple FastAPI wrapper that calls existing Python scrapers
No logic changes - just a clean API interface
Auto-calculates SGPA/CGPA after scraping completes
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, ValidationError
from typing import List
import subprocess
import json
import time
import os
import sys

# FastAPI app
app = FastAPI(title="VTU Scraper Service")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Path to scraper scripts
SCRIPTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'scripts')
ULTIMATE_SCRAPER = os.path.join(SCRIPTS_DIR, 'ultimate_scraper.py')
AUTONOMOUS_SCRAPER = os.path.join(SCRIPTS_DIR, 'AUTONOMOUS_scrapper.py')
RV_SCRAPER = os.path.join(SCRIPTS_DIR, 'Rv_ScrapperVTU.py')
GRADE_CALCULATOR = os.path.join(SCRIPTS_DIR, 'calculate_grades.py')

# Import grade calculation function
sys.path.insert(0, SCRIPTS_DIR)
try:
    from calculate_grades import calculate_grades_for_semester
except ImportError:
    calculate_grades_for_semester = None
    print("WARNING: Grade calculator not found, SGPA/CGPA won't be calculated automatically")

# Request models
class VTUScrapeRequest(BaseModel):
    url: str
    semester: int
    scheme: str
    usns: List[str]
    workers: int = 20
    
class AutonomousScrapeRequest(BaseModel):
    url: str
    students: List[dict]  # [{"usn": "1BI22IS001", "dob": "2004-05-15"}, ...]
    workers: int = 20

class RVScrapeRequest(BaseModel):
    model_config = ConfigDict(extra='ignore')
    
    url: str
    semester: int
    usns: List[str]
    workers: int = 20
    
class ScrapeResponse(BaseModel):
    success: bool
    total: int
    succeeded: int
    failed: int
    failed_usns: List[str]
    time_taken: float
    message: str
    logs: List[str]

@app.post("/scrape/vtu", response_model=ScrapeResponse)
async def scrape_vtu_results(request: VTUScrapeRequest):
    """
    Call ultimate_scraper.py with given parameters
    """
    start_time = time.time()
    
    print(f"VTU SCRAPER STARTED - {len(request.usns)} students - {request.workers} workers")
    
    # Prepare command
    usns_csv = ','.join(request.usns)
    
    cmd = [
        'python',
        ULTIMATE_SCRAPER,
        '--url', request.url,
        '--semester', str(request.semester),
        '--scheme', request.scheme,
        '--workers', str(request.workers),
        '--usns', usns_csv
    ]
    
    try:
        # Run the scraper
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=SCRIPTS_DIR,
            encoding='utf-8',
            errors='replace'
        )
        
        # Parse output
        output_lines = result.stdout.split('\n')
        logs = [line for line in output_lines if line.strip()]
        
        # Count success/failed from logs
        # ultimate_scraper.py prints:
        # - "OK {usn}" at the end when successful
        # - "FAIL {usn}" at the end when failed
        succeeded = []
        failed = []
        
        for line in logs:
            # Check for final success/fail markers (exactly "OK {usn}" or "FAIL {usn}")
            parts = line.split()
            if len(parts) == 2:
                if parts[0] == 'OK' and parts[1] in request.usns:
                    succeeded.append(parts[1])
                elif parts[0] == 'FAIL' and parts[1] in request.usns:
                    failed.append(parts[1])
        
        time_taken = time.time() - start_time
        
        print(f"VTU SCRAPER COMPLETED - Success: {len(succeeded)} - Failed: {len(failed)} - Time: {time_taken:.2f}s")
        
        # Auto-calculate SGPA/CGPA after successful scraping
        if len(succeeded) > 0 and calculate_grades_for_semester:
            try:
                print(f"Calculating SGPA/CGPA for Semester {request.semester}...")
                grade_result = calculate_grades_for_semester(request.semester, verbose=False)
                if grade_result['success']:
                    print(f"Grade calculation completed successfully")
                else:
                    print(f"Grade calculation failed: {grade_result.get('error', 'Unknown error')}")
            except Exception as e:
                print(f"Grade calculation error (non-fatal): {str(e)}")
        
        return ScrapeResponse(
            success=True,
            total=len(request.usns),
            succeeded=len(succeeded),
            failed=len(failed),
            failed_usns=failed,
            time_taken=time_taken,
            message=f"Scraping completed. {len(succeeded)} succeeded, {len(failed)} failed.",
            logs=logs[-50:]  # Last 50 log lines
        )
        
    except Exception as e:
        print(f"VTU SCRAPER ERROR: {str(e)}")
        return ScrapeResponse(
            success=False,
            total=len(request.usns),
            succeeded=0,
            failed=len(request.usns),
            failed_usns=request.usns,
            time_taken=time.time() - start_time,
            message=f"Scraper failed: {str(e)}",
            logs=[str(e)]
        )

@app.post("/scrape/autonomous", response_model=ScrapeResponse)
async def scrape_autonomous_results(request: AutonomousScrapeRequest):
    """
    Call AUTONOMOUS_scrapper.py with given parameters
    """
    start_time = time.time()
    
    print(f"AUTONOMOUS SCRAPER STARTED - {len(request.students)} students - {request.workers} workers")
    
    # Prepare command
    students_json = json.dumps(request.students)
    
    cmd = [
        'python',
        AUTONOMOUS_SCRAPER,
        '--url', request.url,
        '--workers', str(request.workers),
        '--students', students_json
    ]
    
    try:
        # Run the scraper
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=SCRIPTS_DIR,
            encoding='utf-8',
            errors='replace'
        )
        
        # Parse output
        output_lines = result.stdout.split('\n')
        logs = [line for line in output_lines if line.strip()]
        
        # Count success/failed from logs
        # ultimate_scraper.py prints:
        # - "OK {usn}" at the end when successful
        # - "FAIL {usn}" at the end when failed
        succeeded = []
        failed = []
        
        for line in logs:
            # Check for final success/fail markers (exactly "OK {usn}" or "FAIL {usn}")
            parts = line.split()
            if len(parts) == 2:
                if parts[0] == 'OK' and parts[1] in [s['usn'] for s in request.students]:
                    succeeded.append(parts[1])
                elif parts[0] == 'FAIL' and parts[1] in [s['usn'] for s in request.students]:
                    failed.append(parts[1])
        
        time_taken = time.time() - start_time
        
        print(f"AUTONOMOUS SCRAPER COMPLETED - Success: {len(succeeded)} - Failed: {len(failed)} - Time: {time_taken:.2f}s")
        
        return ScrapeResponse(
            success=True,
            total=len(request.students),
            succeeded=len(succeeded),
            failed=len(failed),
            failed_usns=failed,
            time_taken=time_taken,
            message=f"Scraping completed. {len(succeeded)} succeeded, {len(failed)} failed.",
            logs=logs[-50:]  # Last 50 log lines
        )
        
    except Exception as e:
        print(f"AUTONOMOUS SCRAPER ERROR: {str(e)}")
        return ScrapeResponse(
            success=False,
            total=len(request.students),
            succeeded=0,
            failed=len(request.students),
            failed_usns=[s['usn'] for s in request.students],
            time_taken=time.time() - start_time,
            message=f"Scraper failed: {str(e)}",
            logs=[str(e)]
        )

@app.post("/scrape/rv", response_model=ScrapeResponse)
async def scrape_rv_results(request: Request):
    """
    Call Rv_ScrapperVTU.py with given parameters
    For revaluation results - updates existing records, doesn't create new attempts
    """
    # Debug: Log raw request body
    raw_body = await request.json()
    print(f"🔍 RAW REQUEST BODY: {json.dumps(raw_body, indent=2)}")
    
    # Validate and parse
    try:
        validated_request = RVScrapeRequest(**raw_body)
    except ValidationError as e:
        print(f"❌ VALIDATION ERROR: {e}")
        raise HTTPException(status_code=422, detail=str(e))
    
    start_time = time.time()
    
    print(f"RV SCRAPER STARTED - {len(validated_request.usns)} students - {validated_request.workers} workers")
    print(f"RV SCRAPER - Request received: url={validated_request.url}, semester={validated_request.semester}, usns_count={len(validated_request.usns)}")
    
    # Prepare command
    usns_csv = ','.join(validated_request.usns)
    
    cmd = [
        'python',
        RV_SCRAPER,
        '--url', validated_request.url,
        '--workers', str(validated_request.workers),
        '--usns', usns_csv
    ]
    
    try:
        # Run the scraper
        print(f"CMD Executing command: {' '.join(cmd)}")
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=SCRIPTS_DIR,
            encoding='utf-8',
            errors='replace'
        )
        
        # Parse output
        output_lines = result.stdout.split('\n')
        error_lines = result.stderr.split('\n')
        logs = [line for line in output_lines if line.strip()]
        
        # Print ALL output for debugging
        print(f"\n{'='*60}")
        print(f"RV SCRAPER STDOUT ({len(logs)} lines):")
        print(f"{'='*60}")
        for line in logs[-100:]:  # Last 100 lines
            print(line)
        print(f"{'='*60}\n")
        
        if error_lines and any(line.strip() for line in error_lines):
            print(f"\n{'='*60}")
            print(f"RV SCRAPER STDERR:")
            print(f"{'='*60}")
            for line in error_lines:
                if line.strip():
                    print(line)
            print(f"{'='*60}\n")
        
        # Count success/failed from logs
        # Rv_ScrapperVTU.py prints various formats:
        # - "OK {usn} - RV results scraped"
        # - "OK {usn}"
        # - "FAIL {usn} - Failed after 5 attempts"
        # - "FAIL {usn}"
        succeeded = []
        failed = []
        
        for line in logs:
            # Check if line starts with OK or FAIL
            if line.startswith('OK '):
                # Extract USN (second word before any dash/hyphen)
                parts = line.split()
                if len(parts) >= 2:
                    usn_candidate = parts[1]
                    if usn_candidate in validated_request.usns and usn_candidate not in succeeded:
                        succeeded.append(usn_candidate)
                        print(f"OK - Marked success: {usn_candidate}")
            elif line.startswith('FAIL '):
                # Extract USN
                parts = line.split()
                if len(parts) >= 2:
                    usn_candidate = parts[1]
                    if usn_candidate in validated_request.usns and usn_candidate not in failed:
                        failed.append(usn_candidate)
                        print(f"FAIL - Marked failed: {usn_candidate}")
        
        time_taken = time.time() - start_time
        
        print(f"\n{'='*60}")
        print(f"RV SCRAPER COMPLETED - Success: {len(succeeded)} - Failed: {len(failed)} - Time: {time_taken:.2f}s")
        print(f"{'='*60}")
        
        # Auto-calculate SGPA/CGPA after successful RV scraping
        # RV updates marks, so grades need recalculation
        print(f"\n{'='*60}")
        print(f"POST-SCRAPING: Grade Calculation")
        print(f"{'='*60}")
        if len(succeeded) > 0:
            try:
                print(f"Running grade calculation for Semester {validated_request.semester}...")
                print(f"Students affected: {len(succeeded)}")
                
                # Use subprocess to call calculate_grades.py directly (more reliable than import)
                # Use sys.executable to ensure we use the same Python interpreter
                grade_cmd = [
                    sys.executable,  # Use current Python interpreter
                    GRADE_CALCULATOR,
                    '--semester', str(validated_request.semester)
                ]
                
                print(f"CMD: {' '.join(grade_cmd)}")
                print(f"Python: {sys.executable}")
                print(f"Script: {GRADE_CALCULATOR}")
                print(f"CWD: {SCRIPTS_DIR}")
                
                grade_result = subprocess.run(
                    grade_cmd,
                    capture_output=True,
                    text=True,
                    cwd=SCRIPTS_DIR,
                    encoding='utf-8',
                    errors='replace',
                    timeout=300  # 5 minute timeout
                )
                
                if grade_result.returncode == 0:
                    print(f"SUCCESS: Grade calculation completed")
                    # Print last 20 lines of output
                    output_lines = [line for line in grade_result.stdout.split('\n') if line.strip()]
                    if output_lines:
                        print("Grade Calculation Output:")
                        for line in output_lines[-20:]:
                            print(f"  {line}")
                else:
                    print(f"FAILED: Grade calculation failed with exit code {grade_result.returncode}")
                    if grade_result.stderr:
                        print(f"Error output: {grade_result.stderr}")
                    if grade_result.stdout:
                        print(f"Standard output: {grade_result.stdout[-500:]}")  # Last 500 chars
                    
            except subprocess.TimeoutExpired:
                print(f"ERROR: Grade calculation timed out (>5 min)")
            except Exception as grade_error:
                print(f"ERROR: Grade calculation exception: {str(grade_error)}")
            except Exception as e:
                print(f"ERROR: Grade calculation crashed: {str(e)}")
                import traceback
                traceback.print_exc()
        else:
            print(f"SKIPPED: No successful scrapes, nothing to recalculate")
        print(f"{'='*60}\n")
        
        return ScrapeResponse(
            success=True,
            total=len(validated_request.usns),
            succeeded=len(succeeded),
            failed=len(failed),
            failed_usns=failed,
            time_taken=time_taken,
            message=f"RV scraping completed. {len(succeeded)} succeeded, {len(failed)} failed.",
            logs=logs[-50:]  # Last 50 log lines
        )
        
    except Exception as e:
        print(f"RV SCRAPER ERROR: {str(e)}")
        return ScrapeResponse(
            success=False,
            total=len(validated_request.usns),
            succeeded=0,
            failed=len(validated_request.usns),
            failed_usns=validated_request.usns,
            time_taken=time.time() - start_time,
            message=f"RV scraper failed: {str(e)}",
            logs=[str(e)]
        )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "VTU Scraper Wrapper",
        "ultimate_scraper": os.path.exists(ULTIMATE_SCRAPER),
        "autonomous_scraper": os.path.exists(AUTONOMOUS_SCRAPER),
        "rv_scraper": os.path.exists(RV_SCRAPER)
    }

if __name__ == "__main__":
    import uvicorn
    port = 8001  # Fixed port for scraper service
    print(f"Starting VTU Scraper Service on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)

