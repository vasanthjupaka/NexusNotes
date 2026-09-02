"""
NexusNotes — Database Seed Script

Populates the database with realistic development data.
Safe to run multiple times (idempotent).

Usage:
    python scripts/seed.py
    # or via Make:
    make seed
"""

import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.folder import Folder
from app.models.note import Note
from app.models.note_link import NoteLink
from app.models.tag import Tag, note_tags
from app.models.user import User


SEED_USER = {
    "username": "demo",
    "email": "demo@nexusnotes.dev",
    "password": "demopassword123",
    "display_name": "Demo User",
}

SEED_TAGS = ["aws", "docker", "python", "kubernetes", "networking", "databases"]

SEED_FOLDERS = [
    {"name": "Cloud Infrastructure", "parent": None},
    {"name": "Programming", "parent": None},
    {"name": "AWS Services", "parent": "Cloud Infrastructure"},
    {"name": "Containers", "parent": "Cloud Infrastructure"},
]

SEED_NOTES = [
    {
        "title": "AWS EC2 Overview",
        "folder": "AWS Services",
        "tags": ["aws"],
        "content": """# AWS EC2 Overview

Amazon Elastic Compute Cloud (EC2) provides scalable computing capacity in the AWS Cloud.

## Key Concepts

- **Instance Types**: Choose CPU/memory/storage profiles (t3.micro, m5.large, etc.)
- **AMIs**: Amazon Machine Images — pre-configured OS images
- **Security Groups**: Virtual firewalls controlling inbound/outbound traffic
- **IAM Roles**: Grant EC2 instances permissions to access AWS services

## Instance Lifecycle

```
Launch → Running → Stopped → Terminated
```

## Related

See also [[AWS S3]] for object storage and [[AWS IAM]] for access control.

## NexusNotes Deployment

NexusNotes runs on EC2 using Docker Compose. The EC2 instance has an IAM role
that grants access to S3 for image storage without needing hardcoded credentials.
""",
    },
    {
        "title": "AWS S3",
        "folder": "AWS Services",
        "tags": ["aws"],
        "content": """# AWS S3

Amazon Simple Storage Service (S3) is object storage built for any amount of data.

## Key Concepts

- **Buckets**: Top-level containers for objects
- **Objects**: Files stored in buckets (up to 5TB each)
- **Pre-signed URLs**: Temporary access links for private objects
- **IAM Policies**: Control who can access what

## Security Best Practices

1. Keep buckets **private** by default
2. Never enable public write access
3. Use **IAM roles** for EC2 — not access keys
4. Enable **server-side encryption** (SSE-AES256)
5. Use **pre-signed URLs** for temporary access

## NexusNotes Usage

NexusNotes stores all uploaded images in S3:

```
users/{user_id}/notes/{note_id}/{uuid}-{filename}
```

Images are never stored in MySQL — only metadata (key, bucket, dimensions).

Related: [[AWS EC2]], [[AWS IAM]]
""",
    },
    {
        "title": "AWS IAM",
        "folder": "AWS Services",
        "tags": ["aws"],
        "content": """# AWS IAM

AWS Identity and Access Management (IAM) controls access to AWS services.

## Core Concepts

- **Users**: Human identities
- **Roles**: AWS service identities (EC2, Lambda, etc.)
- **Policies**: JSON documents defining permissions
- **Groups**: Collections of users

## Least Privilege Principle

Grant only the permissions required — nothing more.

**NexusNotes EC2 Role Policy:**
```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
  "Resource": "arn:aws:s3:::nexusnotes-assets/*"
}
```

## Related

[[AWS EC2]], [[AWS S3]]
""",
    },
    {
        "title": "Docker Fundamentals",
        "folder": "Containers",
        "tags": ["docker"],
        "content": """# Docker Fundamentals

Docker packages applications and their dependencies into portable containers.

## Key Concepts

- **Image**: Read-only template for creating containers
- **Container**: Running instance of an image
- **Dockerfile**: Recipe for building an image
- **Registry**: Stores and distributes images (Docker Hub, AWS ECR)

## NexusNotes Docker Architecture

```
nginx (reverse proxy)
  ├── frontend (React SPA)
  └── backend (FastAPI)

db (MySQL 8)
minio (S3-compatible storage)
```

## Best Practices

1. Use **multi-stage builds** to minimize image size
2. Run as **non-root user**
3. Use **pinned versions** — never rely on `latest` alone
4. Add **health checks**
5. Never put **secrets** in images

Related: [[AWS ECR]]
""",
    },
    {
        "title": "AWS ECR",
        "folder": "AWS Services",
        "tags": ["aws", "docker"],
        "content": """# AWS ECR

Amazon Elastic Container Registry (ECR) is a fully managed Docker registry.

## Why ECR?

- Integrates natively with EC2 and ECS
- Private by default — no public exposure
- Works with IAM for access control
- Automatic vulnerability scanning

## NexusNotes Repositories

```
nexusnotes/frontend
nexusnotes/backend
nexusnotes/nginx
```

## CI/CD Flow

```
GitHub Actions → Build → Tag → Push to ECR → Deploy to EC2
```

Related: [[Docker Fundamentals]], [[AWS EC2]]
""",
    },
    {
        "title": "Python FastAPI Patterns",
        "folder": "Programming",
        "tags": ["python"],
        "content": """# Python FastAPI Patterns

Patterns used in NexusNotes backend.

## App Factory Pattern

```python
def create_app() -> FastAPI:
    app = FastAPI(lifespan=lifespan)
    app.add_middleware(...)
    app.include_router(...)
    return app

app = create_app()
```

## Repository Pattern

Database access is isolated in repository classes:

```python
class NoteRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, note_id: int) -> Note | None:
        ...
```

## Service Layer

Business logic lives in services, not routes:

```python
class NoteService:
    def __init__(self, db: AsyncSession):
        self.repo = NoteRepository(db)

    async def create_note(self, user, data) -> NoteDetail:
        ...
```
""",
    },
]


