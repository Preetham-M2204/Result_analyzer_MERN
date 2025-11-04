"""
SIMPLE Semester 8 Excel Export - 21 Scheme ONLY
Format: USN | Name | Sub1_Code | Sub1_Name | Sub1_Internal | Sub1_External | Sub1_Total | Sub1_Grade | ... | Overall% | Class
"""

import pandas as pd
from db_config import get_db_connection, close_connection

def get_letter_grade(total):
    """Convert total marks to letter grade"""
    if total >= 90: return 'O'
    elif total >= 80: return 'A+'
    elif total >= 70: return 'A'
    elif total >= 60: return 'B+'
    elif total >= 55: return 'B'
    elif total >= 50: return 'C'
    elif total >= 40: return 'P'
    else: return 'F'

def get_class_grade(percentage):
    """Get class grade: FCD/FC/SC/P"""
    if percentage >= 70: return 'FCD'
    elif percentage >= 60: return 'FC'
    elif percentage >= 50: return 'SC'
    elif percentage >= 40: return 'P'
    else: return 'F'

def main():
    print("="*60)
    print("SEMESTER 8 - 21 SCHEME - EXCEL EXPORT")
    print("="*60)
    
    conn = get_db_connection()
    if not conn:
        print("ERROR: Cannot connect to database")
        return
    
    cursor = conn.cursor()
    
    # Get Semester 8 results for scheme='21' students
    query = """
    SELECT 
        sd.usn,
        sd.name,
        r.subject_code,
        COALESCE(es.subject_name, s.subject_name, 'Unknown') as subject_name,
        r.internal_marks,
        r.external_marks,
        r.total_marks
    FROM student_details sd
    LEFT JOIN results r ON sd.usn = r.student_usn AND r.semester = 8
    LEFT JOIN subjects s ON r.subject_code = s.subject_code
    LEFT JOIN elective_subjects es ON r.subject_code = es.subject_code
    WHERE sd.scheme = '21'
    ORDER BY sd.usn, r.subject_code
    """
    
    cursor.execute(query)
    results = cursor.fetchall()
    cursor.close()
    close_connection(conn)
    
    print(f"✅ Fetched {len(results)} records")
    
    # Group by student
    students = {}
    for usn, name, sub_code, sub_name, internal, external, total in results:
        if usn not in students:
            students[usn] = {'name': name, 'subjects': []}
        
        if sub_code:  # Has subject data
            students[usn]['subjects'].append({
                'code': sub_code,
                'name': sub_name,
                'internal': internal,
                'external': external,
                'total': total,
                'grade': get_letter_grade(total)
            })
    
    print(f"✅ Found {len(students)} students")
    
    # Create Excel rows
    rows = []
    for usn in sorted(students.keys()):
        data = students[usn]
        row = {'USN': usn, 'Name': data['name']}
        
        # Add each subject
        for i, sub in enumerate(data['subjects'], 1):
            row[f'Sub{i}_Code'] = sub['code']
            row[f'Sub{i}_Name'] = sub['name']
            row[f'Sub{i}_Internal'] = sub['internal']
            row[f'Sub{i}_External'] = sub['external']
            row[f'Sub{i}_Total'] = sub['total']
            row[f'Sub{i}_Grade'] = sub['grade']
        
        # Calculate overall
        if data['subjects']:
            total_marks = sum(s['total'] for s in data['subjects'])
            num_subjects = len(data['subjects'])
            percentage = (total_marks / (num_subjects * 100)) * 100
            row['Overall_Percentage'] = round(percentage, 2)
            row['Class'] = get_class_grade(percentage)
        else:
            row['Overall_Percentage'] = 0
            row['Class'] = 'N/A'
        
        rows.append(row)
    
    # Create DataFrame and save
    df = pd.DataFrame(rows)
    output_file = 'Sem8_21Scheme_Results.xlsx'
    df.to_excel(output_file, index=False, sheet_name='Semester 8')
    
    print(f"\n✅ Excel created: {output_file}")
    print(f"   Students: {len(rows)}")
    print(f"   Columns: {len(df.columns)}")
    
    # Show class distribution
    if rows:
        class_dist = df['Class'].value_counts()
        print("\n📊 Class Distribution:")
        for cls, count in class_dist.items():
            print(f"   {cls}: {count}")
    
    print("="*60)

if __name__ == '__main__':
    main()
