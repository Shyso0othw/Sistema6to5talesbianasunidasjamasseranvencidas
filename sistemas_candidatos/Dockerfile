# Etapa 1: compilar frontend
FROM node:20 AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Etapa 2: servidor ASGI (Daphne + Django)
FROM python:3.12-slim
WORKDIR /app
COPY backend/ .
COPY --from=frontend-build /app/frontend/dist /frontend/dist
RUN pip install --no-cache-dir -r requirements.txt
EXPOSE 8000
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "backend.asgi:application"]
