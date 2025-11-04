"""
Generate Semester 8 Excel - Simple execution
"""
import sys
sys.path.insert(0, r'd:\preetham\scrapper\Preetham version\utils')

from export_sem8_results import create_comprehensive_excel

print("Generating Semester 8 Results Excel...")
result = create_comprehensive_excel(usn_pattern='%', output_file='Semester_8_Results.xlsx')
print(f"\nDone! File created: {result}")
