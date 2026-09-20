FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY backend/python/requirements.txt /app/backend/python/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/python/requirements.txt
COPY . /app
RUN useradd --create-home appuser && chown -R appuser:appuser /app
USER appuser
ENV HOST=0.0.0.0 PORT=8000
EXPOSE 8000
CMD ["sh","-c","gunicorn --chdir backend/python --bind 0.0.0.0:${PORT:-8000} --workers 2 --threads 4 --timeout 120 app:app"]
