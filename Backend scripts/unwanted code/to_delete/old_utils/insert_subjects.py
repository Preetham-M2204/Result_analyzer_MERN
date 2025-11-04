"""
Subject Data Insertion Script
Reads subject data from Excel and inserts into subjects table
"""

import pandas as pd
import sys
from db_config import get_db_connection, close_connection

# Path to the Excel file
EXCEL_FILE = r"d:\preetham\scrapper\Preetham version\semester_3_subjects.xlsx"

def clean_value(value):
    """
    Clean and convert value to proper format
    Returns None for empty/NaN values
    """
    if pd.isna(value) or value == '' or value == ' ':
        return None
    return value

def insert_subjects():
    """
    Read Excel file and insert subject data into database
    """
    try:
        # Read Excel file
        print("📖 Reading Excel file...")
        df = pd.read_excel(EXCEL_FILE)
        
        print(f"✅ Found {len(df)} subjects in Excel file")
        print(f"📋 Columns: {list(df.columns)}")
        
        # Connect to database
        connection = get_db_connection()
        if not connection:
            print("❌ Failed to connect to database")
            return False
        
        cursor = connection.cursor()
        
        # SQL Insert Query
        insert_query = """
        INSERT INTO subjects (subject_code, subject_name, semester, credits, short_code)
        VALUES (%s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            subject_name = VALUES(subject_name),
            semester = VALUES(semester),
            credits = VALUES(credits),
            short_code = VALUES(short_code)
        """
        
        success_count = 0
        error_count = 0
        
        # Insert each subject
        for index, row in df.iterrows():
            try:
                # Extract and clean data
                subject_code = clean_value(row['subject_code'])
                subject_name = clean_value(row['subject_name'])
                semester = clean_value(row['semester'])
                credits = clean_value(row['credits'])
                short_code = clean_value(row['short_code'])
                
                # Skip if required fields are missing
                if not subject_code or not subject_name:
                    print(f"⚠️  Row {index + 1}: Missing subject_code or subject_name - Skipping")
                    error_count += 1
                    continue
                
                # Prepare data tuple
                subject_data = (
                    subject_code,
                    subject_name,
                    semester if semester else 3,  # Default to semester 3
                    credits if credits is not None else 0,  # Default to 0 credits
                    short_code
                )
                
                # Execute insert
                cursor.execute(insert_query, subject_data)
                success_count += 1
                print(f"✅ Inserted: {subject_code} - {subject_name} ({credits} credits)")
                
            except Exception as e:
                error_count += 1
                print(f"❌ Error inserting row {index + 1}: {e}")
        
        # Commit all changes
        connection.commit()
        
        print("\n" + "="*60)
        print(f"✅ Successfully inserted/updated: {success_count} subjects")
        print(f"❌ Errors: {error_count}")
        print("="*60)
        
        # Close connections
        cursor.close()
        close_connection(connection)
        
        return True
        
    except FileNotFoundError:
        print(f"❌ Excel file not found: {EXCEL_FILE}")
        print("💡 Run create_subjects_excel.py first to generate the Excel file")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def verify_insertion():
    """
    Verify that subjects were inserted correctly
    """
    try:
        connection = get_db_connection()
        if not connection:
            return
        
        cursor = connection.cursor()
        cursor.execute("SELECT COUNT(*) FROM subjects WHERE semester = 3")
        count = cursor.fetchone()[0]
        
        print(f"\n📊 Total Semester 3 subjects in database: {count}")
        
        # Show all subjects
        cursor.execute("SELECT subject_code, subject_name, credits FROM subjects WHERE semester = 3 ORDER BY subject_code")
        subjects = cursor.fetchall()
        
        print("\n📋 Semester 3 Subjects:")
        print("-" * 100)
        for subject in subjects:
            print(f"Code: {subject[0]:<12} Name: {subject[1]:<60} Credits: {subject[2]}")
        print("-" * 100)
        
        cursor.close()
        close_connection(connection)
        
    except Exception as e:
        print(f"❌ Error verifying data: {e}")

if __name__ == "__main__":
    print("="*60)
    print("🚀 VTU RESULTS SCRAPER - SUBJECT DATA INSERTION")
    print("="*60)
    print()
    
    # Insert subjects
    if insert_subjects():
        print("\n✅ Subject insertion completed!")
        verify_insertion()
    else:
        print("\n❌ Subject insertion failed!")
        sys.exit(1)
