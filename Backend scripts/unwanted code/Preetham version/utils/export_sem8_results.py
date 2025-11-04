"""
Export Semester 4-8 Results to Excel with Grades
Generates detailed spreadsheet with:
- Each semester in separate sheet (Sem 4, 5, 6, 7, 8)
- USN, Name
- Subject-wise: Code, Name, Internal, External, Total, Letter Grade
- Overall Class Grade (FCD/FC/SC/P)
"""

import pandas as pd
from db_config import get_db_connection, close_connection
from datetime import datetime

# ==================== GRADING FUNCTIONS ====================

def get_letter_grade(percentage):
    """
    Convert percentage to letter grade based on VTU 10-point scale.
    
    O: 90-100  (Outstanding)
    A+: 80-89  (Excellent)
    A: 70-79   (Very Good)
    B+: 60-69  (Good)
    B: 55-59   (Above Average)
    C: 50-54   (Average)
    P: 40-49   (Pass)
    F: 0-39    (Fail)
    """
    if percentage >= 90:
        return 'O'
    elif percentage >= 80:
        return 'A+'
    elif percentage >= 70:
        return 'A'
    elif percentage >= 60:
        return 'B+'
    elif percentage >= 55:
        return 'B'
    elif percentage >= 50:
        return 'C'
    elif percentage >= 40:
        return 'P'
    else:
        return 'F'

def get_grade_point(letter_grade):
    """Convert letter grade to grade point (10-point scale)."""
    grade_points = {
        'O': 10, 'A+': 9, 'A': 8, 'B+': 7,
        'B': 6, 'C': 5, 'P': 4, 'F': 0
    }
    return grade_points.get(letter_grade, 0)

def calculate_percentage_from_marks(total_marks, max_marks=100):
    """Calculate percentage from total marks."""
    return (total_marks / max_marks) * 100

def get_class_grade(overall_percentage):
    """
    Determine class grade based on VTU Class Equivalence system.
    
    FCD (First Class with Distinction): M ≥ 70%
    FC (First Class): 60% ≤ M < 70%
    SC (Second Class): 50% ≤ M < 60%
    P (Pass Class): 40% ≤ M ≤ 50%
    F (Fail): M < 40%
    """
    if overall_percentage >= 70:
        return 'FCD'  # First Class with Distinction
    elif overall_percentage >= 60:
        return 'FC'   # First Class
    elif overall_percentage >= 50:
        return 'SC'   # Second Class
    elif overall_percentage >= 40:
        return 'P'    # Pass Class
    else:
        return 'F'    # Fail

# ==================== DATA EXTRACTION ====================

def get_semester_results(semester, usn_pattern='1BI21IS%'):
    """
    Fetch results for a specific semester for students matching pattern.
    Returns structured data for Excel export.
    """
    connection = get_db_connection()
    if not connection:
        return None
    
    cursor = connection.cursor()
    
    # Get all students and their results for specified semester
    query = """
    SELECT 
        sd.usn,
        sd.name,
        r.subject_code,
        COALESCE(es.subject_name, s.subject_name, 'Unknown Subject') as subject_name,
        r.internal_marks,
        r.external_marks,
        r.total_marks,
        r.result_status
    FROM student_details sd
    LEFT JOIN results r ON sd.usn = r.student_usn AND r.semester = %s
    LEFT JOIN subjects s ON r.subject_code = s.subject_code
    LEFT JOIN elective_subjects es ON r.subject_code = es.subject_code
    WHERE sd.usn LIKE %s
    ORDER BY sd.usn, r.subject_code
    """
    
    cursor.execute(query, (semester, usn_pattern))
    results = cursor.fetchall()
    
    cursor.close()
    close_connection(connection)
    
    return results

def structure_data_for_excel(raw_results):
    """
    Structure raw results into Excel-friendly format.
    One row per student with columns for each subject.
    """
    students_data = {}
    
    for row in raw_results:
        usn, name, sub_code, sub_name, internal, external, total, status = row
        
        if usn not in students_data:
            students_data[usn] = {
                'USN': usn,
                'Name': name,
                'subjects': []
            }
        
        if sub_code:  # Has results
            percentage = calculate_percentage_from_marks(total)
            letter_grade = get_letter_grade(percentage)
            
            students_data[usn]['subjects'].append({
                'Subject Code': sub_code,
                'Subject Name': sub_name,
                'Internal': internal,
                'External': external,
                'Total': total,
                'Letter Grade': letter_grade,
                'Status': status
            })
    
    return students_data

