import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'Preetham version', 'utils'))

import pandas as pd
from db_config import get_db_connection
from collections import defaultdict

def calculate_sgpa_and_class(results):
    """Calculate SGPA and class grade from results"""
    # Grade points mapping
    grade_points = {
        'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'P': 4, 'F': 0
    }
    
    total_credits = 0
    total_grade_points = 0
    has_fail = False
    
    for result in results:
        credits = result['credits']
        letter_grade = result['letter_grade']
        
        if letter_grade == 'F':
            has_fail = True
        
        if credits > 0 and letter_grade in grade_points:
            total_credits += credits
            total_grade_points += grade_points[letter_grade] * credits
    
    if total_credits == 0:
        return 0.0, 'F'
    
    sgpa = round(total_grade_points / total_credits, 2)
    
    # Determine class grade
    if has_fail or sgpa < 4.0:
        class_grade = 'F'
    elif sgpa >= 7.75:
        class_grade = 'FCD'  # First Class with Distinction
    elif sgpa >= 6.25:
        class_grade = 'FC'   # First Class
    elif sgpa >= 5.0:
        class_grade = 'SC'   # Second Class
    else:
        class_grade = 'P'    # Pass
    
    return sgpa, class_grade

def get_letter_grade(total_marks, max_marks=200):
    """Convert total marks to letter grade"""
    if max_marks == 0 or total_marks is None:
        return 'F'
    
    percentage = (total_marks / max_marks) * 100
    
    if percentage >= 90:
        return 'O'
    elif percentage >= 80:
        return 'A+'
    elif percentage >= 70:
        return 'A'
    elif percentage >= 60:
        return 'B+'
    elif percentage >= 50:
        return 'B'
    elif percentage >= 40:
        return 'C'
    elif percentage >= 35:
        return 'P'
    else:
        return 'F'

def export_semester_results_excel(semester, output_file):
    """
    Export results for a specific semester to Excel
    Format: USN | Name | Subject1_Code | Subject1_Name | Subject1_Int | Subject1_Ext | Subject1_Total | Subject1_Grade | ... | SGPA | Class
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # Get all students for this semester
    query = """
        SELECT DISTINCT sd.usn, sd.name
        FROM student_details sd
        JOIN results r ON sd.usn = r.student_usn
        WHERE r.semester = %s
        ORDER BY sd.usn
    """
    cursor.execute(query, (semester,))
    students = cursor.fetchall()
    
    print(f"Found {len(students)} students for Semester {semester}")
    
    # Prepare data for Excel
    excel_data = []
    
    for student in students:
        usn = student['usn']
        name = student['name']
        
        # Get all subjects for this student in this semester
        query = """
            SELECT 
                r.subject_code,
                s.subject_name,
                s.credits,
                r.internal_marks,
                r.external_marks,
                r.total_marks,
                r.result_status
            FROM results r
            JOIN subjects s ON r.subject_code = s.subject_code
            WHERE r.student_usn = %s AND r.semester = %s
            ORDER BY r.subject_code
        """
        cursor.execute(query, (usn, semester))
        subject_results = cursor.fetchall()
        
        # Build row data
        row = {
            'USN': usn,
            'Name': name
        }
        
        # Store results for SGPA calculation
        results_for_sgpa = []
        
        # Add each subject's data
        for idx, result in enumerate(subject_results, 1):
            subject_code = result['subject_code']
            subject_name = result['subject_name']
            internal = result['internal_marks'] if result['internal_marks'] is not None else 0
            external = result['external_marks'] if result['external_marks'] is not None else 0
            total = result['total_marks'] if result['total_marks'] is not None else 0
            credits = result['credits'] if result['credits'] is not None else 0
            
            # All subjects are 100 marks (50+50) except one 200-mark subject in Sem 8
            # For 200-mark subject, total will be > 100
            if total > 100:
                max_marks = 200
            else:
                max_marks = 100
            
            letter_grade = get_letter_grade(total, max_marks)
            
            # Add to row
            row[f'Subject{idx}_Code'] = subject_code
            row[f'Subject{idx}_Name'] = subject_name
            row[f'Subject{idx}_Internal'] = internal
            row[f'Subject{idx}_External'] = external
            row[f'Subject{idx}_Total'] = total
            row[f'Subject{idx}_Grade'] = letter_grade
            
            # Store for SGPA calculation
            results_for_sgpa.append({
                'credits': credits,
                'letter_grade': letter_grade
            })
        
        # Calculate SGPA and Class Grade
        sgpa, class_grade = calculate_sgpa_and_class(results_for_sgpa)
        row['SGPA'] = sgpa
        row['Class'] = class_grade
        
        excel_data.append(row)
    
    # Create DataFrame
    df = pd.DataFrame(excel_data)
    
    # Save to Excel
    df.to_excel(output_file, index=False, sheet_name=f'Semester {semester}')
    print(f"✅ Excel file created: {output_file}")
    print(f"   Total students: {len(excel_data)}")
    print(f"   Total columns: {len(df.columns)}")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    semester = int(input("Enter semester number (1-8): "))
    output_file = f"Semester_{semester}_Results.xlsx"
    
    export_semester_results_excel(semester, output_file)
