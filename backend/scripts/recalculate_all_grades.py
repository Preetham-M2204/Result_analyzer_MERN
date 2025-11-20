"""
Run grade calculation for all semesters (1-8)
This will update letter grades, grade points, result_status, SGPA, CGPA, and class grades
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

from calculate_grades import calculate_grades_for_semester

def run_all_semesters():
    """Run grade calculation for all semesters"""
    print("\n" + "="*80)
    print("RUNNING GRADE CALCULATION FOR ALL SEMESTERS")
    print("="*80)
    
    results = []
    for semester in range(1, 9):
        print(f"\n\n{'#'*80}")
        print(f"# PROCESSING SEMESTER {semester}")
        print(f"{'#'*80}")
        
        result = calculate_grades_for_semester(semester, verbose=True)
        results.append((semester, result))
        
        if not result['success']:
            print(f"⚠️  Warning: Semester {semester} had errors: {result.get('error', 'Unknown')}")
    
    # Summary
    print("\n\n" + "="*80)
    print("FINAL SUMMARY")
    print("="*80)
    
    successful = [r for r in results if r[1]['success']]
    failed = [r for r in results if not r[1]['success']]
    
    print(f"✅ Successfully processed: {len(successful)} semesters")
    if failed:
        print(f"❌ Failed: {len(failed)} semesters")
        for sem, result in failed:
            print(f"   Semester {sem}: {result.get('error', 'Unknown error')}")
    
    print("\n" + "="*80)
    print("ALL DONE!")
    print("="*80)
    
    return len(failed) == 0

if __name__ == '__main__':
    success = run_all_semesters()
    sys.exit(0 if success else 1)
