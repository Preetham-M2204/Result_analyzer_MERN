"""
UPDATE 2021 BATCH STUDENTS & SCRAPE 8TH SEM RESULTS
====================================================

This script:
1. Reads 2021 batch students from Excel file (8th sem data)
2. Updates/inserts students with Section='A' and Discipline='VTU', Batch=2021
3. Identifies B section students
4. Scrapes 8th semester results for B section students
5. Exports all results to Excel in specified format

Usage:
python update_2021_batch_and_scrape.py --excel "8thsem_data.xlsx" --url "https://results.vtu.ac.in/..." --output "8thsem_results.xlsx"
"""

import pandas as pd
import sys
import argparse
from datetime import datetime
from db_config import get_db_connection, close_connection
import os

# Add scripts directory to path for importing scrapers
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ultimate_scraper import scrape_with_smart_retry

def read_students_from_excel(excel_file):
    """Read students data from Excel file."""
    try:
        df = pd.read_excel(excel_file)
        print(f"✅ Read {len(df)} students from Excel file")
        return df
    except Exception as e:
        print(f"❌ Error reading Excel file: {e}")
        sys.exit(1)

def update_students_in_database(students_df):
    """Update/insert students into database with Section A."""
    connection = get_db_connection()
    if not connection:
        print("❌ Failed to connect to database")
        sys.exit(1)
    
    cursor = connection.cursor()
    
    inserted = 0
    updated = 0
    errors = 0
    
    for _, row in students_df.iterrows():
        usn = row['USN']
        name = row['NAME']
        section = row['Section']
        discipline = row['Discipline']
        batch = row['BATCH']
        
        try:
            # Check if student exists
            cursor.execute("SELECT usn, section FROM students WHERE usn = %s", (usn,))
            existing = cursor.fetchone()
            
            if existing:
                # Update existing student
                update_query = """
                UPDATE students 
                SET name = %s, section = %s, discipline = %s, batch = %s
                WHERE usn = %s
                """
                cursor.execute(update_query, (name, section, discipline, batch, usn))
                updated += 1
                print(f"  Updated: {usn} - {name} (Section {section})")
            else:
                # Insert new student
                insert_query = """
                INSERT INTO students (usn, name, section, discipline, batch)
                VALUES (%s, %s, %s, %s, %s)
                """
                cursor.execute(insert_query, (usn, name, section, discipline, batch))
                inserted += 1
                print(f"  Inserted: {usn} - {name} (Section {section})")
                
        except Exception as e:
            errors += 1
            print(f"  ❌ Error processing {usn}: {e}")
    
    connection.commit()
    cursor.close()
    close_connection(connection)
    
    print(f"\n✅ Database update complete:")
    print(f"   Inserted: {inserted}")
    print(f"   Updated: {updated}")
    print(f"   Errors: {errors}")
    
    return inserted, updated, errors

def get_b_section_students():
    """Get all B section students from 2021 batch."""
    connection = get_db_connection()
    if not connection:
        return []
    
    cursor = connection.cursor()
    query = """
    SELECT usn, name 
    FROM students 
    WHERE batch = 2021 AND section = 'B'
    ORDER BY usn
    """
    
    cursor.execute(query)
    students = cursor.fetchall()
    
    cursor.close()
    close_connection(connection)
    
    return [row[0] for row in students]

def scrape_b_section_results(url, b_section_usns):
    """Scrape 8th semester results for B section students."""
    if not b_section_usns:
        print("⚠️ No B section students found to scrape")
        return
    
    print(f"\n🔍 Scraping 8th semester results for {len(b_section_usns)} B section students...")
    print(f"URL: {url}")
    
    # Use the ultimate_scraper with smart retry
    scrape_with_smart_retry(b_section_usns, url, expected_semester=8, max_workers=5)
    
    print("✅ Scraping complete!")

