"""
Unit tests for Wiki-link parser, excerpt generator, and slugifier.
"""

from app.services.wiki_parser import (
    extract_wiki_links,
    generate_excerpt,
    generate_slug,
)


def test_extract_wiki_links():
    content = """
    # Architecture
    We deploy on [[AWS EC2]] and store images in [[AWS S3]].
    Also check [[Docker]] and duplicate [[AWS EC2]] reference.
    """
    links = extract_wiki_links(content)
    assert links == ["AWS EC2", "AWS S3", "Docker"]


def test_extract_wiki_links_empty():
    assert extract_wiki_links("No links here.") == []
    assert extract_wiki_links("") == []


def test_generate_excerpt():
    markdown = """
    # My Heading
    This is **bold** text and `inline code`.
    See [[AWS EC2]] for details.
    
    ```python
    print("hello")
    ```
    """
    excerpt = generate_excerpt(markdown, max_length=100)
    assert "My Heading" not in excerpt  # Heading marker stripped
    assert "**" not in excerpt  # Bold markers stripped
    assert "print" not in excerpt  # Code block removed
    assert "AWS EC2" in excerpt  # Wiki link converted to clean text


def test_generate_slug():
    slug1 = generate_slug("AWS EC2 Architecture")
    assert slug1 == "aws-ec2-architecture"

    slug2 = generate_slug("AWS EC2 Architecture", note_id=42)
    assert slug2 == "aws-ec2-architecture-42"
