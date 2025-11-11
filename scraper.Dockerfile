FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    wget \
    gnupg \
    unzip \
    curl \
    chromium \
    chromium-driver \
    && rm -rf /var/lib/apt/lists/*

# Set Tesseract path
ENV TESSERACT_CMD=/usr/bin/tesseract

# Copy requirements
COPY backend/scraper_service/requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy scraper source
COPY backend/scraper_service/ ./

# Copy scripts directory (contains actual scraper scripts and db_config)
COPY backend/scripts/ ../scripts/

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD curl -f http://localhost:8001/health || exit 1

# Start scraper service
CMD ["python", "main.py"]
