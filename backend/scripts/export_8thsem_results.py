"""
EXPORT 8TH SEM RESULTS TO EXCEL
================================

Exports all 8th semester results in the specified format:
USN, Name, Subject1_Code, Subject1_Name, Subject1_Internal, Subject1_External, 
Subject1_Total, Subject1_Grade, ... (for all subjects), SGPA, Class, Total

Usage:
python export_8thsem_results.py --output "8thsem_results.xlsx" --batch 2021
"""

import pandas as pd
import argparse
from db_config import get_db_connection, close_connection

def export_8th_sem_results(output_file, batch=2021, semester=8):
    """Export 8th semester results to Excel in specified format."""
    
    print(f"📊 Exporting {semester}th semester results for batch {batch}...")
    
    connection = get_db_connection()
    if not connection:
        print("❌ Database connection failed")
        return
    
    cursor = connection.cursor(dictionary=True)
    
    # Get all students with their results
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
    LEFT JOIN results r ON s.usn = r.student_usn AND r.semester = %s
    WHERE s.batch = %s
    ORDER BY s.section, s.usn, r.subject_code
    """
    
    cursor.execute(query, (semester, batch))
    results = cursor.fetchall()
    
    cursor.close()
    close_connection(connection)
    
    if not results:
        print("⚠️ No results found!")
        return
    
    print(f"✅ Found results for students")
    
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
                'Class': row['result'] or ''
            }
        
        if row['subject_code']:
            student_data[usn]['subjects'].append({
                'code': row['subject_code'],
                'name': row['subject_name'],
                'internal': row['internal_marks'] or 0,
                'external': row['external_marks'] or 0,
                'total': row['total_marks'] or 0,
                'grade': row['grade'] or ''
            })
    
    # Build Excel data
    excel_rows = []
    
    for usn in sorted(student_data.keys()):
        data = student_data[usn]
        row = {
            'USN': data['USN'],
            'Name': data['Name']
        }
        
        # Add each subject
        for i, subject in enumerate(data['subjects'], 1):
            row[f'Subject{i}_Code'] = subject['code']
            row[f'Subject{i}_Name'] = subject['name']
            row[f'Subject{i}_Internal'] = subject['internal']
            row[f'Subject{i}_External'] = subject['external']
            row[f'Subject{i}_Total'] = subject['total']
            row[f'Subject{i}_Grade'] = subject['grade']
        
        # Add summary
        total_marks = sum(s['total'] for s in data['subjects'])
        row['SGPA'] = data['SGPA']
        row['Class'] = data['Class']
        row['Total'] = total_marks
        
        excel_rows.append(row)
    
    # Create DataFrame
    df = pd.DataFrame(excel_rows)
    
    # Export to Excel
    df.to_excel(output_file, index=False, engine='openpyxl')
    
    print(f"\n{'='*60}")
    print(f"✅ EXPORT COMPLETED!")
    print(f"   File: {output_file}")
    print(f"   Students: {len(excel_rows)}")
    print(f"{'='*60}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', default='8thsem_results.xlsx', help='Output Excel file')
    parser.add_argument('--batch', type=int, default=2021, help='Batch year')
    parser.add_argument('--semester', type=int, default=8, help='Semester number')
    args = parser.parse_args()
    
    export_8th_sem_results(args.output, args.batch, args.semester)
