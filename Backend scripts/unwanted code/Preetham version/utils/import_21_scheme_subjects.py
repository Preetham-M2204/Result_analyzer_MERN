"""
Import 21 Scheme Subjects from Excel with Elective Support
Handles subjects with X (placeholders) differently from regular subjects
"""

import pandas as pd
import re
from db_config import get_db_connection, close_connection

# Excel file path
EXCEL_FILE = r"d:\preetham\scrapper\21_Scheme\VTU_21Scheme_Subjects.xlsx"

def import_21_scheme_subjects():
    """
    Import subjects from Excel into database with elective awareness
    """
    print("="*60)
    print("IMPORTING 21 SCHEME SUBJECTS")
    print("="*60)
    
    # Read Excel
    try:
        df = pd.read_excel(EXCEL_FILE)
        print(f"✅ Read {len(df)} subjects from Excel\n")
    except Exception as e:
        print(f"❌ Error reading Excel: {e}")
        return False
    
    # Connect to database
    connection = get_db_connection()
    if not connection:
        return False
    
    cursor = connection.cursor()
    
    # Add is_placeholder column if it doesn't exist
    try:
        cursor.execute("SHOW COLUMNS FROM subjects LIKE 'is_placeholder'")
        if not cursor.fetchone():
            print("✅ Adding 'is_placeholder' column to subjects table...")
            cursor.execute("""
                ALTER TABLE subjects 
                ADD COLUMN is_placeholder BOOLEAN DEFAULT FALSE AFTER scheme
            """)
            connection.commit()
            print("   ✅ Column added\n")
        else:
            print("ℹ️  'is_placeholder' column already exists\n")
    except Exception as e:
        print(f"⚠️  Error checking column: {e}\n")
    
    # Statistics
    regular_count = 0
    elective_count = 0
    
    print(f"{'Semester':<10} {'Subject Code':<15} {'Subject Name':<50} {'Credits':<8} {'Type':<15}")
    print("="*110)
    
    for _, row in df.iterrows():
        semester = int(row['Semester'])
        shortcode = str(row['Shortcode']).strip()
        subject_code = str(row['Subject Code']).strip()
        subject_name = str(row['Subject Name']).strip()
        credits = int(row['Credits'])
        scheme = str(row['Scheme']).strip()
        
        # Check if this is an elective (has X in code)
        is_elective = bool(re.search(r'X', subject_code, re.IGNORECASE))
        
        if is_elective:
            # This is a PLACEHOLDER for electives
            # Store in subjects table but mark clearly as placeholder
            # Actual elective choices will be stored in elective_subjects table
            
            insert_query = """
            INSERT INTO subjects 
            (subject_code, subject_name, semester, credits, scheme, is_placeholder)
            VALUES (%s, %s, %s, %s, %s, TRUE)
            ON DUPLICATE KEY UPDATE
                subject_name = VALUES(subject_name),
                semester = VALUES(semester),
                credits = VALUES(credits),
                is_placeholder = VALUES(is_placeholder)
            """
            
            cursor.execute(insert_query, (
                subject_code, subject_name, semester, credits, scheme
            ))
            
            elective_count += 1
            type_label = "ELECTIVE/PLACEHOLDER"
            
        else:
            # Regular subject
            insert_query = """
            INSERT INTO subjects 
            (subject_code, subject_name, semester, credits, scheme, is_placeholder)
            VALUES (%s, %s, %s, %s, %s, FALSE)
            ON DUPLICATE KEY UPDATE
                subject_name = VALUES(subject_name),
                semester = VALUES(semester),
                credits = VALUES(credits),
                is_placeholder = VALUES(is_placeholder)
            """
            
            cursor.execute(insert_query, (
                subject_code, subject_name, semester, credits, scheme
            ))
            
            regular_count += 1
            type_label = "REGULAR"
        
        print(f"{semester:<10} {subject_code:<15} {subject_name[:48]:<50} {credits:<8} {type_label:<15}")
    
    # Commit changes
    connection.commit()
    
    cursor.close()
    close_connection(connection)
    
    print("\n" + "="*60)
    print("IMPORT SUMMARY")
    print("="*60)
    print(f"Regular subjects:    {regular_count}")
    print(f"Elective placeholders: {elective_count}")
    print(f"Total:               {regular_count + elective_count}")
    print("\n✅ Import completed successfully!")
    
    return True

def verify_import():
    """
    Verify that subjects were imported correctly
    """
    print("\n" + "="*60)
    print("VERIFYING IMPORT")
    print("="*60)
    
    connection = get_db_connection()
    if not connection:
        return
    
    cursor = connection.cursor()
    
    # Count by scheme
    cursor.execute("""
        SELECT scheme, is_placeholder, COUNT(*) as count 
        FROM subjects 
        GROUP BY scheme, is_placeholder
        ORDER BY scheme, is_placeholder
    """)
    
    results = cursor.fetchall()
    
    print(f"\n{'Scheme':<10} {'Type':<20} {'Count':<10}")
    print("="*40)
    for scheme, is_placeholder, count in results:
        type_label = "Elective/Placeholder" if is_placeholder else "Regular"
        print(f"{scheme:<10} {type_label:<20} {count:<10}")
    
    # Show elective placeholders
    print("\n" + "="*60)
    print("ELECTIVE PLACEHOLDERS (with X in code)")
    print("="*60)
    
    cursor.execute("""
        SELECT semester, subject_code, subject_name, credits 
        FROM subjects 
        WHERE is_placeholder = TRUE AND scheme = '21'
        ORDER BY semester, subject_code
    """)
    
    placeholders = cursor.fetchall()
    
    print(f"{'Semester':<10} {'Code':<15} {'Name':<50} {'Credits':<8}")
    print("="*85)
    for sem, code, name, cred in placeholders:
        print(f"{sem:<10} {code:<15} {name[:48]:<50} {cred:<8}")
    
    cursor.close()
    close_connection(connection)

if __name__ == "__main__":
    if import_21_scheme_subjects():
        verify_import()
