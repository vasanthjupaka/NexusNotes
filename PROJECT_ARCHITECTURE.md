# NexusNotes — Project Architecture

## Overview

NexusNotes is a cloud-native, full-stack knowledge-management platform designed
as a modern, open-source alternative inspired by the concepts of Obsidian and Notion.

The application is independently implemented. No proprietary source code, assets,
or branding from any commercial application has been used.

---

## High-Level Architecture

```mermaid
flowchart TD
    subgraph Client["🖥️ Client"]
        Browser["Browser\n(React + TypeScript + Vite)"]
    end

    subgraph Docker["🐳 Docker Compose / EC2"]
        Nginx["Nginx\n(Reverse Proxy)"]
        Frontend["Frontend Container\n(Nginx serving React SPA)"]
        Backend["Backend Container\n(FastAPI / Python 3.12)"]
        DB["MySQL 8\n(Primary Database)"]
        MinIO["MinIO\n(S3-compatible — dev only)"]
    end

    subgraph AWS["☁️ AWS (Production)"]
        EC2["Amazon EC2\n(Docker host)"]
        S3["Amazon S3\n(Image / file storage)"]
        ECR["Amazon ECR\n(Container registry)"]
        IAM["AWS IAM\n(Roles & policies)"]
        CW["Amazon CloudWatch\n(Logging & monitoring)"]
    end

    Browser --> Nginx
    Nginx -->|"/ → static"| Frontend
    Nginx -->|"/api/ → proxy"| Backend
    Backend --> DB
    Backend -->|"boto3 (IAM Role)"| S3
    Backend -->|"Structured logs"| CW
    EC2 --> S3
    EC2 --> ECR
    IAM --> EC2
```

---

## Application Request Flow

```mermaid
sequenceDiagram
    participant U as Browser
    participant N as Nginx
    participant F as FastAPI
    participant D as MySQL
    participant S as S3

    U->>N: HTTPS Request
    N->>F: /api/* → FastAPI
    F->>F: Auth middleware (JWT)
    F->>D: Query (SQLAlchemy async)
    D-->>F: Result
    alt Image upload
        F->>S: boto3 PutObject
        S-->>F: ETag / URL
    end
    F-->>N: JSON Response
    N-->>U: Response

    note over U,N: Static assets served directly by Nginx (no backend hit)
```

---

## CI/CD Pipeline

```mermaid
flowchart LR
    Dev["Developer\nPush / PR"] --> GH["GitHub"]
    GH --> CI["GitHub Actions\nCI Workflow\n(lint + test)"]
    CI -->|pass| Docker["Docker Build\n& Scan (Trivy)"]
    Docker --> ECR["Push to\nAWS ECR"]
    ECR --> Deploy["Deploy Workflow\n(SSM / SSH)"]
    Deploy --> EC2["EC2 Instance\nDocker Compose pull & up"]
    EC2 --> Health["Health Check\n/api/health"]
    Health -->|fail| Rollback["Rollback\n(previous image)"]
    Health -->|pass| Done["✅ Deployed"]
```

---

## Detailed Component Architecture

### Frontend

```
frontend/src/
├── components/
│   ├── ui/           ← shadcn/ui primitives (Button, Dialog, etc.)
│   ├── layout/       ← AppShell, Sidebar, TopBar, ContextPanel
│   ├── editor/       ← CodeMirror 6 Markdown editor + toolbar
│   ├── graph/        ← D3.js force-directed knowledge graph
│   ├── search/       ← Search bar + Command palette (Ctrl+K)
│   ├── attachments/  ← Fabric.js image editor + upload
│   └── notes/        ← NoteList, NoteCard, BacklinkPanel
├── hooks/            ← useNotes, useAuth, useSearch, useGraph…
├── stores/           ← Zustand (auth, ui, editor, sidebar)
├── services/         ← API client (Axios + TanStack Query)
├── pages/            ← Login, Register, Dashboard, Graph, Settings
├── lib/              ← utils, zod schemas, constants
└── types/            ← TypeScript interfaces and types
```

**State Management Strategy:**

| State Type | Tool |
|---|---|
| Global auth state | Zustand |
| UI state (sidebar, theme) | Zustand |
| Server state (notes, folders) | TanStack Query |
| Form state | React Hook Form + Zod |
| Editor state | CodeMirror state |

---

### Backend

