"""
List top students by CGPA
"""
import mysql.connector
from db_config import get_db_connection, close_connection

def get_top_students(limit=20):
    print(f"🏆 Top {limit} Students by CGPA\n")
    print("="*80)
    
    conn = get_db_connection()
    if not conn:
        print("❌ Failed to connect to database")
        return
    
    cursor = conn.cursor()
    
    try:
        # Get top students by CGPA
        cursor.execute(f"""
            SELECT usn, name, cgpa
            FROM student_details
            WHERE cgpa IS NOT NULL
            ORDER BY cgpa DESC, usn ASC
            LIMIT {limit}
        """)
        
        results = cursor.fetchall()
        
        if results:
            print(f"{'Rank':<6} {'USN':<15} {'Name':<35} {'CGPA':<8}")
            print("-"*80)
            
            rank = 1
            prev_cgpa = None
            actual_rank = 1
            
            for row in results:
                usn, name, cgpa = row
                
                # Handle ties in ranking
                if cgpa != prev_cgpa:
                    actual_rank = rank
                
                print(f"{actual_rank:<6} {usn:<15} {name:<35} {cgpa:<8.2f}")
                
                prev_cgpa = cgpa
                rank += 1
            
            print("="*80)
            print(f"\n📊 Statistics:")
            print(f"   Highest CGPA: {results[0][2]:.2f}")
            print(f"   {limit}th Position CGPA: {results[-1][2]:.2f}")
            
            # Get average CGPA
            cursor.execute("SELECT AVG(cgpa) FROM student_details WHERE cgpa IS NOT NULL")
            avg_cgpa = cursor.fetchone()[0]
            print(f"   Average CGPA (all students): {avg_cgpa:.2f}")
            
        else:
            print("❌ No student records found")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        cursor.close()
        close_connection(conn)

if __name__ == "__main__":
    get_top_students(20)
