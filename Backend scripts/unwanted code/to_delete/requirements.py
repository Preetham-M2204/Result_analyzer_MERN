# requirements.txt
"""
pandas>=1.3.0
requests>=2.25.0
beautifulsoup4>=4.9.0
openpyxl>=3.0.0
lxml>=4.6.0
"""

# launcher.py - Simple launcher script
import sys
import subprocess
import importlib.util

def check_and_install_requirements():
    """Check if required packages are installed, if not install them"""
    required_packages = [
        'pandas',
        'requests', 
        'beautifulsoup4',
        'openpyxl',
        'lxml'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        spec = importlib.util.find_spec(package)
        if spec is None:
            missing_packages.append(package)
    
    if missing_packages:
        print("Missing required packages:", missing_packages)
        print("Installing missing packages...")
        
        for package in missing_packages:
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        
        print("All packages installed successfully!")
    else:
        print("All required packages are already installed.")

def main():
    """Main launcher function"""
    print("BIT Results Scraper - GUI Version")
    print("==================================")
    
    # Check and install requirements
    try:
        check_and_install_requirements()
    except Exception as e:
        print(f"Error installing packages: {e}")
        input("Press Enter to exit...")
        return
    
    # Import and run the GUI
    try:
        import tkinter as tk
        from bit_scraper_gui import BITResultsScraperGUI
        
        print("Starting GUI...")
        root = tk.Tk()
        app = BITResultsScraperGUI(root)
        root.mainloop()
        
    except ImportError as e:
        print(f"Import error: {e}")
        print("Please make sure all required packages are installed.")
        input("Press Enter to exit...")
    except Exception as e:
        print(f"Error starting application: {e}")
        input("Press Enter to exit...")

if __name__ == "__main__":
    main()

