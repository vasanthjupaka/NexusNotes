# Security Architecture & Best Practices — NexusNotes

## 1. Zero Secrets in Source Code
- `.env` files and private keys are strictly gitignored via root `.gitignore`.
- `.env.example` provides non-sensitive variable schema documentation only.
- In production, credentials should be injected via AWS Secrets Manager or secure environment variables.

---

## 2. Authentication & Cryptography
- **Password Hashing**: Bcrypt with automatic salt generation via `passlib[bcrypt]`.
- **JWT Verification**: Validated on every protected endpoint using HS256 algorithm with strict type and expiry checks.
- **Timing Attack Mitigation**: Login verification uses constant-time string comparison.

---

## 3. Storage Security (AWS S3)
- **Bucket Visibility**: Completely private with all public access blocked.
- **Server-Side Encryption**: `AES256` enabled on all uploaded objects.
- **Pre-Signed URLs**: Direct S3 access links are time-limited to 1 hour (3600 seconds).

---

## 4. Input Sanitization & Attack Mitigations
- **SQL Injection**: Prevented by using SQLAlchemy 2 parameterized ORM query bindings. Direct string concatenation into queries is forbidden.
- **Cross-Site Scripting (XSS)**: Markdown rendered in HTML is sanitized on the client using `DOMPurify`.
- **File Upload Attacks**: Executable files are blocked by validating MIME types, file extensions, and performing binary header checks using PIL.
- **CORS Policies**: Explicit allowlist restricted to verified frontend domains.
