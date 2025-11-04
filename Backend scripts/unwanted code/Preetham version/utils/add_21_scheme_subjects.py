"""
Insert 21 Scheme Subjects from Excel
Reads VTU_21Scheme_Subjects.xlsx and inserts all subjects into database
"""

import pandas as pd
from db_config import get_db_connection, close_connection

def insert_21_scheme_subjects(excel_path):
    """Insert 21 scheme subjects from Excel file"""
    connection = get_db_connection()
    if not connection:
        return False
    
    cursor = connection.cursor()
    
    print("="*60)
    print("🚀 INSERTING 21 SCHEME SUBJECTS")
    print("="*60)
    
    try:
        # First, expand subject_code column to handle longer codes
        print("📏 Expanding subject_code column to VARCHAR(50)...")
        cursor.execute("ALTER TABLE subjects MODIFY subject_code VARCHAR(50) NOT NULL")
        connection.commit()
        print("   ✅ Column expanded\n")
        
        # Read Excel file
        df = pd.read_excel(excel_path)
        print(f"📋 Found {len(df)} subjects in Excel file\n")
        
        inserted_count = 0
        skipped_count = 0
        updated_count = 0
        
        for index, row in df.iterrows():
            semester = int(row['Semester'])
            subject_code = str(row['Subject Code']).strip()
            subject_name = str(row['Subject Name']).strip()
            credits = int(row['Credits'])
            short_code = str(row['Shortcode']).strip() if pd.notna(row['Shortcode']) else None
            scheme = '21'
            
            # Check if subject already exists
            cursor.execute("SELECT subject_code, scheme FROM subjects WHERE subject_code = %s", (subject_code,))
            existing = cursor.fetchone()
            
            if existing:
                existing_code, existing_scheme = existing
                if existing_scheme == '21':
                    print(f"   ⚠️  {subject_code} - {subject_name} (already exists)")
                    skipped_count += 1
                else:
                    # Update if scheme is different
                    update_query = """
                    UPDATE subjects 
                    SET subject_name = %s, semester = %s, scheme = %s, credits = %s, short_code = %s
                    WHERE subject_code = %s
                    """
                    cursor.execute(update_query, (subject_name, semester, scheme, credits, short_code, subject_code))
                    updated_count += 1
                    print(f"   🔄 {subject_code} - {subject_name} (updated to 21 scheme)")
                continue
            
            # Insert subject
            insert_query = """
            INSERT INTO subjects 
            (subject_code, subject_name, semester, scheme, credits, short_code)
            VALUES (%s, %s, %s, %s, %s, %s)
            """
            
            cursor.execute(insert_query, (subject_code, subject_name, semester, scheme, credits, short_code))
            inserted_count += 1
            print(f"   ✅ Sem {semester} - {subject_code} - {subject_name} ({credits} credits)")
        
        connection.commit()
        
        print(f"\n{'='*60}")
        print(f"✅ Successfully inserted: {inserted_count} subjects")
        print(f"🔄 Updated: {updated_count} subjects")
        print(f"⚠️  Skipped (already exists): {skipped_count} subjects")
        print(f"{'='*60}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error inserting subjects: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        cursor.close()
        close_connection(connection)

def verify_subjects():
    """Verify the inserted subjects"""
    connection = get_db_connection()
    if not connection:
        return
    
    cursor = connection.cursor()
    
    print("\n" + "="*60)
    print("VERIFICATION")
    print("="*60)
    
    try:
        # Count subjects by scheme
        cursor.execute("""
            SELECT scheme, COUNT(*) as count 
            FROM subjects 
            GROUP BY scheme
            ORDER BY scheme
        """)
        print("\n📚 Subjects by Scheme:")
        for scheme, count in cursor.fetchall():
            print(f"   Scheme {scheme}: {count} subjects")
        
        # Count by semester for 21 scheme
        cursor.execute("""
            SELECT semester, COUNT(*) as count 
            FROM subjects 
            WHERE scheme = '21'
            GROUP BY semester
            ORDER BY semester
        """)
        print("\n📊 21 Scheme Subjects by Semester:")
        for semester, count in cursor.fetchall():
            print(f"   Semester {semester}: {count} subjects")
        
        # Show sample subjects from each semester
        print("\n📖 Sample 21 Scheme Subjects:")
        for sem in [1, 2, 3, 4, 5, 6, 7, 8]:
            cursor.execute("""
                SELECT subject_code, subject_name, credits 
                FROM subjects 
                WHERE scheme = '21' AND semester = %s 
                ORDER BY subject_code 
                LIMIT 3
            """, (sem,))
            results = cursor.fetchall()
            if results:
                print(f"\n   Semester {sem}:")
                for code, name, credits in results:
                    print(f"      {code} - {name} ({credits} credits)")
        
    except Exception as e:
        print(f"❌ Error during verification: {e}")
    finally:
        cursor.close()
        close_connection(connection)

if __name__ == "__main__":
    print("="*60)
    print("🚀 ADD 21 SCHEME SUBJECTS TO DATABASE")
    print("="*60)
    print()
    
    excel_file = r"d:\preetham\scrapper\21_Scheme\VTU_21Scheme_Subjects.xlsx"
    
    # Insert subjects
    if not insert_21_scheme_subjects(excel_file):
        print("\n❌ Failed to insert subjects. Exiting.")
        exit(1)
    
    # Verify
    verify_subjects()
    
    print("\n" + "="*60)
    print("✅ ALL STEPS COMPLETED SUCCESSFULLY!")
    print("="*60)
