"""
VTU RESULTS SCRAPER - FASTAPI WRAPPER
======================================
Simple FastAPI wrapper that calls existing Python scrapers
No logic changes - just a clean API interface
Auto-calculates SGPA/CGPA after scraping completes
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "VTU Scraper Wrapper",
        "ultimate_scraper": os.path.exists(ULTIMATE_SCRAPER),
        "autonomous_scraper": os.path.exists(AUTONOMOUS_SCRAPER)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

