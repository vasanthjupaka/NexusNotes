# API Documentation — NexusNotes REST API

## Base URLs
- **Development**: `http://localhost:8000/api/v1`
- **Reverse Proxy**: `http://localhost/api/v1`
- **Interactive OpenAPI Documentation**: `http://localhost:8000/docs`

---

## Authentication Endpoints

### `POST /auth/register`
Create a new user account.
```json
// Request Body
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "display_name": "John Doe"
}
```

### `POST /auth/login`
Authenticate credentials and obtain JWT access token.
```json
// Response Body
{
  "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### `GET /auth/me`
Fetch current user profile using `Authorization: Bearer <token>`.

---

## Notes Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/notes` | List notes with pagination and filters (`folder_id`, `is_favorite`, `tag_id`, `is_deleted`) |
| `POST` | `/notes` | Create a new note and trigger automatic wiki-link indexing |
| `GET` | `/notes/{id}` | Get full note detail with raw Markdown content |
| `PUT` | `/notes/{id}` | Update note content, title, tags, or folder |
| `DELETE`| `/notes/{id}` | Soft-delete note (move to trash) |
| `POST` | `/notes/{id}/restore` | Restore soft-deleted note |
| `GET` | `/notes/{id}/backlinks` | Fetch list of notes containing `[[This Note Title]]` |
| `GET` | `/notes/{id}/revisions` | Get list of historical snapshots |
| `GET` | `/notes/{id}/revisions/{rev_id}` | Retrieve content of a specific historical snapshot |

---

## Knowledge Graph Endpoints

### `GET /graph`
Returns all notes as graph nodes and bidirectional wiki-links as edges formatted for D3.js.
```json
{
  "nodes": [
    { "id": 1, "title": "AWS EC2", "slug": "aws-ec2-1", "tag_names": ["aws"] },
    { "id": 2, "title": "AWS S3", "slug": "aws-s3-2", "tag_names": ["aws"] }
  ],
  "edges": [
    { "source": 1, "target": 2 }
  ]
}
```

---

## Attachments & S3 Endpoints

### `POST /attachments/upload`
Upload an image (`multipart/form-data`). Validates MIME type, file extension whitelist, and size. Stores object in S3/MinIO and returns pre-signed access URL.

### `DELETE /attachments/{id}`
Removes object key from S3 bucket and deletes database metadata record.

---

## Health & Monitoring Endpoints

- `GET /api/health`: Instant liveness check (200 OK).
- `GET /api/ready`: Readiness probe verifying active MySQL connection pool health.