async def seed() -> None:
    print("🌱 Seeding database...")
    settings = get_settings()

    # Ensure all tables exist before querying or inserting data
    from app.models import Base
    from app.db.session import engine

    print("  📦 Ensuring all database tables exist...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("  ✅ Database schema verified.")

    async with AsyncSessionLocal() as db:
        # ── User ──────────────────────────────────────────────────────────────
        from sqlalchemy import select
        existing_user = (
            await db.execute(select(User).where(User.email == SEED_USER["email"]))
        ).scalar_one_or_none()

        if existing_user:
            print(f"  ℹ️  User {SEED_USER['email']} already exists, skipping user creation")
            user = existing_user
        else:
            user = User(
                username=SEED_USER["username"],
                email=SEED_USER["email"],
                password_hash=hash_password(SEED_USER["password"]),
                display_name=SEED_USER["display_name"],
            )
            db.add(user)
            await db.flush()
            print(f"  ✅ Created user: {user.email}")

        # ── Tags ──────────────────────────────────────────────────────────────
        tag_map: dict[str, Tag] = {}
        for tag_name in SEED_TAGS:
            existing = (
                await db.execute(
                    select(Tag).where(Tag.user_id == user.id, Tag.name == tag_name)
                )
            ).scalar_one_or_none()
            if existing:
                tag_map[tag_name] = existing
            else:
                tag = Tag(user_id=user.id, name=tag_name)
                db.add(tag)
                await db.flush()
                tag_map[tag_name] = tag
        print(f"  ✅ Tags ready: {list(tag_map.keys())}")

        # ── Folders ───────────────────────────────────────────────────────────
        folder_map: dict[str, Folder] = {}
        for folder_data in SEED_FOLDERS:
            parent_id = (
                folder_map[folder_data["parent"]].id if folder_data["parent"] else None
            )
            existing = (
                await db.execute(
                    select(Folder).where(
                        Folder.user_id == user.id,
                        Folder.name == folder_data["name"],
                    )
                )
            ).scalar_one_or_none()

            if existing:
                folder_map[folder_data["name"]] = existing
            else:
                folder = Folder(
                    user_id=user.id,
                    name=folder_data["name"],
                    parent_id=parent_id,
                )
                db.add(folder)
                await db.flush()
                folder_map[folder_data["name"]] = folder
        print(f"  ✅ Folders ready: {list(folder_map.keys())}")

        # ── Notes ─────────────────────────────────────────────────────────────
        note_map: dict[str, Note] = {}
        from slugify import slugify

        for note_data in SEED_NOTES:
            existing = (
                await db.execute(
                    select(Note).where(
                        Note.user_id == user.id,
                        Note.title == note_data["title"],
                    )
                )
            ).scalar_one_or_none()

            if existing:
                note_map[note_data["title"]] = existing
                continue

            folder_id = (
                folder_map[note_data["folder"]].id if note_data.get("folder") else None
            )

            from app.services.wiki_parser import generate_excerpt
            content = note_data["content"]
            excerpt = generate_excerpt(content)
            slug = slugify(note_data["title"], max_length=500)

            note = Note(
                user_id=user.id,
                title=note_data["title"],
                slug=slug,
                content=content,
                excerpt=excerpt,
                folder_id=folder_id,
            )
            db.add(note)
            await db.flush()

            # Update slug with ID for uniqueness
            note.slug = f"{slug}-{note.id}"
            await db.flush()

            # Add tags
            for tag_name in note_data.get("tags", []):
                if tag_name in tag_map:
                    await db.execute(
                        note_tags.insert().values(note_id=note.id, tag_id=tag_map[tag_name].id)
                    )

            note_map[note_data["title"]] = note

        print(f"  ✅ Notes ready: {len(note_map)} notes")

        await db.commit()
        print("\n✨ Database seeded successfully!")
        print(f"\n  Login credentials:")
        print(f"  Email:    {SEED_USER['email']}")
        print(f"  Password: {SEED_USER['password']}")


if __name__ == "__main__":
    asyncio.run(seed())
