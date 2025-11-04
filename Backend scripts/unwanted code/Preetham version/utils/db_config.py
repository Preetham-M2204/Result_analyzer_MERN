"""
Database Configuration Module
Handles MySQL connection for VTU Results Scraper
"""

import mysql.connector
from mysql.connector import Error

# Database Configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '123456',
    'database': 'resana'
}

def get_db_connection():
    """
    Create and return a MySQL database connection
    
    Returns:
        connection: MySQL connection object or None if failed
    """
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        if connection.is_connected():
            print(f"✅ Successfully connected to MySQL database: {DB_CONFIG['database']}")
            return connection
    except Error as e:
        print(f"❌ Error connecting to MySQL: {e}")
        return None

def close_connection(connection):
    """
    Close the database connection
    
    Args:
        connection: MySQL connection object
    """
    if connection and connection.is_connected():
        connection.close()
        print("🔒 Database connection closed")

def test_connection():
    """Test database connection"""
    conn = get_db_connection()
    if conn:
        cursor = conn.cursor()
        cursor.execute("SHOW TABLES;")
        tables = cursor.fetchall()
        print(f"📋 Tables in database: {[table[0] for table in tables]}")
        cursor.close()
        close_connection(conn)
        return True
    return False

if __name__ == "__main__":
    # Test the connection
    test_connection()
