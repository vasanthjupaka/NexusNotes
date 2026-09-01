"""
API tests for note CRUD, backlinks, revisions, and search.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_and_get_note(client: AsyncClient, auth_headers):
    # 1. Create Note A
    create_payload = {
        "title": "AWS S3 Architecture",
        "content": "# AWS S3\nObject storage for cloud applications.",
    }
    create_res = await client.post("/api/v1/notes", json=create_payload, headers=auth_headers)
    assert create_res.status_code == 201
    note_a = create_res.json()
    assert note_a["title"] == "AWS S3 Architecture"
    assert note_a["content"] == create_payload["content"]
    assert note_a["slug"].startswith("aws-s3-architecture")

    # 2. Get Note A
    get_res = await client.get(f"/api/v1/notes/{note_a['id']}", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == note_a["id"]


@pytest.mark.asyncio
async def test_note_backlinks_and_linking(client: AsyncClient, auth_headers):
    # 1. Create Target Note (Note B)
    res_b = await client.post(
        "/api/v1/notes",
        json={"title": "Target Note", "content": "I am the target of links."},
        headers=auth_headers,
    )
    assert res_b.status_code == 201
    note_b = res_b.json()

    # 2. Create Source Note (Note A) that links to [[Target Note]]
    res_a = await client.post(
        "/api/v1/notes",
        json={"title": "Source Note", "content": "Check out [[Target Note]] for info."},
        headers=auth_headers,
    )
    assert res_a.status_code == 201
    note_a = res_a.json()

    # 3. Query backlinks for Note B -> should contain Note A
    backlinks_res = await client.get(
        f"/api/v1/notes/{note_b['id']}/backlinks", headers=auth_headers
    )
    assert backlinks_res.status_code == 200
    backlinks = backlinks_res.json()
    assert len(backlinks) == 1
    assert backlinks[0]["id"] == note_a["id"]
    assert backlinks[0]["title"] == "Source Note"


@pytest.mark.asyncio
async def test_note_soft_delete_and_restore(client: AsyncClient, auth_headers):
    # Create note
    res = await client.post(
        "/api/v1/notes",
        json={"title": "Note to Trash", "content": "Will be deleted and restored."},
        headers=auth_headers,
    )
    note_id = res.json()["id"]

    # Soft-delete note
    del_res = await client.delete(f"/api/v1/notes/{note_id}", headers=auth_headers)
    assert del_res.status_code == 200

    # Verify not in regular list
    list_res = await client.get("/api/v1/notes", headers=auth_headers)
    assert not any(n["id"] == note_id for n in list_res.json()["items"])

    # Verify in trash list
    trash_res = await client.get("/api/v1/notes?is_deleted=true", headers=auth_headers)
    assert any(n["id"] == note_id for n in trash_res.json()["items"])

    # Restore note
    restore_res = await client.post(f"/api/v1/notes/{note_id}/restore", headers=auth_headers)
    assert restore_res.status_code == 200
    assert restore_res.json()["is_deleted"] is False


@pytest.mark.asyncio
async def test_note_revisions(client: AsyncClient, auth_headers):
    # Create note (Revision 1)
    res = await client.post(
        "/api/v1/notes",
        json={"title": "Revision Note", "content": "Version 1 Content"},
        headers=auth_headers,
    )
    note_id = res.json()["id"]

    # Update note (Revision 2)
    await client.put(
        f"/api/v1/notes/{note_id}",
        json={"content": "Version 2 Content"},
        headers=auth_headers,
    )

    # Get revision list
    rev_res = await client.get(f"/api/v1/notes/{note_id}/revisions", headers=auth_headers)
    assert rev_res.status_code == 200
    revisions = rev_res.json()
    assert len(revisions) == 2
