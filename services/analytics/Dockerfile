# Python Workforce Analytics Engine Dockerfile
FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY services/analytics/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY services/analytics /app

RUN useradd --create-home appuser
USER appuser
EXPOSE 8002
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]
