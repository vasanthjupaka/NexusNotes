# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

---

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities as public GitHub issues.**

Security vulnerabilities should be reported privately to allow us to fix them
before they are disclosed publicly. This protects users of NexusNotes from
being exploited.

### How to Report

**Email:** security@nexusnotes.dev

Please include:
1. **Description** of the vulnerability
2. **Steps to reproduce** the issue
3. **Potential impact** (what an attacker could achieve)
4. **Suggested fix** (optional but appreciated)
5. **Your contact information** for follow-up questions

### What to Expect

- **Acknowledgement** within 48 hours of your report
- **Status update** within 7 days with our assessment
- **Resolution timeline** communicated as soon as we have one
- **Credit** in the security advisory if you wish (optional)

We aim to resolve critical vulnerabilities within **14 days** and will keep you
informed throughout the process.

---

## Security Best Practices for Deployment

### Never Commit Secrets

```bash
# These must NEVER be in your repository:
.env
*.pem
*.key
AWS credentials
JWT secrets
Database passwords
```

### Environment Variables

Use `.env.example` as a template. Copy it to `.env` (which is gitignored) and
fill in real values only for local development. In production, use:

- **AWS Secrets Manager** for sensitive credentials
- **EC2 IAM Roles** for AWS service access (never use long-term access keys on EC2)
- **Environment variables** injected at runtime via Docker or systemd

### AWS IAM

- Use **least privilege** — grant only the permissions required
- Use **IAM Roles** for EC2 — never put access keys on EC2 instances
- Rotate access keys regularly for local development
- Use **resource-level permissions** in S3 policies

### S3

- Keep buckets **private** by default
- Never enable public write access
- Use **pre-signed URLs** for temporary access
- Enable **bucket versioning** for important data
- Enable **server-side encryption** (SSE-S3 or SSE-KMS)

### Database

- Use strong, unique passwords
- Restrict network access to the database
- Never expose MySQL directly to the internet
- Use a dedicated database user with minimal permissions

### Docker

- Use **non-root users** inside containers
- Scan images with **Trivy** or similar before pushing to ECR
- Use **pinned image versions** — never use `:latest` as the only tag
- Do not put secrets in `Dockerfile` or `docker-compose.yml`

### JWT

- Use a strong, randomly generated secret (minimum 256 bits)
- Set appropriate expiry times
- Use HTTPS in production — never send tokens over HTTP

---

## Known Security Considerations

### File Upload Validation

NexusNotes validates uploaded files for:
- MIME type
- File extension (whitelist approach)
- File size limits
- Image dimensions

Executable files are rejected. See [docs/security.md](docs/security.md) for details.

### SQL Injection

NexusNotes uses SQLAlchemy ORM with parameterized queries. Direct SQL string
interpolation is never used.

### XSS

Markdown content is sanitized before rendering. The `DOMPurify` library is used
on the frontend.

---

## Security Contact

**Email:** security@nexusnotes.dev

We take security seriously and appreciate responsible disclosure.
