import React, { useEffect, useRef, useCallback } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, placeholder as cmPlaceholder, lineNumbers, highlightActiveLineGutter } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { autocompletion, CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import { oneDark } from '@codemirror/theme-one-dark'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notesApi, attachmentsApi } from '@/lib/api'
import { useNoteStore, type SaveStatus } from '@/stores/noteStore'
import { useUIStore } from '@/stores/uiStore'
import { EditorToolbar } from './EditorToolbar'
import { MarkdownPreview } from './MarkdownPreview'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Star,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  FileText,
  UploadCloud,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

export const NoteEditor: React.FC = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const {
    activeNote,
    saveStatus,
    setSaveStatus,
    setLastSavedAt,
    isDirty,
    setIsDirty,
    updateActiveNoteContent,
    updateActiveNoteTitle,
    setActiveNote,
  } = useNoteStore()
  const { editorMode } = useUIStore()

  const editorContainerRef = useRef<HTMLDivElement>(null)
  const editorViewRef = useRef<EditorView | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch all notes for wiki link autocomplete
  const { data: notesData } = useQuery({
    queryKey: ['notes', 'autocomplete-list'],
    queryFn: () => notesApi.list({ is_deleted: false, page_size: 100 }),
  })

  // Autosave mutation
  const saveMutation = useMutation({
    mutationFn: async ({ id, title, content }: { id: number; title: string; content: string }) => {
      return await notesApi.update(id, { title, content })
    },
    onMutate: () => {
      setSaveStatus('saving')
    },
    onSuccess: (updatedNote) => {
      setSaveStatus('saved')
      setIsDirty(false)
      setLastSavedAt(new Date())
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      queryClient.invalidateQueries({ queryKey: ['backlinks', updatedNote.id] })
    },
    onError: () => {
      setSaveStatus('error')
    },
  })

  // Trigger debounced save
  const triggerDebouncedSave = useCallback(
    (title: string, content: string) => {
      if (!activeNote) return

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      setSaveStatus('unsaved')
      setIsDirty(true)

      saveTimeoutRef.current = setTimeout(() => {
        saveMutation.mutate({
          id: activeNote.id,
          title,
          content,
        })
      }, 1200)
    },
    [activeNote, saveMutation, setSaveStatus, setIsDirty]
  )

  // Wiki-link autocomplete source extension
  const wikiLinkCompletions = useCallback(
    (context: CompletionContext): CompletionResult | null => {
      const word = context.matchBefore(/\[\[([^\]]*)$/)
      if (!word) return null

      const query = word.text.slice(2).toLowerCase()
      const options =
        notesData?.items
          .filter((n) => n.id !== activeNote?.id && n.title.toLowerCase().includes(query))
          .map((n) => ({
            label: `[[${n.title}]]`,
            displayLabel: n.title,
            detail: 'Link to note',
            type: 'text',
            apply: `[[${n.title}]]`,
          })) || []

      return {
        from: word.from,
        options,
      }
    },
    [notesData, activeNote]
  )

  // Initialize CodeMirror 6 Editor
  useEffect(() => {
    if (!editorContainerRef.current || !activeNote) return

    // Clean up existing editor
    if (editorViewRef.current) {
      editorViewRef.current.destroy()
    }

    const startState = EditorState.create({
      doc: activeNote.content,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        history(),
        markdown(),
        oneDark,
        cmPlaceholder('Type markdown or [[ to link notes...'),
        autocompletion({ override: [wikiLinkCompletions] }),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newContent = update.state.doc.toString()
            updateActiveNoteContent(newContent)
            triggerDebouncedSave(activeNote.title, newContent)
          }
        }),
        EditorView.theme({
          '&': { height: '100%', fontSize: '14px', backgroundColor: 'transparent' },
          '.cm-scroller': { overflow: 'auto', fontFamily: 'JetBrains Mono, monospace' },
          '.cm-content': { padding: '16px 24px' },
          '.cm-line': { padding: '0 4px', lineHeight: '1.7' },
        }),
      ],
    })

    const view = new EditorView({
      state: startState,
      parent: editorContainerRef.current,
    })

    editorViewRef.current = view

    return () => {
      view.destroy()
      editorViewRef.current = null
    }
  }, [activeNote?.id])

  // Handle Toolbar insertions
  const handleInsertMarkdown = (prefix: string, suffix = '', defaultText = '') => {
    const view = editorViewRef.current
    if (!view) return

    const { state } = view
    const selection = state.selection.main
    const selectedText = state.sliceDoc(selection.from, selection.to) || defaultText

    const insertText = `${prefix}${selectedText}${suffix}`
    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: insertText,
      },
      selection: {
        anchor: selection.from + prefix.length,
        head: selection.from + prefix.length + selectedText.length,
      },
    })
    view.focus()
  }

  // Handle Title changes
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    updateActiveNoteTitle(newTitle)
    if (activeNote) {
      triggerDebouncedSave(newTitle, activeNote.content)
    }
  }

  // Toggle favorite
  const handleToggleFavorite = async () => {
    if (!activeNote) return
    try {
      const updated = await notesApi.update(activeNote.id, { is_favorite: !activeNote.is_favorite })
      setActiveNote(updated)
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    } catch {
      toast({ variant: 'destructive', title: 'Failed to update favorite status' })
    }
  }

  // Image Upload handler
  const handleImageUpload = async (file: File) => {
    if (!activeNote) return
    try {
      toast({ title: 'Uploading image to S3...', description: file.name })
      const attachment = await attachmentsApi.upload(file, activeNote.id)
      const imageUrl = attachment.url || `/api/v1/attachments/${attachment.id}`
      handleInsertMarkdown(`![${attachment.original_filename}](`, `${imageUrl})`, '')
      toast({ title: 'Image uploaded successfully' })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: err.response?.data?.detail || 'Could not upload image.',
      })
    }
  }

  // Drag and drop image onto editor
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter((f) => f.type.startsWith('image/'))
    if (imageFiles.length > 0) {
      await handleImageUpload(imageFiles[0])
    }
  }

  if (!activeNote) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-card/20 select-none">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 text-primary">
          <FileText className="h-8 w-8" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">No Note Selected</h3>
        <p className="text-xs text-muted-foreground max-w-sm mb-4">
          Select a note from the sidebar or create a new note to start writing and connecting your thoughts.
        </p>
        <Button
          size="sm"
          onClick={async () => {
            const newNote = await notesApi.create({
              title: 'Untitled Note',
              content: '# Untitled Note\n\nStart writing...',
            })
            setActiveNote(newNote)
          }}
          className="bg-primary text-primary-foreground shadow-sm"
        >
          Create New Note
        </Button>
      </div>
    )
  }

  return (
    <div
      className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-background"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* Top Note Header with Title, Favorite & Autosave status */}
      <div className="px-6 py-3 border-b border-border/80 bg-card/20 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2 flex-1 max-w-2xl">
          <button
            onClick={handleToggleFavorite}
            title={activeNote.is_favorite ? 'Remove favorite' : 'Mark as favorite'}
            className="text-muted-foreground hover:text-amber-500 transition-colors p-1"
          >
            <Star
              className={cn(
                'h-4 w-4',
                activeNote.is_favorite && 'text-amber-500 fill-amber-500'
              )}
            />
          </button>
          <input
            type="text"
            value={activeNote.title}
            onChange={handleTitleChange}
            placeholder="Note title..."
            className="font-bold text-lg bg-transparent border-none focus:outline-none focus:ring-0 text-foreground w-full tracking-tight"
          />
        </div>

        {/* Autosave Status Indicator */}
        <div className="flex items-center gap-2 text-xs select-none">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1.5 text-muted-foreground font-medium animate-pulse">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>Saving...</span>
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-emerald-500 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Saved</span>
            </span>
          )}
          {saveStatus === 'unsaved' && (
            <span className="flex items-center gap-1.5 text-amber-500/80 font-medium">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Unsaved changes</span>
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1.5 text-destructive font-medium">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Save failed</span>
            </span>
          )}
        </div>
      </div>

      {/* Editor Toolbar */}
      <EditorToolbar
        onInsertMarkdown={handleInsertMarkdown}
        onInsertImage={() => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = 'image/*'
          input.onchange = (e: any) => {
            if (e.target.files?.[0]) {
              handleImageUpload(e.target.files[0])
            }
          }
          input.click()
        }}
      />

      {/* Main Editor / Preview Split Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Pane */}
        {(editorMode === 'edit' || editorMode === 'split') && (
          <div
            ref={editorContainerRef}
            className={cn(
              'h-full overflow-hidden flex-1 bg-background/50',
              editorMode === 'split' && 'border-r border-border/80'
            )}
          />
        )}

        {/* Preview Pane */}
        {(editorMode === 'preview' || editorMode === 'split') && (
          <div className="h-full overflow-y-auto flex-1 bg-card/10">
            <MarkdownPreview content={activeNote.content} />
          </div>
        )}
      </div>
    </div>
  )
}