def create_wide_format_excel(students_data, output_file):
    """
    Create Excel with WIDE format (one row per student, all subjects as columns).
    
    Columns: USN | Name | Sub1_Code | Sub1_Name | Sub1_Int | Sub1_Ext | Sub1_Total | Sub1_Grade | Sub2_Code | ... | Overall% | Class
    """
    rows = []
    
    for usn, data in sorted(students_data.items()):
        row = {
            'USN': data['USN'],
            'Name': data['Name']
        }
        
        # Add each subject's data
        total_marks = 0
        total_subjects = len(data['subjects'])
        
        for i, subject in enumerate(data['subjects'], 1):
            prefix = f'Subject_{i}'
            row[f'{prefix}_Code'] = subject['Subject Code']
            row[f'{prefix}_Name'] = subject['Subject Name']
            row[f'{prefix}_Internal'] = subject['Internal']
            row[f'{prefix}_External'] = subject['External']
            row[f'{prefix}_Total'] = subject['Total']
            row[f'{prefix}_Letter_Grade'] = subject['Letter Grade']
            
            total_marks += subject['Total']
        
        # Calculate overall percentage and class grade
        if total_subjects > 0:
            overall_percentage = (total_marks / (total_subjects * 100)) * 100
            row['Overall_Percentage'] = round(overall_percentage, 2)
            row['Class_Grade'] = get_class_grade(overall_percentage)
        else:
            row['Overall_Percentage'] = 0
            row['Class_Grade'] = 'N/A'
        
        rows.append(row)
    
    df = pd.DataFrame(rows)
    df.to_excel(output_file, index=False, sheet_name='Semester 8 Results')
    
    return df

def create_long_format_excel(students_data, output_file):
    """
    Create Excel with LONG format (multiple rows per student, one row per subject).
    Better for detailed view and filtering.
    
    Columns: USN | Name | Subject_Code | Subject_Name | Internal | External | Total | Letter_Grade
    """
    rows = []
    
    for usn, data in sorted(students_data.items()):
        if not data['subjects']:
            # Student with no results
            rows.append({
                'USN': data['USN'],
                'Name': data['Name'],
                'Subject_Code': 'N/A',
                'Subject_Name': 'No Results',
                'Internal': 0,
                'External': 0,
                'Total': 0,
                'Letter_Grade': 'N/A'
            })
        else:
            for subject in data['subjects']:
                rows.append({
                    'USN': data['USN'],
                    'Name': data['Name'],
                    'Subject_Code': subject['Subject Code'],
                    'Subject_Name': subject['Subject Name'],
                    'Internal': subject['Internal'],
                    'External': subject['External'],
                    'Total': subject['Total'],
                    'Letter_Grade': subject['Letter Grade']
                })
    
    df = pd.DataFrame(rows)
    
    # Create Excel with formatting
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Subject-wise Results')
        
        # Create summary sheet
        summary_data = []
        for usn, data in sorted(students_data.items()):
            if data['subjects']:
                total_marks = sum(s['Total'] for s in data['subjects'])
                total_subjects = len(data['subjects'])
                overall_percentage = (total_marks / (total_subjects * 100)) * 100
                
                summary_data.append({
                    'USN': data['USN'],
                    'Name': data['Name'],
                    'Subjects_Taken': total_subjects,
                    'Total_Marks': total_marks,
                    'Overall_Percentage': round(overall_percentage, 2),
                    'Class_Grade': get_class_grade(overall_percentage)
                })
        
        summary_df = pd.DataFrame(summary_data)
        summary_df.to_excel(writer, index=False, sheet_name='Summary')
    
    return df

