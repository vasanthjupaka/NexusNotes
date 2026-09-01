import React, { useEffect, useState } from 'react'
import {
  FileText,
  Plus,
  Network,
  Sun,
  Trash2,
  Archive,
  Star,
  Search,
  Settings,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { useQuery } from '@tanstack/react-query'
import { notesApi } from '@/lib/api'
import { useUIStore } from '@/stores/uiStore'
import { useNoteStore } from '@/stores/noteStore'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui/use-toast'
import type { NoteSummary } from '@/types'

export const CommandPalette: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    toggleTheme,
    setSidebarView,
  } = useUIStore()
  const { setActiveNote } = useNoteStore()

  const [query, setQuery] = useState('')

  // Global keyboard shortcut listener (Ctrl+K, Cmd+K, Ctrl+P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'p')) {
        e.preventDefault()
        setCommandPaletteOpen(!isCommandPaletteOpen)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCommandPaletteOpen, setCommandPaletteOpen])

  // Fetch recent notes for quick navigation
  const { data: notesData } = useQuery({
    queryKey: ['notes', 'command-palette'],
    queryFn: () => notesApi.list({ is_deleted: false, page_size: 50 }),
    enabled: isCommandPaletteOpen,
  })

  const filteredNotes = (notesData?.items || []).filter((n) =>
    n.title.toLowerCase().includes(query.toLowerCase()) ||
    (n.excerpt && n.excerpt.toLowerCase().includes(query.toLowerCase()))
  )

  const handleSelectNote = async (note: NoteSummary) => {
    try {
      const full = await notesApi.get(note.id)
      setActiveNote(full)
      setCommandPaletteOpen(false)
      navigate('/')
    } catch {
      toast({ variant: 'destructive', title: 'Error opening note' })
    }
  }

  const handleCreateNote = async () => {
    try {
      const newNote = await notesApi.create({
        title: query.trim() || 'Untitled Note',
        content: `# ${query.trim() || 'Untitled Note'}\n\nStart writing...`,
      })
      setActiveNote(newNote)
      setCommandPaletteOpen(false)
      navigate('/')
      toast({ title: 'Note created' })
    } catch {
      toast({ variant: 'destructive', title: 'Error creating note' })
    }
  }

  const commands = [
    {
      id: 'new-note',
      title: 'Create New Note',
      icon: <Plus className="h-4 w-4 text-emerald-400" />,
      action: handleCreateNote,
    },
    {
      id: 'open-graph',
      title: 'Open Knowledge Graph',
      icon: <Network className="h-4 w-4 text-indigo-400" />,
      action: () => {
        navigate('/graph')
        setCommandPaletteOpen(false)
      },
    },
    {
      id: 'toggle-theme',
      title: 'Toggle Dark / Light Theme',
      icon: <Sun className="h-4 w-4 text-amber-400" />,
      action: () => {
        toggleTheme()
        setCommandPaletteOpen(false)
      },
    },
    {
      id: 'view-favorites',
      title: 'Go to Favorite Notes',
      icon: <Star className="h-4 w-4 text-amber-500 fill-amber-500" />,
      action: () => {
        setSidebarView('favorites')
        setCommandPaletteOpen(false)
        navigate('/')
      },
    },
    {
      id: 'view-archive',
      title: 'Go to Archived Notes',
      icon: <Archive className="h-4 w-4 text-purple-400" />,
      action: () => {
        setSidebarView('archive')
        setCommandPaletteOpen(false)
        navigate('/')
      },
    },
    {
      id: 'view-trash',
      title: 'Go to Trash',
      icon: <Trash2 className="h-4 w-4 text-destructive" />,
      action: () => {
        setSidebarView('trash')
        setCommandPaletteOpen(false)
        navigate('/')
      },
    },
    {
      id: 'open-settings',
      title: 'Settings & Profile',
      icon: <Settings className="h-4 w-4 text-muted-foreground" />,
      action: () => {
        navigate('/settings')
        setCommandPaletteOpen(false)
      },
    },
  ]

  const filteredCommands = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <Dialog open={isCommandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <DialogContent className="p-0 max-w-xl overflow-hidden border border-border bg-card shadow-2xl rounded-xl">
        <div className="flex items-center px-4 border-b border-border/80 bg-background/50">
          <Search className="h-4 w-4 text-muted-foreground mr-3 shrink-0" />
          <input
            type="text"
            placeholder="Type a command or search notes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-12 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/70 text-foreground font-normal"
            autoFocus
          />
        </div>

        <div className="max-h-[360px] overflow-y-auto p-2 space-y-3">
          {/* Commands Section */}
          {filteredCommands.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Commands
              </div>
              <div className="space-y-0.5">
                {filteredCommands.map((cmd) => (
                  <button
                    key={cmd.id}
                    onClick={cmd.action}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs hover:bg-accent/80 transition-colors text-left text-foreground group"
                  >
                    {cmd.icon}
                    <span className="font-medium group-hover:text-primary transition-colors">
                      {cmd.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes Section */}
          {filteredNotes.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Notes ({filteredNotes.length})
              </div>
              <div className="space-y-0.5">
                {filteredNotes.slice(0, 8).map((note) => (
                  <button
                    key={note.id}
                    onClick={() => handleSelectNote(note)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs hover:bg-accent/80 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="h-4 w-4 text-indigo-400 shrink-0" />
                      <span className="font-medium truncate text-foreground group-hover:text-primary transition-colors">
                        {note.title}
                      </span>
                    </div>
                    {note.tags?.length > 0 && (
                      <span className="text-[10px] text-muted-foreground/80 shrink-0 font-mono">
                        #{note.tags[0].name}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredCommands.length === 0 && filteredNotes.length === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No matching commands or notes found. Press Enter to create a note named "{query}".
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
