"""
Elective Subject Mapper for VTU Results
Handles mapping of actual subject codes to placeholder codes with X

Example:
- Placeholder in DB: 21CS48X/21CS48LX
- Student A chose: 21CSL481 (Web Programming)
- Student B chose: 21CSL482 (Unix Shell Programming)

This mapper:
1. Maps actual code to placeholder
2. Stores the actual subject name student chose
3. Marks it as elective
4. Ensures SGPA uses correct credits
"""

import re
from db_config import get_db_connection, close_connection

# ==================== ELECTIVE MAPPING PATTERNS ====================

ELECTIVE_PATTERNS = {
    # Semester 3
    "21CS38X": {
        "pattern": r"21CS38[0-9]",  # Matches 21CS381, 21CS382, etc.
        "semester": 3,
        "credits": 1,
        "type": "Ability Enhancement Course - III"
    },
    "21CSL38X": {
        "pattern": r"21CSL38[0-9]",  # Matches 21CSL381, 21CSL382, etc.
        "semester": 3,
        "credits": 1,
        "type": "Ability Enhancement Course - III"
    },
    
    # Semester 4
    "21CS48X": {
        "pattern": r"21CS48[0-9]",  # Matches 21CS481, 21CS482, etc.
        "semester": 4,
        "credits": 1,
        "type": "Ability Enhancement Course - IV"
    },
    "21CS48LX": {
        "pattern": r"21CSL48[0-9]",  # Matches 21CSL481, 21CSL482, etc.
        "semester": 4,
        "credits": 1,
        "type": "Ability Enhancement Course - IV"
    },
    
    # Semester 5
    "21XX56": {
        "pattern": r"21[A-Z]{2,4}56",  # Matches 21CS56, 21MAT56, etc.
        "semester": 5,
        "credits": 2,
        "type": "Research Methodology and IPR"
    },
    "21CS58X": {
        "pattern": r"21CS58[0-9]",
        "semester": 5,
        "credits": 1,
        "type": "Ability Enhancement Course-V"
    },
    "21CSL58X": {
        "pattern": r"21CSL58[0-9]",
        "semester": 5,
        "credits": 1,
        "type": "Ability Enhancement Course-V"
    },
    
    # Semester 6
    "21XX64X": {
        "pattern": r"21[A-Z]{2,4}64[0-9]",  # Matches 21CS641, 21AI642, etc.
        "semester": 6,
        "credits": 3,
        "type": "Professional Elective Course-I"
    },
    "21XX65X": {
        "pattern": r"21[A-Z]{2,4}65[0-9]",
        "semester": 6,
        "credits": 3,
        "type": "Open Elective Course-I"
    },
    
    # Semester 7
    "21XX73X": {
        "pattern": r"21[A-Z]{2,4}73[0-9]",
        "semester": 7,
        "credits": 3,
        "type": "Professional Elective Course-II"
    },
    "21XX74X": {
        "pattern": r"21[A-Z]{2,4}74[0-9]",
        "semester": 7,
        "credits": 3,
        "type": "Professional Elective Course-III"
    },
    "21XX75X": {
        "pattern": r"21[A-Z]{2,4}75[0-9]",
        "semester": 7,
        "credits": 3,
        "type": "Open Elective Course-II"
    },
}

def map_actual_to_placeholder(actual_subject_code):
    """
    Maps an actual subject code to its placeholder code.
    
    Example:
        21CSL481 → 21CS48LX
        21CSL482 → 21CS48LX
        21CS641 → 21XX64X
    
    Returns:
        (placeholder_code, elective_type, credits) or (None, None, None) if not an elective
    """
    for placeholder, config in ELECTIVE_PATTERNS.items():
        pattern = config["pattern"]
        if re.match(pattern, actual_subject_code):
            return (placeholder, config["type"], config["credits"])
    
    return (None, None, None)

def get_subject_name_from_vtu(subject_code):
    """
    Get subject name from VTU result (this will be the actual subject name)
    This is called during scraping.
    """
    # This will be populated during scraping from the result page
    return None

