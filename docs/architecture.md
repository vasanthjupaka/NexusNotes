# Architecture Guide — NexusNotes

## System Overview

NexusNotes is engineered as an enterprise-ready, open-source personal knowledge management (PKM) and thought-architecture platform. It draws inspiration from bidirectional linking concepts in tools like Obsidian and Notion, but is independently architected from first principles.

```
┌───────────────────────────────────────────────────────────┐
│                      Client Layer                         │
│   React 18 + TypeScript + CodeMirror 6 + D3.js + Fabric.js │
└─────────────────────────────┬─────────────────────────────┘
                              │ HTTP / JSON
                              ▼
┌───────────────────────────────────────────────────────────┐
│                    Reverse Proxy Layer                    │
│                      Nginx 1.27                           │
│     - SSL Termination                                     │
│     - Static SPA Delivery                                 │
│     - API Gateway Routing to FastAPI                      │
│     - Security Headers (CSP, HSTS, X-Frame-Options)       │
└─────────────────────────────┬─────────────────────────────┘
                              │ /api/v1/*
                              ▼
┌───────────────────────────────────────────────────────────┐
│                    Application Layer                      │
│                FastAPI (Python 3.12)                      │
│  - Routers (Auth, Notes, Folders, Tags, Attachments)       │
│  - Services (Wiki Parser, S3 Handler, Revision Tracker)   │
│  - Repositories (Async SQLAlchemy 2 Data Layer)           │
│  - Middleware (RequestID, Timing, Structured JSON Logger) │
└──────────────┬─────────────────────────────┬──────────────┘
               │ Async DSN                   │ Boto3 SDK (IAM)
               ▼                             ▼
┌───────────────────────────┐ ┌─────────────────────────────┐
│      Database Layer       │ │    Object Storage Layer     │
│          MySQL 8          │ │   Amazon S3 (MinIO in dev)  │
│ - Normalized Relational   │ │ - Raw / Edited Images       │
│ - Full-Text Search Engine │ │ - Private Bucket            │
│ - Backlink Graph Index    │ │ - Pre-Signed URL Access     │
└───────────────────────────┘ └─────────────────────────────┘
```

---

## Architectural Principles

### 1. Clean Separation of Concerns (Layered Architecture)
The backend does **not** allow business logic inside FastAPI route handlers.
- **Routers**: Pure HTTP mapping, status codes, OpenAPI metadata, dependency injection.
- **Services**: Business rules, wiki link parsing, image processing, revision creation.
- **Repositories**: Database queries using SQLAlchemy 2 async construct expressions.
- **Models**: ORM definitions matching normalized MySQL database tables.

### 2. Bidirectional Linking Engine
When a note is created or updated:
1. The **Wiki-Link Parser** regex extracts `[[Target Title]]` link tokens.
2. Target note IDs are resolved via a single indexed query.
3. Outgoing and incoming records are upserted in the indexed `note_links` table.
4. Backlink queries are executed via simple indexed relational joins ($O(1)$ lookup per note) rather than expensive runtime full-text scans.

### 3. Separation of Metadata and Binary Content
- **Database (MySQL)**: Only stores structured metadata (`user_id`, `object_key`, `content_type`, `file_size`, `width`, `height`).
- **Object Storage (Amazon S3 / MinIO)**: Stores raw and annotated image binary files.

---

## Scalability & Future Roadmap

1. **Caching Layer (Phase 3)**: Redis cluster for session cache, note link adjacency lists, and rate limiting counters.
2. **Container Orchestration (Phase 4)**: AWS EKS (Kubernetes) with Karpenter autoscaling and ALB Ingress Controller.
3. **Dedicated Search (Phase 5)**: Elasticsearch / OpenSearch indexing for semantic vector embeddings and typo-tolerant search.
