"""
FIX SEMESTER 5 SUBJECTS - 2022 SCHEME
======================================
Updates credits and scheme for semester 5 subjects based on VTU 2022 scheme
"""

from db_config import get_db_connection

# Subject credits mapping from VTU 2022 scheme document
SEMESTER_5_SUBJECTS = {
    # Core Subjects (PCC/IPCC)
    'BCS501': {'credits': 4, 'scheme': '22', 'name': 'Software Engineering & Project Management'},
    'BCS502': {'credits': 4, 'scheme': '22', 'name': 'Computer Networks'},
    'BCS503': {'credits': 4, 'scheme': '22', 'name': 'Theory of Computation'},
    
    # Lab Subjects (PCCL)
    'BAIL504': {'credits': 1, 'scheme': '22', 'name': 'Data Visualization Lab'},
    
    # Elective Subjects (PEC)
    'BXS515x': {'credits': 3, 'scheme': '22', 'name': 'Professional Elective Course'},
    'BCS515C': {'credits': 3, 'scheme': '22', 'name': 'Unix System Programming', 'is_elective': True},
    'BCS515B': {'credits': 3, 'scheme': '22', 'name': 'Artificial Intelligence', 'is_elective': True},
    'BCS515D': {'credits': 3, 'scheme': '22', 'name': 'Distributed Systems', 'is_elective': True},
    'BAIL515A': {'credits': 3, 'scheme': '22', 'name': 'Computer Vision', 'is_elective': True},
    
    # Project (PROJ)
    'BIS586': {'credits': 2, 'scheme': '22', 'name': 'Mini Project'},
    
    # Additional Subjects (AEC/HSMC/MC)
    'BRMK557': {'credits': 3, 'scheme': '22', 'name': 'Research Methodology and IPR'},
    'BCS508': {'credits': 1, 'scheme': '22', 'name': 'Environmental Studies and E-waste Management'},
    'BNSK559': {'credits': 0, 'scheme': '22', 'name': 'National Service Scheme (NSS)'},
    'BPEK559': {'credits': 0, 'scheme': '22', 'name': 'Physical Education (PE)'},
    'BYOK559': {'credits': 0, 'scheme': '22', 'name': 'Yoga'},
    
    # Scheme 21 subjects (if any old records exist)
    '21CSS51': {'credits': 3, 'scheme': '21', 'name': 'Automata Theory and Compiler Design'},
    '21CSS52': {'credits': 4, 'scheme': '21', 'name': 'Computer Networks'},
    '21CSS53': {'credits': 3, 'scheme': '21', 'name': 'Database Management Systems'},
    '21CSS54': {'credits': 3, 'scheme': '21', 'name': 'AI and Machine Learning'},
    '21CSS58X/21CSL58X': {'credits': 1, 'scheme': '21', 'name': 'Ability Enhancement Course-V'},
    '21CSL55': {'credits': 1, 'scheme': '21', 'name': 'DBMS Lab with Mini Project'},
    '21VX56': {'credits': 2, 'scheme': '21', 'name': 'Research Methodology and IPR'},
}

def fix_semester_5_subjects():
    """Update semester 5 subjects with correct credits and scheme"""
    conn = get_db_connection()
    if not conn:
        print("❌ Failed to connect to database")
        return False
    
    cursor = conn.cursor()
    
    try:
        print("=" * 60)
        print("FIXING SEMESTER 5 SUBJECTS - 2022 SCHEME")
        print("=" * 60)
        
        # Get all semester 5 subjects
        cursor.execute("""
            SELECT subject_code, subject_name, credits, scheme, is_placeholder 
            FROM subjects 
            WHERE semester = 5
            ORDER BY subject_code
        """)
        
        existing_subjects = cursor.fetchall()
        print(f"\n📊 Found {len(existing_subjects)} subjects in semester 5")
        
        # Update each subject
        updated_count = 0
        for subject_code, subject_name, current_credits, current_scheme, is_placeholder in existing_subjects:
            # Check if we have mapping for this subject
            if subject_code in SEMESTER_5_SUBJECTS:
                mapping = SEMESTER_5_SUBJECTS[subject_code]
                new_credits = mapping['credits']
                new_scheme = mapping['scheme']
                is_elective = mapping.get('is_elective', False)
                
                # Update subject
                cursor.execute("""
                    UPDATE subjects 
                    SET credits = %s, 
                        scheme = %s, 
                        is_placeholder = %s
                    WHERE subject_code = %s AND semester = 5
                """, (new_credits, new_scheme, is_elective, subject_code))
                
                if cursor.rowcount > 0:
                    print(f"✅ Updated {subject_code}: Credits {current_credits}→{new_credits}, Scheme '{current_scheme}'→'{new_scheme}', Elective: {is_elective}")
                    updated_count += 1
            else:
                print(f"⚠️  Skipped {subject_code}: No mapping found (keeping current values)")
        
        # Commit changes
        conn.commit()
        
        print(f"\n✅ Successfully updated {updated_count} subjects")
        
        # Verify updates
        print("\n" + "=" * 60)
        print("VERIFICATION - Updated Subjects:")
        print("=" * 60)
        cursor.execute("""
            SELECT subject_code, subject_name, credits, scheme, is_placeholder 
            FROM subjects 
            WHERE semester = 5 AND credits > 0
            ORDER BY subject_code
        """)
        
        updated_subjects = cursor.fetchall()
        total_credits = 0
        for subject_code, subject_name, credits, scheme, is_placeholder in updated_subjects:
            elective_mark = " (ELECTIVE)" if is_placeholder else ""
            print(f"{subject_code:12} | {subject_name:45} | {credits} credits | Scheme {scheme}{elective_mark}")
            total_credits += credits
        
        print(f"\n📊 Total Credits for Semester 5: {total_credits}")
        print(f"   (Should be 22 credits as per VTU scheme)")
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("\n🔧 Starting Semester 5 Subject Fix...\n")
    success = fix_semester_5_subjects()
    
    if success:
        print("\n" + "=" * 60)
        print("✅ FIX COMPLETE!")
        print("=" * 60)
        print("\nNext step: Run grade calculation")
        print("Command: python calculate_grades.py --semester 5")
    else:
        print("\n❌ Fix failed. Please check errors above.")