```
backend/app/
├── api/v1/
│   ├── auth.py        ← POST /register, /login, /logout, GET /me
│   ├── notes.py       ← Full CRUD, revisions, backlinks, related
│   ├── folders.py     ← Folder tree CRUD
│   ├── tags.py        ← Tag CRUD
│   ├── attachments.py ← Upload, download (presigned), edit, delete
│   ├── search.py      ← Full-text search endpoint
│   ├── graph.py       ← Graph nodes + edges for D3
│   └── health.py      ← /health + /ready
├── core/
│   ├── config.py      ← Pydantic BaseSettings (typed config)
│   ├── security.py    ← JWT encode/decode, password hashing
│   ├── logging.py     ← Structured JSON logging
│   └── middleware.py  ← Request ID, timing, error handling
├── db/
│   ├── base.py        ← SQLAlchemy DeclarativeBase
│   └── session.py     ← Async engine, session factory, Depends()
├── models/            ← ORM models (8 tables)
├── schemas/           ← Pydantic request/response schemas
├── repositories/      ← DB access layer (no business logic)
├── services/          ← Business logic (wiki-link parsing, S3, etc.)
├── dependencies/      ← FastAPI Depends() — auth, pagination, etc.
└── main.py            ← App factory with lifespan
```

**Layer Responsibility:**

```
Route Handler → Schema validation → Service → Repository → DB
                     ↓
              Return Schema → JSON Response
```

---

## Database Architecture

```mermaid
erDiagram
    users {
        BIGINT id PK
        VARCHAR username UK
        VARCHAR email UK
        VARCHAR password_hash
        VARCHAR display_name
        VARCHAR avatar_url
        DATETIME created_at
        DATETIME updated_at
        DATETIME last_login_at
        BOOLEAN is_active
    }

    folders {
        BIGINT id PK
        BIGINT user_id FK
        VARCHAR name
        BIGINT parent_id FK
        DATETIME created_at
        DATETIME updated_at
    }

    notes {
        BIGINT id PK
        BIGINT user_id FK
        VARCHAR title
        VARCHAR slug UK
        LONGTEXT content
        TEXT excerpt
        BIGINT folder_id FK
        BOOLEAN is_favorite
        BOOLEAN is_archived
        BOOLEAN is_deleted
        DATETIME created_at
        DATETIME updated_at
        DATETIME deleted_at
    }

    tags {
        BIGINT id PK
        BIGINT user_id FK
        VARCHAR name
        DATETIME created_at
    }

    note_tags {
        BIGINT note_id FK
        BIGINT tag_id FK
    }

    note_links {
        BIGINT id PK
        BIGINT source_note_id FK
        BIGINT target_note_id FK
        DATETIME created_at
    }

    attachments {
        BIGINT id PK
        BIGINT user_id FK
        BIGINT note_id FK
        VARCHAR original_filename
        VARCHAR object_key
        VARCHAR bucket_name
        VARCHAR content_type
        INT file_size
        INT width
        INT height
        DATETIME created_at
        DATETIME updated_at
    }

    note_revisions {
        BIGINT id PK
        BIGINT note_id FK
        LONGTEXT content
        DATETIME created_at
        BIGINT created_by FK
    }

    users ||--o{ folders : owns
    users ||--o{ notes : owns
    users ||--o{ tags : owns
    users ||--o{ attachments : uploads
    folders ||--o{ notes : contains
    folders ||--o{ folders : "parent→child"
    notes ||--o{ note_tags : has
    tags ||--o{ note_tags : applied_to
    notes ||--o{ note_links : "source→"
    notes ||--o{ note_links : "→target"
    notes ||--o{ note_revisions : has
    notes ||--o{ attachments : has
```

---

## S3 Storage Architecture

```mermaid
flowchart TD
    Upload["User uploads image\nin note editor"]
    Validate["Backend validates\nMIME, extension, size, dimensions"]
    UUID["Generate unique key:\nusers/{uid}/notes/{nid}/{uuid}-{filename}"]
    S3["Upload to S3/MinIO\n(private bucket)"]
    DB["Save metadata to\nattachments table"]
    Presign["Generate pre-signed URL\nfor display (1h expiry)"]

    Upload --> Validate --> UUID --> S3
    S3 --> DB
    DB --> Presign
    Presign -->|"Signed URL"| Browser["Browser renders image"]
```

**Object Key Format:**
```
users/{user_id}/notes/{note_id}/{uuid4}-{sanitized_filename}
```

