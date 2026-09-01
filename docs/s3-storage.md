# S3 Storage & Asset Architecture — NexusNotes

## S3 Bucket Design

- **Bucket Name Convention**: `nexusnotes-assets-<environment>-<region>`
- **Access Level**: Private (Block Public Access enabled for all 4 settings)
- **Encryption**: Server-Side Encryption with Amazon S3 managed keys (`AES256` / SSE-S3)
- **Object Key Schema**:
  ```
  nexusnotes-assets/
  └── users/
      └── {user_id}/
          └── notes/
              └── {note_id}/
                  └── {uuid4}-{sanitized_filename}
  ```

---

## Why Pre-Signed URLs?

1. **Security**: Keeps the S3 bucket 100% private. No public read access is ever granted.
2. **Reduced Server Load**: The frontend downloads images directly from AWS S3 CDN/endpoints rather than streaming gigabytes through Python backend memory.
3. **Time-Bound Access**: Pre-signed URLs expire in 1 hour (3600s), preventing unauthorized sharing or stale link scraping.

---

## Boto3 Client Initialization with IAM Roles

```python
# app/services/s3_service.py
# In AWS EC2, boto3 automatically retrieves temporary rotating credentials
# from the Instance Metadata Service (IMDSv2) via the attached IAM Role.
s3_client = boto3.client(
    "s3",
    region_name=settings.aws_region,
)
```

---

## Upload Validation Workflow

```
Client Uploads File
       │
       ▼
MIME Type Allowlist Check (image/jpeg, image/png, image/webp, image/svg+xml)
       │
       ▼
File Extension Whitelist Check (.jpg, .png, .webp, .svg)
       │
       ▼
File Size Validation (<= 10MB)
       │
       ▼
PIL Image Verification (Detects corrupted or polyglot files)
       │
       ▼
Generate UUID Object Key -> Upload to S3 -> Save Metadata to MySQL
```