def export_results_to_excel(output_file, batch=2021):
    """
    Export all 8th semester results to Excel in specified format.
    
    Format:
    USN, Name, Subject1_Code, Subject1_Name, Subject1_Internal, Subject1_External, 
    Subject1_Total, Subject1_Grade, ... (for all subjects), SGPA, Class, Total
    """
    connection = get_db_connection()
    if not connection:
        print("❌ Failed to connect to database")
        return
    
    cursor = connection.cursor(dictionary=True)
    
    # Get all students from 2021 batch with their 8th semester results
    query = """
    SELECT 
        s.usn,
        s.name,
        s.section,
        r.subject_code,
        r.subject_name,
        r.internal_marks,
        r.external_marks,
        r.total_marks,
        r.grade,
        r.sgpa,
        r.result
    FROM students s
    LEFT JOIN results r ON s.usn = r.student_usn AND r.semester = 8
    WHERE s.batch = %s
    ORDER BY s.usn, r.subject_code
    """
    
    cursor.execute(query, (batch,))
    results = cursor.fetchall()
    
    cursor.close()
    close_connection(connection)
    
    if not results:
        print("⚠️ No results found to export")
        return
    
    # Group results by USN
    student_results = {}
    for row in results:
        usn = row['usn']
        if usn not in student_results:
            student_results[usn] = {
                'USN': usn,
                'Name': row['name'],
                'subjects': [],
                'SGPA': row['sgpa'],
                'Class': row['result']
            }
        
        if row['subject_code']:  # Only add if there are results
            student_results[usn]['subjects'].append({
                'code': row['subject_code'],
                'name': row['subject_name'],
                'internal': row['internal_marks'],
                'external': row['external_marks'],
                'total': row['total_marks'],
                'grade': row['grade']
            })
    
    # Convert to DataFrame format
    export_data = []
    for usn, data in student_results.items():
        row_data = {
            'USN': data['USN'],
            'Name': data['Name']
        }
        
        # Add subjects (up to 10 subjects, expandable)
        for i, subject in enumerate(data['subjects'], 1):
            row_data[f'Subject{i}_Code'] = subject['code']
            row_data[f'Subject{i}_Name'] = subject['name']
            row_data[f'Subject{i}_Internal'] = subject['internal']
            row_data[f'Subject{i}_External'] = subject['external']
            row_data[f'Subject{i}_Total'] = subject['total']
            row_data[f'Subject{i}_Grade'] = subject['grade']
        
        # Calculate total marks
        total_marks = sum(s['total'] for s in data['subjects'] if s['total'])
        
        row_data['SGPA'] = data['SGPA']
        row_data['Class'] = data['Class']
        row_data['Total'] = total_marks
        
        export_data.append(row_data)
    
    # Create DataFrame and export
    df = pd.DataFrame(export_data)
    
    # Reorder columns to match specified format
    base_cols = ['USN', 'Name']
    subject_cols = []
    
    # Find max number of subjects
    max_subjects = 0
    for col in df.columns:
        if col.startswith('Subject') and '_Code' in col:
            subject_num = int(col.split('Subject')[1].split('_')[0])
            max_subjects = max(max_subjects, subject_num)
    
    # Build subject columns
    for i in range(1, max_subjects + 1):
        subject_cols.extend([
            f'Subject{i}_Code',
            f'Subject{i}_Name',
            f'Subject{i}_Internal',
            f'Subject{i}_External',
            f'Subject{i}_Total',
            f'Subject{i}_Grade'
        ])
    
    end_cols = ['SGPA', 'Class', 'Total']
    
    # Reorder with only existing columns
    ordered_cols = base_cols + [col for col in subject_cols if col in df.columns] + end_cols
    df = df[ordered_cols]
    
    # Export to Excel
    df.to_excel(output_file, index=False, engine='openpyxl')
    print(f"✅ Results exported to {output_file}")
    print(f"   Total students: {len(df)}")

def main():
    parser = argparse.ArgumentParser(description='Update 2021 batch students and scrape 8th sem results')
    parser.add_argument('--excel', required=True, help='Input Excel file with student data')
    parser.add_argument('--url', required=True, help='VTU results URL for 8th semester')
    parser.add_argument('--output', default='8thsem_results.xlsx', help='Output Excel file')
    parser.add_argument('--skip-scrape', action='store_true', help='Skip scraping, only update and export')
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("2021 BATCH UPDATE & 8TH SEM SCRAPER")
    print("=" * 60)
    
    # Step 1: Read students from Excel
    print("\n📖 Step 1: Reading students from Excel...")
    students_df = read_students_from_excel(args.excel)
    
    # Step 2: Update database
    print("\n💾 Step 2: Updating students in database...")
    update_students_in_database(students_df)
    
    # Step 3: Get B section students
    print("\n🔍 Step 3: Identifying B section students...")
    b_section_usns = get_b_section_students()
    print(f"   Found {len(b_section_usns)} B section students")
    
    # Step 4: Scrape results (optional)
    if not args.skip_scrape:
        print("\n🌐 Step 4: Scraping 8th semester results for B section...")
        scrape_b_section_results(args.url, b_section_usns)
    else:
        print("\n⏭️  Step 4: Skipping scraping (--skip-scrape flag set)")
    
    # Step 5: Export to Excel
    print("\n📊 Step 5: Exporting results to Excel...")
    export_results_to_excel(args.output)
    
    print("\n" + "=" * 60)
    print("✅ ALL TASKS COMPLETED!")
    print("=" * 60)

if __name__ == "__main__":
    main()
