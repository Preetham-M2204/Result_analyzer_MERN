"""
Add Test Teacher to Database
This script adds a test teacher named "Shilpa" to the teachers and users tables
"""

import mysql.connector
import sys

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '123456',
    'database': 'resana'
}

def add_test_teacher():
    """Add test teacher Shilpa to the database"""
    try:
        # Connect to MySQL
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("Connected to MySQL database")
        
        # Check if teacher already exists
        cursor.execute("SELECT teacher_id FROM teachers WHERE teacher_name = 'Shilpa'")
        existing = cursor.fetchone()
        
        if existing:
            print(f"Teacher 'Shilpa' already exists with ID: {existing[0]}")
            cursor.close()
            conn.close()
            return existing[0]
        
        # Use simple ID format
        teacher_id = 'T-001'
        
        print(f"Adding teacher 'Shilpa' with ID: {teacher_id}")
        
        # Insert into teachers table
        insert_query = """
            INSERT INTO teachers (teacher_id, teacher_name)
            VALUES (%s, %s)
        """
        cursor.execute(insert_query, (teacher_id, 'Shilpa'))
        
        conn.commit()
        print(f"Successfully added teacher 'Shilpa' with ID: {teacher_id}")
        
        cursor.close()
        conn.close()
        
        return teacher_id
        
    except mysql.connector.Error as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    print("=" * 60)
    print("ADD TEST TEACHER - SHILPA")
    print("=" * 60)
    
    teacher_id = add_test_teacher()
    
    if teacher_id:
        print("\n" + "=" * 60)
        print("SUCCESS")
        print("=" * 60)
        print(f"Teacher ID: {teacher_id}")
        print("Name: Shilpa")
        print("\nYou can now assign subjects to this teacher in the Admin Dashboard")
    else:
        print("\nFailed to add teacher")
        sys.exit(1)
