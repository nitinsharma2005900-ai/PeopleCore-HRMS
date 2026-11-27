# Python Decimal Payroll Engine Dockerfile
FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY services/payroll/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY services/payroll /app

RUN useradd --create-home appuser
USER appuser
EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
