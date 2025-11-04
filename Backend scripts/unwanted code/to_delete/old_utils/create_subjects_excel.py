"""
Create Semester 3 Subjects Excel File
Based on VTU curriculum structure
"""

import pandas as pd

# Semester 3 subjects data
subjects_data = [
    {
        'subject_code': 'BCS301',
        'subject_name': 'MATHEMATICS FOR COMPUTER SCIENCE',
        'semester': 3,
        'credits': 4,
        'short_code': '301'
    },
    {
        'subject_code': 'BCS302',
        'subject_name': 'DIGITAL DESIGN & COMPUTER ORGANIZATION',
        'semester': 3,
        'credits': 4,
        'short_code': '302'
    },
    {
        'subject_code': 'BCS303',
        'subject_name': 'OPERATING SYSTEMS',
        'semester': 3,
        'credits': 4,
        'short_code': '303'
    },
    {
        'subject_code': 'BCS304',
        'subject_name': 'DATA STRUCTURES AND APPLICATIONS',
        'semester': 3,
        'credits': 3,
        'short_code': '304'
    },
    {
        'subject_code': 'BCSL305',
        'subject_name': 'DATA STRUCTURES LAB',
        'semester': 3,
        'credits': 1,
        'short_code': 'L305'
    },
    {
        'subject_code': 'BCS306A',
        'subject_name': 'OBJECT ORIENTED PROGRAMMING WITH JAVA',
        'semester': 3,
        'credits': 3,
        'short_code': '306A'
    },
    {
        'subject_code': 'BCS306B',
        'subject_name': 'UNIX PROGRAMMING',
        'semester': 3,
        'credits': 3,
        'short_code': '306B'
    },
    {
        'subject_code': 'BCS306C',
        'subject_name': 'SOFTWARE ENGINEERING',
        'semester': 3,
        'credits': 3,
        'short_code': '306C'
    },
    {
        'subject_code': 'BSCK307',
        'subject_name': 'SOCIAL CONNECT AND RESPONSIBILITY',
        'semester': 3,
        'credits': 1,
        'short_code': 'K307'
    },
    {
        'subject_code': 'BCS358D',
        'subject_name': 'DATA VISUALIZATION WITH PYTHON',
        'semester': 3,
        'credits': 1,
        'short_code': '358D'
    },
    {
        'subject_code': 'BCS358E',
        'subject_name': 'WEB TECHNOLOGIES',
        'semester': 3,
        'credits': 1,
        'short_code': '358E'
    },
    {
        'subject_code': 'BPEK359',
        'subject_name': 'PHYSICAL EDUCATION',
        'semester': 3,
        'credits': 0,
        'short_code': 'K359'
    },
    {
        'subject_code': 'BNSK359',
        'subject_name': 'NATIONAL SERVICE SCHEME',
        'semester': 3,
        'credits': 0,
        'short_code': 'NSK359'
    },
    {
        'subject_code': 'BYOK359',
        'subject_name': 'YOGA',
        'semester': 3,
        'credits': 0,
        'short_code': 'YOK359'
    }
]

# Create DataFrame
df = pd.DataFrame(subjects_data)

# Save to Excel
output_file = r"d:\preetham\scrapper\Preetham version\semester_3_subjects.xlsx"
df.to_excel(output_file, index=False)

print(f"✅ Created Excel file: {output_file}")
print(f"📊 Total subjects: {len(subjects_data)}")
print("\n📋 Subjects created:")
for subject in subjects_data:
    print(f"  {subject['subject_code']:<12} {subject['subject_name']:<50} Credits: {subject['credits']}")
