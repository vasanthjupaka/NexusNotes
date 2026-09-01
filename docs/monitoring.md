# Monitoring & Observability Guide — NexusNotes

## 1. Structured Logging
The backend uses `structlog` for structured logging:
- **Development**: Clean, colorized console output.
- **Production**: Machine-readable JSON logs containing `timestamp`, `log_level`, `request_id`, `method`, `path`, `status_code`, and `duration_ms`.

Example Production Log:
```json
{
  "event": "request_completed",
  "level": "info",
  "logger": "app.core.middleware",
  "method": "POST",
  "path": "/api/v1/notes",
  "request_id": "c8f2b7a1-3d4e-4f1a-b6d8-9a2e3f4b5c6d",
  "status_code": 201,
  "duration_ms": 14.82,
  "timestamp": "2024-05-18T14:32:10.124Z"
}
```

---

## 2. Health & Readiness Probes
- **Liveness (`/api/health`)**:
  - Instant response confirming the FastAPI process is active.
  - Used by AWS Application Load Balancer target groups and Docker healthchecks.
- **Readiness (`/api/ready`)**:
  - Verifies active database connection pool reachability (`SELECT 1`).
  - Returns HTTP 503 if MySQL is temporarily unreachable.

---

## 3. Amazon CloudWatch Integration
The CloudWatch agent configured in `infrastructure/aws/cloudwatch-agent-config.json` streams:
1. Docker container logs to `/aws/ec2/nexusnotes-docker-containers`.
2. Nginx access logs to `/aws/ec2/nexusnotes-nginx-access`.
3. Host metrics (CPU, Memory % used, Disk % used).
