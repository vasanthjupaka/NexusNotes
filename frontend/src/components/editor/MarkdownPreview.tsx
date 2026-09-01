import React, { useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useQuery } from '@tanstack/react-query'
import { notesApi } from '@/lib/api'
import { useNoteStore } from '@/stores/noteStore'
import { useToast } from '@/components/ui/use-toast'

interface MarkdownPreviewProps {
  content: string
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content }) => {
  const { setActiveNote } = useNoteStore()
  const { toast } = useToast()

  // Fetch all notes list for wiki link resolution
  const { data: notesData } = useQuery({
    queryKey: ['notes', 'all-lookup'],
    queryFn: () => notesApi.list({ is_deleted: false, page_size: 100 }),
  })

  const htmlContent = useMemo(() => {
    if (!content) return '<p class="text-muted-foreground/60 italic">Blank note. Start typing...</p>'

    // Custom marked renderer for handling tables & checklists
    const renderer = new marked.Renderer()

    // 1. Process standard markdown with marked
    marked.setOptions({
      renderer,
      gfm: true,
      breaks: true,
    })

    let parsed = marked.parse(content) as string

    // 2. Transform [[Wiki-Links]] into interactive clickable tags
    const wikiRegex = /\[\[([^\[\]\n\r]+?)\]\]/g
    parsed = parsed.replace(wikiRegex, (_, targetTitle) => {
      const cleanTitle = targetTitle.trim()
      return `<button data-wiki-target="${cleanTitle}" class="wiki-link inline-flex items-center gap-1 font-medium text-xs px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/25 hover:bg-primary/25 transition-all"><span>🔗</span> ${cleanTitle}</button>`
    })

    // 3. Sanitize HTML
    return DOMPurify.sanitize(parsed, {
      ADD_ATTR: ['data-wiki-target', 'target'],
    })
  }, [content])

  // Handle clicking on rendered wiki links
  const handleClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    const button = target.closest('[data-wiki-target]') as HTMLButtonElement | null
    if (!button) return

    const wikiTarget = button.getAttribute('data-wiki-target')
    if (!wikiTarget) return

    // Find note with matching title
    const existing = notesData?.items.find(
      (n) => n.title.toLowerCase() === wikiTarget.toLowerCase()
    )

    if (existing) {
      try {
        const fullNote = await notesApi.get(existing.id)
        setActiveNote(fullNote)
        toast({ title: `Opened [[${existing.title}]]` })
      } catch {
        toast({ variant: 'destructive', title: 'Failed to open note' })
      }
    } else {
      // Create new note with this title if it doesn't exist
      try {
        const newNote = await notesApi.create({
          title: wikiTarget,
          content: `# ${wikiTarget}\n\nLinked from another note.`,
        })
        setActiveNote(newNote)
        toast({
          title: `Created new note: [[${wikiTarget}]]`,
          description: 'Linked note was automatically created.',
        })
      } catch {
        toast({
          variant: 'destructive',
          title: 'Could not create note',
        })
      }
    }
  }

  return (
    <div
      onClick={handleClick}
      className="prose-nexus p-6 max-w-3xl mx-auto overflow-y-auto h-full selection:bg-primary/20 text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  )
}
