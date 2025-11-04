"""
Student Data Insertion Script
Reads student data from Excel and inserts into student_details table
"""

import pandas as pd
import sys
from datetime import datetime
from db_config import get_db_connection, close_connection

# Path to the Excel file
EXCEL_FILE = r"d:\preetham\scrapper\Preetham version\2023_details.xlsx"

def clean_value(value):
    """
    Clean and convert value to proper format
    Returns None for empty/NaN values
    """
    if pd.isna(value) or value == '' or value == ' ':
        return None
    return value

def insert_students():
    """
    Read Excel file and insert student data into database
    """
    try:
        # Read Excel file
        print("📖 Reading Excel file...")
        df = pd.read_excel(EXCEL_FILE)
        
        print(f"✅ Found {len(df)} students in Excel file")
        print(f"📋 Columns: {list(df.columns)}")
        
        # Connect to database
        connection = get_db_connection()
        if not connection:
            print("❌ Failed to connect to database")
            return False
        
        cursor = connection.cursor()
        
        # SQL Insert Query
        insert_query = """
        INSERT INTO student_details (usn, name, gender, batch, discipline, dob, section, cgpa)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        success_count = 0
        error_count = 0
        
        # Insert each student
        for index, row in df.iterrows():
            try:
                # Extract and clean data
                usn = clean_value(row['USN'])
                name = clean_value(row['Name'])
                gender = clean_value(row['Gender'])
                batch = clean_value(row['Batch'])
                discipline = clean_value(row['discipline'])
                dob = clean_value(row['DOB'])
                section = clean_value(row['section'])
                cgpa = 0.00  # Set initial CGPA to 0.00
                
                # Skip if USN or Name is missing (required fields)
                if not usn or not name:
                    print(f"⚠️  Row {index + 1}: Missing USN or Name - Skipping")
                    error_count += 1
                    continue
                
                # Convert DOB to proper date format if exists
                if dob:
                    try:
                        if isinstance(dob, str):
                            dob = pd.to_datetime(dob).date()
                        elif isinstance(dob, pd.Timestamp):
                            dob = dob.date()
                    except:
                        dob = None
                
                # Prepare data tuple
                student_data = (
                    usn,
                    name,
                    gender,
                    batch if batch else 2023,  # Default to 2023 if missing
                    discipline if discipline else 'VTU',  # Default to VTU
                    dob,
                    section,
                    cgpa
                )
                
                # Execute insert
                cursor.execute(insert_query, student_data)
                success_count += 1
                print(f"✅ Inserted: {usn} - {name}")
                
            except Exception as e:
                error_count += 1
                print(f"❌ Error inserting row {index + 1} (USN: {row.get('USN', 'N/A')}): {e}")
        
        # Commit all changes
        connection.commit()
        
        print("\n" + "="*60)
        print(f"✅ Successfully inserted: {success_count} students")
        print(f"❌ Errors: {error_count}")
        print("="*60)
        
        # Close connections
        cursor.close()
        close_connection(connection)
        
        return True
        
    except FileNotFoundError:
        print(f"❌ Excel file not found: {EXCEL_FILE}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def verify_insertion():
    """
    Verify that students were inserted correctly
    """
    try:
        connection = get_db_connection()
        if not connection:
            return
        
        cursor = connection.cursor()
        cursor.execute("SELECT COUNT(*) FROM student_details")
        count = cursor.fetchone()[0]
        
        print(f"\n📊 Total students in database: {count}")
        
        # Show first 5 students
        cursor.execute("SELECT usn, name, batch, section, cgpa FROM student_details LIMIT 5")
        students = cursor.fetchall()
        
        print("\n📋 Sample students:")
        print("-" * 80)
        for student in students:
            print(f"USN: {student[0]:<15} Name: {student[1]:<30} Batch: {student[2]} Section: {student[3]} CGPA: {student[4]}")
        print("-" * 80)
        
        cursor.close()
        close_connection(connection)
        
    except Exception as e:
        print(f"❌ Error verifying data: {e}")

if __name__ == "__main__":
    print("="*60)
    print("🚀 VTU RESULTS SCRAPER - STUDENT DATA INSERTION")
    print("="*60)
    print()
    
    # Insert students
    if insert_students():
        print("\n✅ Student insertion completed!")
        verify_insertion()
    else:
        print("\n❌ Student insertion failed!")
        sys.exit(1)
