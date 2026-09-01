# Troubleshooting Guide — NexusNotes

## Common Issues & Resolutions

### 1. Database Connection Refused
**Symptom**: `OperationalError: (2003, "Can't connect to MySQL server on 'db' (111)")`
**Fix**: Ensure MySQL is healthy in Docker:
```bash
docker compose ps db
# Check database container logs
docker compose logs db
```

### 2. S3 / MinIO Upload Signature Error
**Symptom**: `ClientError: SignatureDoesNotMatch` or `EndpointConnectionError`
**Fix**: In local development, verify `S3_ENDPOINT_URL=http://minio:9000` is set and the MinIO bucket exists:
```bash
docker compose logs minio-init
```

### 3. Port Conflicts (Port 80 or 3306 in use)
**Fix**: Stop any conflicting local Apache/Nginx/MySQL processes or rebind ports in `docker-compose.yml`:
```bash
# Check what process is using port 80
sudo lsof -i :80
```

### 4. CORS Errors on Frontend
**Fix**: Ensure `CORS_ORIGINS` in `.env` includes the URL from which your browser is accessing the application (e.g. `http://localhost:5173,http://localhost`).
