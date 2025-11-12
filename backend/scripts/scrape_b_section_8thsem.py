"""
DIRECT RUN: 8th Semester B Section Only
========================================

This script uses YOUR ultimate_scraper.py to scrape ONLY B section students.

Steps:
1. Put your Excel file here with student data
2. Run this script
3. Get results exported to Excel

Usage:
python scrape_b_section_8thsem.py --excel "8thsem_students.xlsx" --url "https://results.vtu.ac.in/..." --output "8thsem_results.xlsx"
"""

import pandas as pd
import sys
import os
import argparse
from db_config import get_db_connection, close_connection

# Import your ultimate_scraper
from ultimate_scraper import scrape_with_smart_retry

def main():
    parser = argparse.ArgumentParser(description='Scrape 8th sem for B section only')
    parser.add_argument('--excel', required=True, help='Excel file with students')
    parser.add_argument('--url', required=True, help='VTU results URL')
    parser.add_argument('--output', default='8thsem_results.xlsx', help='Output Excel file')
    
    args = parser.parse_args()
    
    print("="*60)
    print("8TH SEM B SECTION SCRAPER")
    print("="*60)
    
    # Step 1: Read Excel and update students
    print("\n📖 Step 1: Reading students from Excel...")
    df = pd.read_excel(args.excel)
    print(f"✅ Found {len(df)} students")
    
    # Update database
    print("\n💾 Step 2: Updating students in database...")
    connection = get_db_connection()
    cursor = connection.cursor()
    
    for _, row in df.iterrows():
        usn = row['USN'].strip()
        name = row['NAME'].strip()
        section = row['Section'].strip()
        discipline = row['Discipline'].strip()
        batch = int(row['BATCH'])
        
        cursor.execute("SELECT usn FROM student_details WHERE usn = %s", (usn,))
        exists = cursor.fetchone()
        
        if exists:
            cursor.execute("UPDATE student_details SET name=%s, section=%s, discipline=%s, batch=%s WHERE usn=%s",
                         (name, section, discipline, batch, usn))
        else:
            cursor.execute("INSERT INTO student_details (usn, name, section, discipline, batch) VALUES (%s,%s,%s,%s,%s)",
                         (usn, name, section, discipline, batch))
    
    connection.commit()
    cursor.close()
    close_connection(connection)
    print("✅ Students updated!")
    
    # Step 3: Get B section USNs
    print("\n🔍 Step 3: Getting B section students...")
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute("SELECT usn FROM student_details WHERE batch=2021 AND section='B' ORDER BY usn")
    b_section_usns = [row[0] for row in cursor.fetchall()]
    cursor.close()
    close_connection(connection)
    
    print(f"✅ Found {len(b_section_usns)} B section students")
    
    # Step 4: Scrape using YOUR ultimate_scraper
    print("\n🌐 Step 4: Scraping 8th semester results...")
    print(f"URL: {args.url}")
    print(f"🔄 Processing {len(b_section_usns)} students...")
    print(f"📋 USNs: {', '.join(b_section_usns[:5])}..." if len(b_section_usns) > 5 else f"📋 USNs: {', '.join(b_section_usns)}")
    print("⏳ This may take 10-15 minutes... Please wait...")
    scrape_with_smart_retry(b_section_usns, args.url, expected_semester=8, max_workers=5)
    print("✅ Scraping done!")
    
    # Step 5: Export to Excel
    print("\n📊 Step 5: Exporting to Excel...")
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    
    query = """
    SELECT s.usn, s.name, r.subject_code, sub.subject_name, 
           r.internal_marks, r.external_marks, r.total_marks, r.letter_grade,
           ss.sgpa, ss.class_grade
    FROM student_details s
    LEFT JOIN results r ON s.usn = r.student_usn AND r.semester = 8
    LEFT JOIN subjects sub ON r.subject_code = sub.subject_code
    LEFT JOIN student_semester_summary ss ON s.usn = ss.student_usn AND ss.semester = 8
    WHERE s.batch = 2021
    ORDER BY s.section, s.usn, r.subject_code
    """
    
    cursor.execute(query)
    results = cursor.fetchall()
    cursor.close()
    close_connection(connection)
    
    # Group by USN
    student_data = {}
    for row in results:
        usn = row['usn']
        if usn not in student_data:
            student_data[usn] = {
                'USN': usn, 
                'Name': row['name'],
                'subjects': [],
                'SGPA': row['sgpa'] or '',
                'Class': row['class_grade'] or ''
            }
        
        if row['subject_code']:
            student_data[usn]['subjects'].append({
                'code': row['subject_code'],
                'name': row['subject_name'],
                'internal': row['internal_marks'] or 0,
                'external': row['external_marks'] or 0,
                'total': row['total_marks'] or 0,
                'grade': row['letter_grade'] or ''
            })
    
    # Build Excel rows
    excel_rows = []
    for usn in sorted(student_data.keys()):
        data = student_data[usn]
        row = {'USN': data['USN'], 'Name': data['Name']}
        
        for i, subject in enumerate(data['subjects'], 1):
            row[f'Subject{i}_Code'] = subject['code']
            row[f'Subject{i}_Name'] = subject['name']
            row[f'Subject{i}_Internal'] = subject['internal']
            row[f'Subject{i}_External'] = subject['external']
            row[f'Subject{i}_Total'] = subject['total']
            row[f'Subject{i}_Grade'] = subject['grade']
        
        total = sum(s['total'] for s in data['subjects'])
        row['SGPA'] = data['SGPA']
        row['Class'] = data['Class']
        row['Total'] = total
        
        excel_rows.append(row)
    
    df = pd.DataFrame(excel_rows)
    df.to_excel(args.output, index=False, engine='openpyxl')
    
    print(f"✅ Exported to {args.output}")
    print(f"   Students: {len(excel_rows)}")
    print("\n" + "="*60)
    print("✅ ALL DONE!")
    print("="*60)

if __name__ == "__main__":
    main()
