"""
Add 21 Scheme Support to Database
1. Add 'scheme' column to subjects table
2. Mark all existing subjects as '22 scheme'
3. Add 'scheme' column to student_details table
4. Mark all existing students (1BI23IS and 1BI24IS) as '22 scheme'
5. Insert 21 scheme students from Excel file
"""

import pandas as pd
from db_config import get_db_connection, close_connection

def add_scheme_columns():
    """Add scheme column to subjects and student_details tables"""
    connection = get_db_connection()
    if not connection:
        return False
    
    cursor = connection.cursor()
    
    print("="*60)
    print("STEP 1: Adding 'scheme' columns")
    print("="*60)
    
    try:
        # Check if scheme column exists in subjects table
        cursor.execute("SHOW COLUMNS FROM subjects LIKE 'scheme'")
        if not cursor.fetchone():
            print("✅ Adding 'scheme' column to subjects table...")
            cursor.execute("""
                ALTER TABLE subjects 
                ADD COLUMN scheme VARCHAR(10) DEFAULT '22' AFTER semester
            """)
            connection.commit()
            print("   ✅ Column added successfully")
        else:
            print("   ℹ️  'scheme' column already exists in subjects table")
        
        # Check if scheme column exists in student_details table
        cursor.execute("SHOW COLUMNS FROM student_details LIKE 'scheme'")
        if not cursor.fetchone():
            print("✅ Adding 'scheme' column to student_details table...")
            cursor.execute("""
                ALTER TABLE student_details 
                ADD COLUMN scheme VARCHAR(10) DEFAULT '22' AFTER batch
            """)
            connection.commit()
            print("   ✅ Column added successfully")
        else:
            print("   ℹ️  'scheme' column already exists in student_details table")
        
        return True
        
    except Exception as e:
        print(f"❌ Error adding columns: {e}")
        return False
    finally:
        cursor.close()
        close_connection(connection)

def mark_existing_data_as_22_scheme():
    """Mark all existing subjects and students as 22 scheme"""
    connection = get_db_connection()
    if not connection:
        return False
    
    cursor = connection.cursor()
    
    print("\n" + "="*60)
    print("STEP 2: Marking existing data as '22 scheme'")
    print("="*60)
    
    try:
        # Update subjects
        print("✅ Updating subjects table...")
        cursor.execute("UPDATE subjects SET scheme = '22' WHERE scheme IS NULL OR scheme = ''")
        subjects_updated = cursor.rowcount
        connection.commit()
        print(f"   ✅ Marked {subjects_updated} subjects as 22 scheme")
        
        # Update students (1BI23IS and 1BI24IS are 22 scheme)
        print("✅ Updating student_details table...")
        cursor.execute("""
            UPDATE student_details 
            SET scheme = '22' 
            WHERE (usn LIKE '1BI23IS%' OR usn LIKE '1BI24IS%')
            AND (scheme IS NULL OR scheme = '')
        """)
        students_updated = cursor.rowcount
        connection.commit()
        print(f"   ✅ Marked {students_updated} students (2023 & 2024 batch) as 22 scheme")
        
        return True
        
    except Exception as e:
        print(f"❌ Error updating data: {e}")
        return False
    finally:
        cursor.close()
        close_connection(connection)

def insert_21_scheme_students(excel_path):
    """Insert 21 scheme students from Excel file"""
    connection = get_db_connection()
    if not connection:
        return False
    
    cursor = connection.cursor()
    
    print("\n" + "="*60)
    print("STEP 3: Inserting 21 scheme students")
    print("="*60)
    
    try:
        # Read Excel file
        df = pd.read_excel(excel_path)
        print(f"📋 Found {len(df)} students in Excel file")
        
        # Clean column names (remove trailing spaces)
        df.columns = df.columns.str.strip()
        
        inserted_count = 0
        skipped_count = 0
        
        for index, row in df.iterrows():
            usn = str(row['USN']).strip()
            name = str(row['Name']).strip()
            discipline = str(row['discipline']).strip()
            batch = int(row['batch'])
            scheme = '21'  # All students in this file are 21 scheme
            
            # Check if student already exists
            cursor.execute("SELECT usn FROM student_details WHERE usn = %s", (usn,))
            if cursor.fetchone():
                print(f"   ⚠️  {usn} - {name} (already exists, skipping)")
                skipped_count += 1
                continue
            
            # Insert student
            insert_query = """
            INSERT INTO student_details 
            (usn, name, batch, discipline, scheme)
            VALUES (%s, %s, %s, %s, %s)
            """
            
            cursor.execute(insert_query, (usn, name, batch, discipline, scheme))
            inserted_count += 1
            print(f"   ✅ {usn} - {name}")
        
        connection.commit()
        
        print(f"\n{'='*60}")
        print(f"✅ Successfully inserted: {inserted_count} students")
        print(f"⚠️  Skipped (already exists): {skipped_count} students")
        print(f"{'='*60}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error inserting students: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        cursor.close()
        close_connection(connection)

def verify_data():
    """Verify the inserted data"""
    connection = get_db_connection()
    if not connection:
        return
    
    cursor = connection.cursor()
    
    print("\n" + "="*60)
    print("VERIFICATION")
    print("="*60)
    
    try:
        # Count students by scheme
        cursor.execute("""
            SELECT scheme, COUNT(*) as count 
            FROM student_details 
            GROUP BY scheme
        """)
        print("\n📊 Students by Scheme:")
        for scheme, count in cursor.fetchall():
            print(f"   Scheme {scheme}: {count} students")
        
        # Count subjects by scheme
        cursor.execute("""
            SELECT scheme, COUNT(*) as count 
            FROM subjects 
            GROUP BY scheme
        """)
        print("\n📚 Subjects by Scheme:")
        for scheme, count in cursor.fetchall():
            print(f"   Scheme {scheme}: {count} subjects")
        
        # Show sample 21 scheme students
        cursor.execute("""
            SELECT usn, name, batch, scheme 
            FROM student_details 
            WHERE scheme = '21' 
            ORDER BY usn 
            LIMIT 10
        """)
        print("\n👥 Sample 21 Scheme Students:")
        for usn, name, batch, scheme in cursor.fetchall():
            print(f"   {usn} - {name} (Batch {batch}, Scheme {scheme})")
        
    except Exception as e:
        print(f"❌ Error during verification: {e}")
    finally:
        cursor.close()
        close_connection(connection)

if __name__ == "__main__":
    print("="*60)
    print("🚀 ADD 21 SCHEME STUDENTS TO DATABASE")
    print("="*60)
    print()
    
    excel_file = r"d:\preetham\scrapper\21_Scheme\21scheme.xlsx"
    
    # Step 1: Add scheme columns
    if not add_scheme_columns():
        print("\n❌ Failed to add columns. Exiting.")
        exit(1)
    
    # Step 2: Mark existing data as 22 scheme
    if not mark_existing_data_as_22_scheme():
        print("\n❌ Failed to update existing data. Exiting.")
        exit(1)
    
    # Step 3: Insert 21 scheme students
    if not insert_21_scheme_students(excel_file):
        print("\n❌ Failed to insert students. Exiting.")
        exit(1)
    
    # Step 4: Verify
    verify_data()
    
    print("\n" + "="*60)
    print("✅ ALL STEPS COMPLETED SUCCESSFULLY!")
    print("="*60)
