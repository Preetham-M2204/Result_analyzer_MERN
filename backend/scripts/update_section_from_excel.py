"""
Script to update student section details from Excel files
Modular design - can be used for any batch year
"""

import pandas as pd
import mysql.connector
from db_config import get_db_connection
import sys
from pathlib import Path


class SectionUpdater:
    """Modular class to update student sections from Excel file"""
    
    def __init__(self, excel_file_path, batch_year=None):
        """
        Initialize the SectionUpdater
        
        Args:
            excel_file_path (str): Path to the Excel file with USN and Section columns
            batch_year (int, optional): Batch year (e.g., 2022, 2023). If None, extracts from filename
        """
        self.excel_file_path = excel_file_path
        self.batch_year = batch_year or self._extract_batch_from_filename()
        self.connection = None
        self.cursor = None
        
    def _extract_batch_from_filename(self):
        """Extract batch year from filename if present"""
        filename = Path(self.excel_file_path).stem
        for year in range(2020, 2030):
            if str(year) in filename:
                return year
        return None
    
    def connect_db(self):
        """Establish database connection"""
        try:
            self.connection = get_db_connection()
            self.cursor = self.connection.cursor()
            print(f"✅ Database connected successfully")
            return True
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            return False
    
    def read_excel(self):
        """Read Excel file and return DataFrame"""
        try:
            df = pd.read_excel(self.excel_file_path)
            
            # Check if required columns exist (case-insensitive)
            columns_lower = [col.lower() for col in df.columns]
            
            if 'usn' not in columns_lower or 'section' not in columns_lower:
                print(f"❌ Excel file must have 'USN' and 'Section' columns")
                print(f"   Found columns: {list(df.columns)}")
                return None
            
            # Normalize column names
            df.columns = [col.lower() for col in df.columns]
            
            # Clean data
            df['usn'] = df['usn'].astype(str).str.strip().str.upper()
            df['section'] = df['section'].astype(str).str.strip().str.upper()
            
            # Remove empty rows
            df = df[df['usn'].notna() & (df['usn'] != '') & (df['usn'] != 'NAN')]
            
            print(f"✅ Excel file read successfully")
            print(f"   Total records: {len(df)}")
            print(f"   Sections found: {df['section'].unique()}")
            
            return df
            
        except Exception as e:
            print(f"❌ Failed to read Excel file: {e}")
            return None
    
    def update_sections(self, df):
        """Update sections in database"""
        if df is None or len(df) == 0:
            print("❌ No data to update")
            return
        
        updated_count = 0
        not_found_count = 0
        error_count = 0
        not_found_usns = []
        
        print(f"\n🔄 Starting section updates...")
        print(f"{'='*60}")
        
        for index, row in df.iterrows():
            usn = row['usn']
            section = row['section']
            
            try:
                # Check if student exists
                check_query = "SELECT usn, section FROM student_details WHERE usn = %s"
                self.cursor.execute(check_query, (usn,))
                result = self.cursor.fetchone()
                
                if result:
                    old_section = result[1] if result[1] else 'NULL'
                    
                    # Update section
                    update_query = "UPDATE student_details SET section = %s WHERE usn = %s"
                    self.cursor.execute(update_query, (section, usn))
                    self.connection.commit()
                    
                    updated_count += 1
                    print(f"✅ {usn}: {old_section} → {section}")
                else:
                    not_found_count += 1
                    not_found_usns.append(usn)
                    print(f"⚠️  {usn}: Not found in database")
                    
            except Exception as e:
                error_count += 1
                print(f"❌ {usn}: Error - {e}")
        
        print(f"\n{'='*60}")
        print(f"📊 Update Summary:")
        print(f"   ✅ Successfully updated: {updated_count}")
        print(f"   ⚠️  Not found in DB: {not_found_count}")
        print(f"   ❌ Errors: {error_count}")
        
        if not_found_usns and len(not_found_usns) <= 20:
            print(f"\n📋 USNs not found in database:")
            for usn in not_found_usns:
                print(f"   • {usn}")
        elif not_found_usns:
            print(f"\n📋 {len(not_found_usns)} USNs not found (showing first 20):")
            for usn in not_found_usns[:20]:
                print(f"   • {usn}")
    
    def verify_updates(self, df):
        """Verify the updates by checking a sample"""
        if df is None or len(df) == 0:
            return
        
        print(f"\n🔍 Verification (checking first 5 records):")
        print(f"{'='*60}")
        
        sample_size = min(5, len(df))
        for i in range(sample_size):
            usn = df.iloc[i]['usn']
            expected_section = df.iloc[i]['section']
            
            query = "SELECT section FROM student_details WHERE usn = %s"
            self.cursor.execute(query, (usn,))
            result = self.cursor.fetchone()
            
            if result:
                actual_section = result[0]
                status = "✅" if actual_section == expected_section else "❌"
                print(f"{status} {usn}: Expected={expected_section}, Actual={actual_section}")
            else:
                print(f"❌ {usn}: Not found")
    
    def close_db(self):
        """Close database connection"""
        if self.cursor:
            self.cursor.close()
        if self.connection:
            self.connection.close()
        print(f"\n✅ Database connection closed")
    
    def run(self, verify=True):
        """Main execution method"""
        print(f"\n{'='*60}")
        print(f"📚 Section Updater for Batch {self.batch_year or 'Unknown'}")
        print(f"{'='*60}")
        print(f"📁 Excel file: {self.excel_file_path}")
        
        # Connect to database
        if not self.connect_db():
            return False
        
        try:
            # Read Excel file
            df = self.read_excel()
            if df is None:
                return False
            
            # Update sections
            self.update_sections(df)
            
            # Verify updates if requested
            if verify:
                self.verify_updates(df)
            
            return True
            
        finally:
            self.close_db()


def main():
    """Main function to run the script"""
    
    # Example usage for 2022 batch
    print("="*60)
    print("🎓 STUDENT SECTION UPDATER")
    print("="*60)
    
    # Get the root directory (2 levels up from scripts folder)
    root_dir = Path(__file__).parent.parent.parent
    
    # Update 2022 batch
    excel_2022 = root_dir / "2022_Sectionlist.xlsx"
    if excel_2022.exists():
        print(f"\n📝 Processing 2022 Batch...")
        updater_2022 = SectionUpdater(str(excel_2022), batch_year=2022)
        updater_2022.run(verify=True)
    else:
        print(f"⚠️  2022_Sectionlist.xlsx not found at: {excel_2022}")
    
    # Update 2023 batch
    excel_2023 = root_dir / "2023_Sectionlist.xlsx"
    if excel_2023.exists():
        print(f"\n\n📝 Processing 2023 Batch...")
        updater_2023 = SectionUpdater(str(excel_2023), batch_year=2023)
        updater_2023.run(verify=True)
    else:
        print(f"⚠️  2023_Sectionlist.xlsx not found at: {excel_2023}")
    
    print(f"\n{'='*60}")
    print(f"✅ All batch updates completed!")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    # You can also run for specific batch:
    # python update_section_from_excel.py
    
    # Or import and use the class directly:
    # from update_section_from_excel import SectionUpdater
    # updater = SectionUpdater("path/to/file.xlsx", batch_year=2022)
    # updater.run()
    
    main()