def store_elective_choice(usn, actual_subject_code, actual_subject_name, semester, placeholder_code, 
                          internal_marks, external_marks, total_marks, result_status, attempt_number):
    """
    Stores a student's elective choice in the database.
    
    Instead of storing placeholder (21CS48LX), we store:
    - subject_code: Actual code student chose (21CSL481)
    - subject_name: Actual name (Web Programming)
    - is_elective: TRUE
    - elective_placeholder: 21CS48LX (for reference)
    """
    connection = get_db_connection()
    if not connection:
        return False
    
    cursor = connection.cursor()
    
    try:
        # Check if this elective choice already exists
        cursor.execute("""
            SELECT credits FROM elective_subjects 
            WHERE subject_code = %s AND semester = %s
        """, (actual_subject_code, semester))
        
        result = cursor.fetchone()
        credits = result[0] if result else None
        
        # If not found, insert as new elective option
        if not credits:
            _, _, credits = map_actual_to_placeholder(actual_subject_code)
            
            cursor.execute("""
                INSERT INTO elective_subjects 
                (subject_code, subject_name, semester, credits, placeholder_code, scheme)
                VALUES (%s, %s, %s, %s, %s, '21')
                ON DUPLICATE KEY UPDATE subject_name = VALUES(subject_name)
            """, (actual_subject_code, actual_subject_name, semester, credits, placeholder_code))
        
        # Store result with actual subject code
        upsert_query = """
        INSERT INTO results 
        (student_usn, subject_code, semester, internal_marks, external_marks, 
         total_marks, result_status, attempt_number, is_elective, scraped_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE, NOW())
        ON DUPLICATE KEY UPDATE
            internal_marks = VALUES(internal_marks),
            external_marks = VALUES(external_marks),
            total_marks = VALUES(total_marks),
            result_status = VALUES(result_status),
            attempt_number = VALUES(attempt_number),
            scraped_at = VALUES(scraped_at)
        """
        
        cursor.execute(upsert_query, (
            usn, actual_subject_code, semester, 
            internal_marks, external_marks, total_marks, 
            result_status, attempt_number
        ))
        
        connection.commit()
        return True
        
    except Exception as e:
        print(f"Error storing elective: {e}")
        return False
    finally:
        cursor.close()
        close_connection(connection)

def add_elective_tables():
    """
    Add necessary columns and tables for handling electives
    """
    connection = get_db_connection()
    if not connection:
        return False
    
    cursor = connection.cursor()
    
    print("="*60)
    print("ADDING ELECTIVE SUPPORT TO DATABASE")
    print("="*60)
    
    try:
        # Add is_elective column to results table
        cursor.execute("SHOW COLUMNS FROM results LIKE 'is_elective'")
        if not cursor.fetchone():
            print("✅ Adding 'is_elective' column to results table...")
            cursor.execute("""
                ALTER TABLE results 
                ADD COLUMN is_elective BOOLEAN DEFAULT FALSE AFTER result_status
            """)
            connection.commit()
            print("   ✅ Column added")
        else:
            print("   ℹ️  'is_elective' column already exists")
        
        # Create elective_subjects table to store all possible elective options
        print("✅ Creating 'elective_subjects' table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS elective_subjects (
                subject_code VARCHAR(50) PRIMARY KEY,
                subject_name VARCHAR(255) NOT NULL,
                semester INT NOT NULL,
                credits INT NOT NULL,
                placeholder_code VARCHAR(50),
                scheme VARCHAR(10) DEFAULT '21',
                INDEX idx_placeholder (placeholder_code),
                INDEX idx_semester (semester)
            )
        """)
        connection.commit()
        print("   ✅ Table created")
        
        print("\n✅ Elective support added successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        cursor.close()
        close_connection(connection)

if __name__ == "__main__":
    # Add database support
    add_elective_tables()
    
    # Test mapping
    print("\n" + "="*60)
    print("TESTING ELECTIVE MAPPING")
    print("="*60)
    
    test_codes = [
        "21CSL481",  # Should map to 21CS48LX
        "21CSL482",  # Should map to 21CS48LX
        "21CS381",   # Should map to 21CS38X
        "21CS641",   # Should map to 21XX64X
        "21AI642",   # Should map to 21XX64X
        "21CS301",   # Should NOT map (not elective)
    ]
    
    for code in test_codes:
        placeholder, elective_type, credits = map_actual_to_placeholder(code)
        if placeholder:
            print(f"✅ {code} → {placeholder} ({elective_type}, {credits} credits)")
        else:
            print(f"❌ {code} → Not an elective")
