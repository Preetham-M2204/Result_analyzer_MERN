"""
Master Setup Script
Runs all steps in the correct order
"""

import subprocess
import sys
import os

def run_command(description, command):
    """Run a command and handle errors"""
    print("\n" + "="*60)
    print(f"📌 {description}")
    print("="*60)
    
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(result.stdout)
        if result.stderr:
            print(result.stderr)
        print(f"✅ {description} - SUCCESS")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} - FAILED")
        print(f"Error: {e.stderr}")
        return False

def main():
    print("="*60)
    print("🚀 VTU RESULTS SCRAPER - MASTER SETUP")
    print("="*60)
    print()
    
    # Change to utils directory
    os.chdir(r"d:\preetham\scrapper\Preetham version\utils")
    
    steps = [
        ("Step 1: Test Database Connection", "python db_config.py"),
        ("Step 2: Create Subjects Excel File", "python create_subjects_excel.py"),
        ("Step 3: Insert Students into Database", "python insert_students.py"),
        ("Step 4: Insert Subjects into Database", "python insert_subjects.py"),
    ]
    
    for step_name, command in steps:
        success = run_command(step_name, command)
        if not success:
            print(f"\n❌ Setup failed at: {step_name}")
            print("Please fix the error and run this script again.")
            sys.exit(1)
        
        input("\nPress Enter to continue to next step...")
    
    print("\n" + "="*60)
    print("✅ SETUP COMPLETE!")
    print("="*60)
    print()
    print("📋 Next Steps:")
    print("1. Verify data in MySQL database")
    print("2. Test scraper with: python scrape_vtu_results.py (option 2 - single USN)")
    print("3. Run full scrape with: python scrape_vtu_results.py (option 1)")
    print()

if __name__ == "__main__":
    main()
