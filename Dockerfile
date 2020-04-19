FROM python:3.7

HEALTHCHECK --interval=5s --timeout=3s CMD curl --fail http://localhost:8000/docs || exit 1

# Add software artifacts
WORKDIR /app
COPY . /app

# Install dependencies
RUN pip install -r requirements.txt

# Start server
CMD ["uvicorn", "--host", "0.0.0.0", "--port", "8000", "github_search:app"]
