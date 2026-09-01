# Database Architecture & Schema — NexusNotes

## Database Engine
- **Engine**: MySQL 8.0 (InnoDB)
- **Character Set**: `utf8mb4`
- **Collation**: `utf8mb4_unicode_ci`

---

## Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o{ folders : owns
    users ||--o{ notes : owns
    users ||--o{ tags : owns
    users ||--o{ attachments : uploads
    folders ||--o{ notes : contains
    folders ||--o{ folders : parent_child
    notes ||--o{ note_tags : has
    tags ||--o{ note_tags : applied_to
    notes ||--o{ note_links : source_of
    notes ||--o{ note_links : target_of
    notes ||--o{ note_revisions : has
    notes ||--o{ attachments : attaches

    users {
        bigint id PK
        varchar username UK
        varchar email UK
        varchar password_hash
        varchar display_name
        varchar avatar_url
        datetime created_at
        datetime updated_at
        datetime last_login_at
        boolean is_active
    }

    notes {
        bigint id PK
        bigint user_id FK
        varchar title
        varchar slug UK
        longtext content
        text excerpt
        bigint folder_id FK
        boolean is_favorite
        boolean is_archived
        boolean is_deleted
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    folders {
        bigint id PK
        bigint user_id FK
        varchar name
        bigint parent_id FK
        datetime created_at
        datetime updated_at
    }

    tags {
        bigint id PK
        bigint user_id FK
        varchar name
        datetime created_at
    }

    note_tags {
        bigint note_id PK,FK
        bigint tag_id PK,FK
    }

    note_links {
        bigint id PK
        bigint source_note_id FK
        bigint target_note_id FK
        datetime created_at
    }

    attachments {
        bigint id PK
        bigint user_id FK
        bigint note_id FK
        varchar original_filename
        varchar object_key
        varchar bucket_name
        varchar content_type
        int file_size
        int width
        int height
        datetime created_at
        datetime updated_at
    }

    note_revisions {
        bigint id PK
        bigint note_id FK
        longtext content
        datetime created_at
        bigint created_by FK
    }
```

---

## Indexing Strategy

1. `notes (user_id, slug)`: Unique compound index for rapid URL slug resolution per user.
2. `notes (is_deleted, is_archived, is_favorite)`: Fast filtering for sidebar views (All Notes, Trash, Favorites).
3. `FULLTEXT (title, content)`: MySQL full-text search indexing with boolean mode matching.
4. `note_links (source_note_id, target_note_id)`: Bidirectional index providing $O(1)$ query performance for backlink calculation and knowledge graph queries.
5. `attachments (object_key)`: Unique identifier index for fast S3 object key lookups.

---

## Database Migrations

Migrations are managed with **Alembic**:
```bash
# Generate a new migration revision based on model changes
make migrate-create MSG="add_note_revisions"

# Apply pending migrations to database
make migrate

# Roll back the most recent migration
make migrate-down
```
