# NexusNotes — Full-Stack Cloud-Native Knowledge Management Platform

[![CI Pipeline](https://github.com/vasanthjupaka/NexusNotes/actions/workflows/ci.yml/badge.svg)](https://github.com/vasanthjupaka/NexusNotes/actions/workflows/ci.yml)
[![Docker Build & Scan](https://github.com/vasanthjupaka/NexusNotes/actions/workflows/docker.yml/badge.svg)](https://github.com/vasanthjupaka/NexusNotes/actions/workflows/docker.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%28Python%203.12%29-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20TypeScript-61DAFB.svg?logo=react)](https://reactjs.org)
[![AWS](https://img.shields.io/badge/AWS-EC2%20%7C%20S3%20%7C%20IAM%20%7C%20ECR-FF9900.svg?logo=amazonaws)](https://aws.amazon.com)
[![MySQL](https://img.shields.io/badge/Database-MySQL%208-4479A1.svg?logo=mysql)](https://www.mysql.com)

> **NexusNotes** is an open-source, full-stack personal knowledge management (PKM) and thought architecture platform built with modern cloud-native patterns. It features bidirectional note linking (`[[Wiki Links]]`), real-time interactive knowledge graphs with D3.js, CodeMirror 6 markdown editing, image attachments with Amazon S3, and automated AWS EC2 containerized deployment pipelines.

---

## Key Features

- 📝 **Markdown-First Editing**: Powered by CodeMirror 6 with live preview, syntax highlighting, and table/checklist formatting.
- 🔗 **Bidirectional Note Linking (`[[...]]`)**: Wiki-style note referencing with live autocomplete and automatic reverse backlink indexing.
- 🕸️ **Interactive Knowledge Graph**: D3.js force-directed visualizer with zoom, pan, neighbor highlighting, and tag filtering.
- 🖼️ **Asset Storage with AWS S3 / MinIO**: Binary images stored securely in private S3 buckets using short-lived pre-signed URLs.
- 🎨 **Built-In Image Editor**: Fabric.js canvas editor supporting crop, rotate, flip, and freehand/box annotations.
- ⚡ **Full-Text Search & Command Palette**: Instant fuzzy search across titles and contents with global `Ctrl/Cmd+K` keyboard triggers.
- ⏱️ **Debounced Autosave & Version History**: Seamless autosave with status badges and one-click revision rollback.
- 📁 **Folders & Tag Organization**: Multi-level hierarchical folder trees and custom tag filtering.
- 🌙 **Dark & Light Mode**: Premium developer-focused theme tokens with glassmorphism styling.
- 🔒 **Enterprise-Grade Security**: Bcrypt password hashing, stateless JWT tokens with httpOnly cookies, and strict IAM least privilege.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                           │
│   React 18 + TypeScript + CodeMirror 6 + D3.js + Fabric.js   │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTP / JSON
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Reverse Proxy Layer                      │
│                        Nginx 1.27                           │
│   - SPA Routing & Caching  - API Proxying to FastAPI        │
└─────────────────────────────┬───────────────────────────────┘
                              │ /api/v1/*
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│                  FastAPI (Python 3.12)                      │
│   - Routers  - Services  - Repositories  - Structured Logs  │
└──────────────┬──────────────────────────────┬───────────────┘
               │ Async SQLAlchemy 2           │ Boto3 SDK (IAM Role)
               ▼                              ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│        Database Layer       │ │    Object Storage Layer     │
│           MySQL 8           │ │   Amazon S3 (MinIO in dev)  │
│ - Normalized Relational     │ │ - Private Bucket            │
│ - Backlinks Graph Index     │ │ - Pre-Signed URL Streaming  │
└─────────────────────────────┘ └─────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, TypeScript 5, Vite | Single Page Application framework |
| **Styling** | Tailwind CSS v3, Radix / shadcn/ui | Design tokens and accessible UI primitives |
| **Editor** | CodeMirror 6 | Markdown editor and wiki-link autocompletion |
| **Graph** | D3.js v7 | Force-directed knowledge graph visualization |
| **Canvas** | Fabric.js v5 | Canvas-based image annotation and editing |
| **Backend** | Python 3.12, FastAPI | High-performance asynchronous REST API |
| **Database** | MySQL 8.0, SQLAlchemy 2 (Async) | Normalized data storage and full-text search |
| **Storage** | Amazon S3 / MinIO | Private object storage for media attachments |
| **Reverse Proxy** | Nginx 1.27 | API gateway, SSL termination, and SPA delivery |
| **CI/CD** | GitHub Actions | Automated lint, unit tests, Trivy scan, and ECR push |
| **Cloud Hosting** | AWS EC2, AWS IAM, AWS ECR | Containerized hosting with IAM instance profiles |

---

## Quick Start (Local Development)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v24+)
- [Make](https://www.gnu.org/software/make/)

### 1. Clone & Initialize
```bash
git clone https://github.com/vasanthjupaka/NexusNotes.git
cd NexusNotes

# Setup environment configuration
make setup
```

### 2. Start Services
```bash
# Start all containers with hot reload (Frontend, Backend, MySQL, MinIO, Nginx)
make dev
```

### 3. Seed Demo Data
In another terminal, populate realistic demonstration notes and relationships:
```bash
make seed
```

### 4. Access the Application
- **Frontend Web App**: [http://localhost:5173](http://localhost:5173) or [http://localhost](http://localhost)
- **FastAPI Interactive Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **MinIO Storage Dashboard**: [http://localhost:9001](http://localhost:9001) (User: `minioadmin` / Pass: `minioadmin_secret`)

**Default Demo Credentials:**
- Email: `demo@nexusnotes.dev`
- Password: `demopassword123`

---

## Development & Testing Commands

```bash
# Run automated tests (Backend Pytest + Frontend Vitest)
make test

# Lint codebases (Ruff + ESLint)
make lint

# Format code (Black + Prettier)
make format

# View aggregated container logs
make logs

# Stop containers
make down
```

---

## AWS Deployment Architecture

NexusNotes is engineered for deployment on **Amazon EC2** using IAM Roles and **Amazon S3**:
1. **GitHub Actions CI** verifies linters and test suites on every pull request.
2. On merge to `main`, **Docker workflows** build multi-stage images, scan for vulnerabilities using **Aqua Security Trivy**, and publish immutable version tags to **Amazon ECR**.
3. The EC2 instance pulls images securely using instance profile credentials (no long-lived AWS keys on the host).
4. Full deployment walkthrough is detailed in [docs/ec2-deployment.md](docs/ec2-deployment.md).

---

## Documentation Index

- [Project Architecture Guide](docs/architecture.md)
- [Frontend Architecture](docs/frontend.md)
- [Backend Architecture](docs/backend.md)
- [Database Schema & Migrations](docs/database.md)
- [REST API Reference](docs/api.md)
- [Docker & Containerization](docs/docker.md)
- [AWS Cloud Architecture](docs/aws-architecture.md)
- [AWS S3 Storage Architecture](docs/s3-storage.md)
- [Amazon EC2 Deployment Guide](docs/ec2-deployment.md)
- [CI/CD Pipelines & GitHub Actions](docs/cicd.md)
- [Security Policies & Best Practices](docs/security.md)
- [Monitoring & CloudWatch Observability](docs/monitoring.md)
- [Troubleshooting Common Issues](docs/troubleshooting.md)
- [Local Development Guide](docs/development.md)

---

## Contributing & License

Contributions are welcome! Please review [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

Distributed under the [MIT License](LICENSE).