**Example:**
```
users/42/notes/17/3f8a2b1c-d4e5-...-my-diagram.png
```

---

## Security Architecture

```mermaid
flowchart TD
    subgraph Authentication
        Login["POST /api/auth/login"] --> JWT["Generate JWT\n(HS256, 60min expiry)"]
        JWT --> Cookie["httpOnly Cookie\n(refresh token)"]
        JWT --> Header["Authorization: Bearer\n(access token)"]
    end

    subgraph Authorization
        Req["Authenticated Request"] --> Middleware["JWT Middleware\nVerify + Decode"]
        Middleware --> Dep["get_current_user\nDependency"]
        Dep --> Check["User owns resource?\n(user_id check)"]
    end

    subgraph InputValidation
        API["API Endpoint"] --> Pydantic["Pydantic Schema\nValidation"]
        Pydantic --> Service["Service Layer\nBusiness Rules"]
    end

    subgraph FileUpload
        File["Uploaded File"] --> MimeCheck["MIME Type Check\n(whitelist)"]
        MimeCheck --> ExtCheck["Extension Check\n(whitelist)"]
        ExtCheck --> SizeCheck["Size Check\n(≤ 10MB)"]
        SizeCheck --> DimCheck["Dimension Check"]
        DimCheck --> S3Upload["Upload to S3"]
    end
```

---

## AWS Architecture (Production)

```mermaid
flowchart TD
    Internet["Internet"] --> ALB["Application Load Balancer\n(Phase 2 — optional)"]
    ALB --> EC2["EC2 Instance\nt3.small or t3.medium"]
    EC2 --> Docker["Docker Compose\n(Nginx + Frontend + Backend + MySQL)"]
    Docker --> S3["Amazon S3\nnexusnotes-assets (private)"]

    subgraph IAM["AWS IAM"]
        Role["EC2 IAM Role\nnexusnotes-ec2-role"]
        Policy["S3 Policy:\nGetObject, PutObject, DeleteObject\non nexusnotes-assets/*"]
        Role --> Policy
    end

    EC2 --> Role

    subgraph ECR["AWS ECR"]
        FrontendRepo["nexusnotes/frontend"]
        BackendRepo["nexusnotes/backend"]
        NginxRepo["nexusnotes/nginx"]
    end

    CICD["GitHub Actions"] --> ECR
    CICD --> EC2

    EC2 --> CW["CloudWatch\nLogs + Metrics"]
```

---

## Technology Stack Summary

| Category | Technology | Version |
|---|---|---|
| Frontend | React | 18 |
| Frontend | TypeScript | 5 |
| Frontend | Vite | 5 |
| Frontend | Tailwind CSS | 3 |
| Frontend | shadcn/ui | latest |
| Frontend | TanStack Query | 5 |
| Frontend | Zustand | 4 |
| Frontend | React Hook Form | 7 |
| Frontend | Zod | 3 |
| Frontend | CodeMirror | 6 |
| Frontend | D3.js | 7 |
| Frontend | Fabric.js | 5 |
| Backend | Python | 3.12 |
| Backend | FastAPI | 0.110+ |
| Backend | SQLAlchemy | 2 |
| Backend | Pydantic | 2 |
| Backend | Alembic | 1.13+ |
| Backend | python-jose | 3 |
| Backend | passlib (bcrypt) | 1.7+ |
| Backend | boto3 | 1.34+ |
| Database | MySQL | 8.0 |
| Proxy | Nginx | 1.25 |
| Container | Docker | 24+ |
| CI/CD | GitHub Actions | — |
| Registry | AWS ECR | — |
| Compute | AWS EC2 | — |
| Storage | AWS S3 | — |

---

## Future Architecture Phases

```mermaid
gantt
    title NexusNotes Roadmap
    dateFormat  YYYY-MM
    section Phase 1 (MVP)
    Monolith on EC2          :done, 2024-01, 2024-03
    section Phase 2
    RDS MySQL                :2024-04, 1M
    CloudFront CDN           :2024-04, 1M
    Route 53 + ACM           :2024-04, 1M
    section Phase 3
    Redis caching            :2024-05, 1M
    Background workers       :2024-05, 1M
    section Phase 4
    EKS Kubernetes           :2024-06, 2M
    section Phase 5
    OpenSearch full-text     :2024-08, 1M
    AI features              :2024-09, 2M
```
