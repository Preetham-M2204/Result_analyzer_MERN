"""
SIMPLE SCRIPT: Update Students from Excel
==========================================

This script just updates/inserts students from an Excel file.

Usage:
python update_students_from_excel.py --excel "8thsem_data.xlsx"
"""

import pandas as pd
import sys
import argparse
from db_config import get_db_connection, close_connection

def update_students_from_excel(excel_file):
    """Read Excel and update students in database."""
    
    # Read Excel file
    print(f"📖 Reading {excel_file}...")
    try:
        df = pd.read_excel(excel_file)
        print(f"✅ Found {len(df)} students in Excel")
    except Exception as e:
        print(f"❌ Error reading Excel: {e}")
        return
    
    # Connect to database
    connection = get_db_connection()
    if not connection:
        print("❌ Database connection failed")
        return
    
    cursor = connection.cursor()
    
    inserted = 0
    updated = 0
    errors = 0
    
    print("\n💾 Updating database...")
    for _, row in df.iterrows():
        usn = row['USN'].strip()
        name = row['NAME'].strip()
        section = row['Section'].strip()
        discipline = row['Discipline'].strip()
        batch = int(row['BATCH'])
        
        try:
            # Check if student exists
            cursor.execute("SELECT usn FROM students WHERE usn = %s", (usn,))
            exists = cursor.fetchone()
            
            if exists:
                # Update existing
                cursor.execute("""
                    UPDATE students 
                    SET name = %s, section = %s, discipline = %s, batch = %s
                    WHERE usn = %s
                """, (name, section, discipline, batch, usn))
                updated += 1
                print(f"  ✏️  Updated: {usn} - {name} (Section {section})")
            else:
                # Insert new
                cursor.execute("""
                    INSERT INTO students (usn, name, section, discipline, batch)
                    VALUES (%s, %s, %s, %s, %s)
                """, (usn, name, section, discipline, batch))
                inserted += 1
                print(f"  ➕ Inserted: {usn} - {name} (Section {section})")
                
        except Exception as e:
            errors += 1
            print(f"  ❌ Error with {usn}: {e}")
    
    connection.commit()
    cursor.close()
    close_connection(connection)
    
    print(f"\n{'='*60}")
    print(f"✅ COMPLETED!")
    print(f"   Inserted: {inserted}")
    print(f"   Updated:  {updated}")
    print(f"   Errors:   {errors}")
    print(f"{'='*60}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--excel', required=True, help='Excel file with student data')
    args = parser.parse_args()
    
    update_students_from_excel(args.excel)
