FROM python:3.7

# Add software artifacts
WORKDIR /app
ADD dist/*.whl .
ADD requirements.txt .
ADD static static
ADD templates templates

# Install dependencies
RUN pip install -r requirements.txt
RUN pip install *.whl

ENV REDIS_HOST redis

# Start server
CMD ["uvicorn", "--host", "0.0.0.0", "--port", "8000", "github_search:app"]
