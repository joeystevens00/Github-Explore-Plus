FROM python:3.7

# Add software artifacts
WORKDIR /app
COPY . /app

# Install dependencies
RUN pip install -r requirements.txt

# Start server
CMD ["uvicorn", "--host", "0.0.0.0", "--port", "8000", "github_search:app"]
