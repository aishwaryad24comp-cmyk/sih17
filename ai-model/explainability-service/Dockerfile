FROM python:3.10-slim

WORKDIR /app

# We are building this container from the root context of the repo
# so that we can easily copy the ../Manushree directory which contains the trained .pkl models

COPY ai-model/explainability-service/requirements.txt ./ai-model/explainability-service/
RUN pip install --no-cache-dir -r ai-model/explainability-service/requirements.txt

# Copy the trained models and the python service
COPY Manushree/ ./Manushree/
COPY ai-model/explainability-service/ ./ai-model/explainability-service/

# Set the working directory to the service itself
WORKDIR /app/ai-model/explainability-service

# Expose FastAPI port
EXPOSE 8000

# Run Uvicorn server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
