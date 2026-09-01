"""
NexusNotes — Wiki-Link Parser Utility

Parses [[Note Title]] style links from Markdown content.

This utility:
1. Extracts all [[...]] references from note content
2. Resolves them to note IDs via the database
3. Returns both resolved and unresolved links

Why parse on save (not on read)?
- Saves compute on every read request
- Enables efficient backlink queries via indexed note_links table
- Graph traversal becomes a simple indexed join
"""

import re
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.note import Note


# Regex: matches [[...]] with content that is not empty and doesn't contain newlines
WIKI_LINK_PATTERN = re.compile(r"\[\[([^\[\]\n\r]+?)\]\]")


def extract_wiki_links(content: str) -> list[str]:
    """
    Extract all [[...]] link targets from Markdown content.

    Returns a list of unique target titles (lowercased and stripped).

    Example:
        content = "See also [[AWS EC2]] and [[Docker]] concepts."
        extract_wiki_links(content) → ["AWS EC2", "Docker"]
    """
    matches = WIKI_LINK_PATTERN.findall(content)
    # Deduplicate while preserving first occurrence order
    seen: set[str] = set()
    unique: list[str] = []
    for match in matches:
        cleaned = match.strip()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            unique.append(cleaned)
    return unique


async def resolve_wiki_links(
    db: AsyncSession,
    user_id: int,
    link_titles: list[str],
) -> dict[str, int]:
    """
    Resolve wiki-link titles to note IDs for the given user.

    Performs a single batched query to resolve all links.

    Returns:
        Dict mapping title → note_id for titles that exist.
        Titles that don't exist as notes are absent from the result.
    """
    if not link_titles:
        return {}

    # Case-insensitive title lookup
    result = await db.execute(
        select(Note.id, Note.title).where(
            Note.user_id == user_id,
            Note.is_deleted == False,  # noqa: E712
            Note.title.in_(link_titles),
        )
    )

    resolved: dict[str, int] = {}
    for note_id, title in result:
        resolved[title] = note_id

    return resolved


def generate_excerpt(content: str, max_length: int = 300) -> str:
    """
    Generate a plain-text excerpt from Markdown content.

    Strips common Markdown syntax for a readable preview.
    """
    if not content:
        return ""

    # Remove wiki links: [[Title]] → Title
    text = WIKI_LINK_PATTERN.sub(r"\1", content)

    # Remove markdown headings
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)

    # Remove bold/italic markers
    text = re.sub(r"\*{1,3}(.+?)\*{1,3}", r"\1", text)
    text = re.sub(r"_{1,3}(.+?)_{1,3}", r"\1", text)

    # Remove code blocks
    text = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
    text = re.sub(r"`(.+?)`", r"\1", text)

    # Remove markdown links: [text](url) → text
    text = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)

    # Remove images: ![alt](url) → alt
    text = re.sub(r"!\[([^\]]*)\]\([^\)]+\)", r"\1", text)

    # Remove horizontal rules
    text = re.sub(r"^[-_*]{3,}\s*$", "", text, flags=re.MULTILINE)

    # Collapse whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = text.strip()

    if len(text) > max_length:
        text = text[:max_length].rsplit(" ", 1)[0] + "…"

    return text


def generate_slug(title: str, note_id: int | None = None) -> str:
    """
    Generate a URL-safe slug from a note title.

    Appends the note ID to guarantee uniqueness when provided.
    """
    from slugify import slugify
    base_slug = slugify(title, max_length=500, word_boundary=True)
    if not base_slug:
        base_slug = "untitled"
    if note_id:
        return f"{base_slug}-{note_id}"
    return base_slug
