"""Remove all emojis from ultimate_scraper.py"""

# Read the file
with open('ultimate_scraper.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace emojis with simple text
replacements = {
    '🚀': '[SCRAPER]',
    '✅': '[OK]',
    '❌': '[FAIL]',
    '📋': '[INFO]',
    '📊': '[DATA]',
    '⏱️': '[TIME]',
    '🎉': '[DONE]',
    '⚠️': '[WARN]',
    '🔒': '[DB]',
    '👥': '[USERS]',
    '🔗': '[URL]',
    '📚': '[SEM]',
    '⏭️': '[SKIP]'
}

for emoji, text in replacements.items():
    content = content.replace(emoji, text)

# Also remove the UTF-8 encoding fix since we don't need it anymore
content = content.replace("""# Fix Unicode encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

""", "")

# Write back
with open('ultimate_scraper.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS: All emojis replaced with ASCII text")
