import React, { useState } from 'react'
import {
  FileText,
  Star,
  Folder as FolderIcon,
  Tag as TagIcon,
  Archive,
  Trash2,
  Plus,
  RotateCcw,
  XCircle,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notesApi, foldersApi, tagsApi } from '@/lib/api'
import { useUIStore } from '@/stores/uiStore'
import { useNoteStore } from '@/stores/noteStore'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useNavigate } from 'react-router-dom'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { Folder, NoteSummary, Tag, NoteListResponse } from '@/types'

export const Sidebar: React.FC = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const {
    isSidebarOpen,
    sidebarView,
    setSidebarView,
    selectedFolderId,
    setSelectedFolderId,
    selectedTagId,
    setSelectedTagId,
  } = useUIStore()
  const { activeNoteId, setActiveNote } = useNoteStore()

  // Modals
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  // Queries
  const { data: notesData, isLoading: isNotesLoading } = useQuery<NoteListResponse>({
    queryKey: ['notes', sidebarView, selectedFolderId, selectedTagId],
    queryFn: () => {
      if (sidebarView === 'favorites') return notesApi.list({ is_favorite: true })
      if (sidebarView === 'archive') return notesApi.list({ is_archived: true })
      if (sidebarView === 'trash') return notesApi.list({ is_deleted: true })
      if (sidebarView === 'folders' && selectedFolderId) return notesApi.list({ folder_id: selectedFolderId })
      if (sidebarView === 'tags' && selectedTagId) return notesApi.list({ tag_id: selectedTagId })
      return notesApi.list({ is_deleted: false, is_archived: false })
    },
  })

  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: foldersApi.list,
  })

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  })

  // Mutations
  const createFolderMutation = useMutation({
    mutationFn: (name: string) => foldersApi.create({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      setIsNewFolderOpen(false)
      setNewFolderName('')
    },
  })

  const deleteNoteMutation = useMutation({
    mutationFn: (id: number) => notesApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      if (activeNoteId === id) setActiveNote(null)
    },
  })

  const restoreNoteMutation = useMutation({
    mutationFn: (id: number) => notesApi.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: number) => notesApi.permanentDelete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      if (activeNoteId === id) setActiveNote(null)
    },
  })

  const handleSelectNote = async (summary: NoteSummary) => {
    try {
      const fullNote = await notesApi.get(summary.id)
      setActiveNote(fullNote)
      navigate('/')
    } catch {
      // Error handled by Axios interceptor
    }
  }

  if (!isSidebarOpen) return null

  return (
    <aside className="w-72 border-r border-border bg-card/40 backdrop-blur-md flex flex-col h-[calc(100vh-3.5rem)] select-none shrink-0 transition-all z-20">
      {/* View Switcher Pills */}
      <div className="p-3 border-b border-border/60 flex flex-col gap-1">
        <button
          onClick={() => setSidebarView('all')}
          className={cn(
            'flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
            sidebarView === 'all'
              ? 'bg-primary/15 text-primary font-semibold'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" />
            <span>All Notes</span>
          </div>
          {notesData && sidebarView === 'all' && (
            <span className="text-[10px] font-mono opacity-80">{notesData.total}</span>
          )}
        </button>

        <button
          onClick={() => setSidebarView('favorites')}
          className={cn(
            'flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
            sidebarView === 'favorites'
              ? 'bg-amber-500/15 text-amber-500 font-semibold'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          <div className="flex items-center gap-2">
            <Star className="h-3.5 w-3.5 fill-current" />
            <span>Favorites</span>
          </div>
        </button>

        <button
          onClick={() => setSidebarView('archive')}
          className={cn(
            'flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
            sidebarView === 'archive'
              ? 'bg-purple-500/15 text-purple-400 font-semibold'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          <div className="flex items-center gap-2">
            <Archive className="h-3.5 w-3.5" />
            <span>Archived</span>
          </div>
        </button>

        <button
          onClick={() => setSidebarView('trash')}
          className={cn(
            'flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
            sidebarView === 'trash'
              ? 'bg-destructive/15 text-destructive font-semibold'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          <div className="flex items-center gap-2">
            <Trash2 className="h-3.5 w-3.5" />
            <span>Trash</span>
          </div>
        </button>
      </div>

      {/* Folders Section */}
      <div className="px-3 pt-3 pb-1 flex items-center justify-between text-xs font-semibold text-muted-foreground/80 tracking-wider uppercase">
        <div className="flex items-center gap-1.5">
          <FolderIcon className="h-3 w-3" />
          <span>Folders</span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-5 w-5 text-muted-foreground hover:text-foreground"
          onClick={() => setIsNewFolderOpen(true)}
          title="Create New Folder"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <div className="px-2 flex flex-col gap-0.5 max-h-36 overflow-y-auto">
        {folders.map((folder: Folder) => (
          <button
            key={folder.id}
            onClick={() => setSelectedFolderId(folder.id)}
            className={cn(
              'flex items-center gap-2 w-full px-2 py-1 rounded-md text-xs transition-colors text-left',
              selectedFolderId === folder.id
                ? 'bg-accent text-accent-foreground font-medium'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
            )}
          >
            <FolderIcon className="h-3.5 w-3.5 shrink-0 text-amber-400/80" />
            <span className="truncate">{folder.name}</span>
          </button>
        ))}
        {folders.length === 0 && (
          <p className="text-[11px] text-muted-foreground/60 px-2 py-1 italic">No folders yet</p>
        )}
      </div>

      {/* Tags Section */}
      <div className="px-3 pt-3 pb-1 flex items-center justify-between text-xs font-semibold text-muted-foreground/80 tracking-wider uppercase border-t border-border/40 mt-2">
        <div className="flex items-center gap-1.5">
          <TagIcon className="h-3 w-3" />
          <span>Tags</span>
        </div>
      </div>

      <div className="px-2 flex flex-wrap gap-1 max-h-24 overflow-y-auto pb-2">
        {tags.map((tag: Tag) => (
          <button
            key={tag.id}
            onClick={() => setSelectedTagId(tag.id)}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] transition-all',
              selectedTagId === tag.id
                ? 'bg-indigo-500/25 text-indigo-300 font-semibold border border-indigo-500/40 shadow-sm'
                : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'
            )}
          >
            #{tag.name}
          </button>
        ))}
        {tags.length === 0 && (
          <p className="text-[11px] text-muted-foreground/60 px-2 py-0.5 italic">No tags created</p>
        )}
      </div>

      {/* Notes List Header */}
      <div className="px-3 py-2 border-t border-b border-border/60 bg-muted/20 flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>
          {sidebarView === 'trash'
            ? 'TRASH'
            : sidebarView === 'favorites'
            ? 'FAVORITES'
            : sidebarView === 'archive'
            ? 'ARCHIVED'
            : sidebarView === 'folders'
            ? 'FOLDER NOTES'
            : sidebarView === 'tags'
            ? 'TAGGED NOTES'
            : 'ALL NOTES'}{' '}
          ({notesData?.items.length || 0})
        </span>
      </div>

      {/* Notes List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isNotesLoading ? (
            <div className="p-4 space-y-2">
              <div className="h-4 bg-muted/60 animate-pulse rounded w-3/4" />
              <div className="h-3 bg-muted/40 animate-pulse rounded w-full" />
              <div className="h-3 bg-muted/40 animate-pulse rounded w-2/3" />
            </div>
          ) : notesData?.items.length === 0 ? (
            <div className="py-8 text-center px-4">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs font-medium text-muted-foreground">
                {sidebarView === 'trash' ? 'Trash is empty' : 'No notes in this view'}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                {sidebarView === 'trash'
                  ? 'Deleted notes will appear here.'
                  : 'Create a note to start building your knowledge base.'}
              </p>
            </div>
          ) : (
            notesData?.items.map((note: NoteSummary) => {
              const isSelected = activeNoteId === note.id
              return (
                <div
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  className={cn(
                    'p-2.5 rounded-lg cursor-pointer transition-all border text-left group',
                    isSelected
                      ? 'bg-primary/10 border-primary/30 shadow-sm'
                      : 'bg-transparent border-transparent hover:bg-accent/50 hover:border-border/60'
                  )}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <h4
                      className={cn(
                        'text-xs font-semibold truncate',
                        isSelected ? 'text-primary' : 'text-foreground group-hover:text-primary transition-colors'
                      )}
                    >
                      {note.title || 'Untitled Note'}
                    </h4>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {note.is_favorite && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                      {sidebarView !== 'trash' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteNoteMutation.mutate(note.id)
                          }}
                          title="Move to Trash"
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:text-destructive text-muted-foreground"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {note.excerpt && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mb-1.5 font-normal">
                      {note.excerpt}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground/70">
                    <span>{formatRelativeTime(note.updated_at)}</span>
                    <div className="flex items-center gap-1">
                      {note.tags?.slice(0, 2).map((t) => (
                        <span key={t.id} className="text-primary/70 font-mono text-[9px]">
                          #{t.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Clearly visible action buttons in Trash view */}
                  {sidebarView === 'trash' && (
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/40">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          restoreNoteMutation.mutate(note.id)
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-[10px] font-medium transition-colors"
                        title="Restore note to All Notes"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (window.confirm('Permanently delete this note? This action cannot be undone.')) {
                            permanentDeleteMutation.mutate(note.id)
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-destructive/15 hover:bg-destructive/25 text-destructive text-[10px] font-medium transition-colors"
                        title="Delete permanently from database"
                      >
                        <XCircle className="h-3 w-3" />
                        Delete Forever
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* New Folder Modal */}
      <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <Input
              placeholder="Folder name (e.g. AWS Architecture)"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFolderName.trim()) {
                  createFolderMutation.mutate(newFolderName.trim())
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewFolderOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
              onClick={() => createFolderMutation.mutate(newFolderName.trim())}
            >
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