def create_comprehensive_excel(usn_pattern='1BI21IS%', output_file=None, semesters=[4, 5, 6, 7, 8]):
    """
    Create comprehensive Excel with multiple sheets for Semesters 4-8:
    - Each semester gets its own sheet with subject-wise details
    - Summary sheet with overall statistics
    - Grade Distribution sheet
    """
    if output_file is None:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_file = f'Semester_4_to_8_Results_{timestamp}.xlsx'
    
    print("="*60)
    print("📊 EXPORTING SEMESTER 4-8 RESULTS TO EXCEL")
    print("="*60)
    print(f"Pattern: {usn_pattern}")
    print(f"Semesters: {', '.join(map(str, semesters))}")
    print(f"Output: {output_file}")
    print()
    
    # Create Excel with multiple sheets
    print("✅ Creating Excel file with multiple sheets...")
    
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        all_summary_data = []
        
        # Process each semester
        for semester in semesters:
            print(f"\n📚 Processing Semester {semester}...")
            
            # Fetch data for this semester
            raw_results = get_semester_results(semester, usn_pattern)
            
            if not raw_results:
                print(f"   ⚠️  No results found for Semester {semester}")
                continue
            
            # Structure data
            students_data = structure_data_for_excel(raw_results)
            print(f"   ✅ Found results for {len(students_data)} students")
            
            # Create subject-wise sheet for this semester
            subject_rows = []
            for usn, data in sorted(students_data.items()):
                if data['subjects']:
                    for subject in data['subjects']:
                        subject_rows.append({
                            'USN': data['USN'],
                            'Name': data['Name'],
                            'Subject_Code': subject['Subject Code'],
                            'Subject_Name': subject['Subject Name'],
                            'Internal': subject['Internal'],
                            'External': subject['External'],
                            'Total': subject['Total'],
                            'Letter_Grade': subject['Letter Grade']
                        })
                else:
                    # Student with no results for this semester
                    subject_rows.append({
                        'USN': data['USN'],
                        'Name': data['Name'],
                        'Subject_Code': 'N/A',
                        'Subject_Name': 'No Results',
                        'Internal': 0,
                        'External': 0,
                        'Total': 0,
                        'Letter_Grade': 'N/A'
                    })
            
            df_subjects = pd.DataFrame(subject_rows)
            sheet_name = f'Sem {semester}'
            df_subjects.to_excel(writer, index=False, sheet_name=sheet_name)
            print(f"   ✅ Created sheet: '{sheet_name}' with {len(subject_rows)} records")
            
            # Collect summary data for this semester
            for usn, data in sorted(students_data.items()):
                if data['subjects']:
                    total_marks = sum(s['Total'] for s in data['subjects'])
                    total_subjects = len(data['subjects'])
                    overall_percentage = (total_marks / (total_subjects * 100)) * 100
                    
                    all_summary_data.append({
                        'Semester': semester,
                        'USN': data['USN'],
                        'Name': data['Name'],
                        'Subjects_Taken': total_subjects,
                        'Total_Marks': total_marks,
                        'Max_Marks': total_subjects * 100,
                        'Overall_Percentage': round(overall_percentage, 2),
                        'Class_Grade': get_class_grade(overall_percentage)
                    })
        
        # Create Overall Summary sheet
        if all_summary_data:
            print(f"\n📊 Creating Overall Summary sheet...")
            df_summary = pd.DataFrame(all_summary_data)
            df_summary.to_excel(writer, index=False, sheet_name='Overall Summary')
            print(f"   ✅ Summary sheet created with {len(all_summary_data)} records")
            
            # Create Grade Distribution sheet
            print(f"📊 Creating Grade Distribution sheet...")
            grade_dist_rows = []
            
            for semester in semesters:
                sem_data = df_summary[df_summary['Semester'] == semester]
                if not sem_data.empty:
                    grade_counts = sem_data['Class_Grade'].value_counts()
                    for grade in ['FCD', 'FC', 'SC', 'P', 'F']:
                        grade_dist_rows.append({
                            'Semester': semester,
                            'Class_Grade': grade,
                            'Count': grade_counts.get(grade, 0)
                        })
            
            df_grade_dist = pd.DataFrame(grade_dist_rows)
            df_grade_dist.to_excel(writer, index=False, sheet_name='Grade Distribution')
            print(f"   ✅ Grade Distribution sheet created")
    
    print(f"\n{'='*60}")
    print("📊 EXPORT SUMMARY")
    print("="*60)
    
    if all_summary_data:
        df_summary = pd.DataFrame(all_summary_data)
        
        for semester in semesters:
            sem_data = df_summary[df_summary['Semester'] == semester]
            if not sem_data.empty:
                print(f"\nSemester {semester}:")
                print(f"  Students: {len(sem_data)}")
                grade_counts = sem_data['Class_Grade'].value_counts().sort_index()
                print(f"  Grade Distribution:")
                for grade, count in grade_counts.items():
                    print(f"    {grade}: {count}")
    
    print(f"\n{'='*60}")
    print(f"✅ Excel file created: {output_file}")
    print("="*60)
    print("\n📋 Excel contains sheets:")
    for sem in semesters:
        print(f"   • Sem {sem} - Subject-wise details")
    print(f"   • Overall Summary - All semesters combined")
    print(f"   • Grade Distribution - Statistics by semester")
    print()
    
    return output_file

# ==================== MAIN ====================

if __name__ == "__main__":
    print("="*60)
    print("🎓 SEMESTER 4-8 RESULTS EXCEL EXPORT")
    print("="*60)
    print()
    
    # Get user input
    usn_pattern = input("Enter USN pattern (default: 1BI21IS%): ").strip() or "1BI21IS%"
    output_file = input("Enter output filename (default: auto-generated): ").strip() or None
    
    # Ask which semesters to export
    sem_input = input("Enter semesters to export (default: 4,5,6,7,8): ").strip()
    if sem_input:
        try:
            semesters = [int(s.strip()) for s in sem_input.split(',')]
        except:
            print("⚠️  Invalid input, using default: 4,5,6,7,8")
            semesters = [4, 5, 6, 7, 8]
    else:
        semesters = [4, 5, 6, 7, 8]
    
    print()
    
    # Create Excel
    result = create_comprehensive_excel(usn_pattern, output_file, semesters)
    
    if result:
        print(f"\n✅ SUCCESS! Open the file to view results:")
        print(f"   {result}")
        print()
        print("📋 Each semester has its own sheet with:")
        print("   • USN, Name")
        print("   • Subject Code, Subject Name")
        print("   • Internal, External, Total marks")
        print("   • Letter Grade (O/A+/A/B+/B/C/P/F)")
        print()
        print("📋 Additional sheets:")
        print("   • Overall Summary - Combined data for all semesters")
        print("   • Grade Distribution - Statistics by semester")
    else:
        print("\n❌ Export failed!")
