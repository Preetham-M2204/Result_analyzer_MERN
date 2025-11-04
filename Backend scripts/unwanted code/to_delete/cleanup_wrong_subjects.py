"""
Clean up wrong subject codes from database for Semester 1 and 2
Removes old incorrect codes and keeps only the correct ones from actual results
"""

from db_config import get_db_connection, close_connection

# Wrong subject codes to delete (old format)
WRONG_CODES_SEM1 = [
    "20IC017",
    "22ENG16",
    "22ESC14x",
    "22ETC15x",
    "22IDT18",
    "22KBK17",
    "22KSK17",
    "22MATS11",
    "22PHYS12",
    "22PLC15x",
    "22POP13",
    "22SFH18"
]

WRONG_CODES_SEM2 = [
    "22MATS21",
    "22CHES22",
    "22CED23",
    "22ESC24x",
    "22ETC25x",
    "2PLC25x",
    "22PWS26",
    "22IC027",
    "22KSK27",
    "22KBK27",
    "22SFH28",
    "22IDT28"
]

def cleanup_wrong_subjects():
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        cur = conn.cursor()
        
        # Delete wrong sem 1 codes
        print("🗑️  Deleting wrong Semester 1 subject codes...")
        for code in WRONG_CODES_SEM1:
            cur.execute("DELETE FROM subjects WHERE subject_code = %s", (code,))
            print(f"   ❌ Deleted: {code}")
        
        # Delete wrong sem 2 codes
        print("\n🗑️  Deleting wrong Semester 2 subject codes...")
        for code in WRONG_CODES_SEM2:
            cur.execute("DELETE FROM subjects WHERE subject_code = %s", (code,))
            print(f"   ❌ Deleted: {code}")
        
        conn.commit()
        
        # Show remaining subjects
        print("\n" + "="*80)
        print("✅ Cleanup complete!")
        print("="*80)
        
        # Count and show sem 1
        cur.execute("SELECT COUNT(*) FROM subjects WHERE semester = 1")
        count1 = cur.fetchone()[0]
        print(f"\n📊 Semester 1 subjects remaining: {count1}")
        
        cur.execute("SELECT subject_code, subject_name, credits FROM subjects WHERE semester = 1 ORDER BY subject_code")
        for code, name, credits in cur.fetchall():
            print(f"   {code:<15} {name:<50} {credits} credits")
        
        # Count and show sem 2
        cur.execute("SELECT COUNT(*) FROM subjects WHERE semester = 2")
        count2 = cur.fetchone()[0]
        print(f"\n📊 Semester 2 subjects remaining: {count2}")
        
        cur.execute("SELECT subject_code, subject_name, credits FROM subjects WHERE semester = 2 ORDER BY subject_code")
        for code, name, credits in cur.fetchall():
            print(f"   {code:<15} {name:<50} {credits} credits")
        
        print("\n" + "="*80)
        
    finally:
        close_connection(conn)

if __name__ == "__main__":
    print("="*80)
    print("🧹 CLEANING UP WRONG SUBJECT CODES")
    print("="*80)
    print()
    cleanup_wrong_subjects()
