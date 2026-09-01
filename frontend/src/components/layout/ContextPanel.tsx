import React, { useState } from 'react'
import {
  Link2,
  Clock,
  Tag as TagIcon,
  Image as ImageIcon,
  History,
  Info,
  ExternalLink,
  Plus,
  Trash2,
  X,
  Edit3,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notesApi, tagsApi, attachmentsApi } from '@/lib/api'
import { useNoteStore } from '@/stores/noteStore'
import { useUIStore } from '@/stores/uiStore'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatFileSize } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import type { BacklinkNote, Tag, Attachment } from '@/types'

export const ContextPanel: React.FC = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { activeNote, setActiveNote } = useNoteStore()
  const {
    isContextPanelOpen,
    setImageEditorOpen,
    setRevisionHistoryOpen,
  } = useUIStore()

  const [newTagName, setNewTagName] = useState('')
  const [isAddingTag, setIsAddingTag] = useState(false)

  // Fetch Backlinks for active note
  const { data: backlinks = [] } = useQuery({
    queryKey: ['backlinks', activeNote?.id],
    queryFn: () => (activeNote ? notesApi.getBacklinks(activeNote.id) : Promise.resolve([])),
    enabled: !!activeNote?.id,
  })

  // Fetch all tags
  const { data: allTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  })

  const wordCount = activeNote?.content
    ? activeNote.content.trim().split(/\s+/).filter(Boolean).length
    : 0
  const charCount = activeNote?.content?.length || 0

  const handleOpenBacklink = async (backlink: BacklinkNote) => {
    try {
      const targetNote = await notesApi.get(backlink.id)
      setActiveNote(targetNote)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error opening note',
        description: 'Could not load linked note.',
      })
    }
  }

  const handleAddTag = async (tagId: number) => {
    if (!activeNote) return
    const currentTagIds = activeNote.tags.map((t) => t.id)
    if (currentTagIds.includes(tagId)) return

    const updatedTagIds = [...currentTagIds, tagId]
    try {
      const updated = await notesApi.update(activeNote.id, { tag_ids: updatedTagIds })
      setActiveNote(updated)
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    } catch {
      toast({ variant: 'destructive', title: 'Failed to add tag' })
    }
  }

  const handleRemoveTag = async (tagId: number) => {
    if (!activeNote) return
    const updatedTagIds = activeNote.tags.map((t) => t.id).filter((id) => id !== tagId)
    try {
      const updated = await notesApi.update(activeNote.id, { tag_ids: updatedTagIds })
      setActiveNote(updated)
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    } catch {
      toast({ variant: 'destructive', title: 'Failed to remove tag' })
    }
  }

  const handleCreateAndAddTag = async () => {
    if (!newTagName.trim() || !activeNote) return
    try {
      const createdTag = await tagsApi.create({ name: newTagName.trim().toLowerCase() })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      await handleAddTag(createdTag.id)
      setNewTagName('')
      setIsAddingTag(false)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Tag creation failed',
        description: err.response?.data?.detail || 'Tag already exists or is invalid',
      })
    }
  }

  if (!isContextPanelOpen || !activeNote) return null

  return (
    <aside className="w-64 border-l border-border bg-card/30 backdrop-blur-md flex flex-col h-[calc(100vh-3.5rem)] select-none shrink-0 transition-all z-20 text-xs">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Backlinks Section */}
          <div>
            <div className="flex items-center justify-between font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <div className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5 text-primary" />
                <span>Backlinks ({backlinks.length})</span>
              </div>
            </div>

            {backlinks.length === 0 ? (
              <p className="text-muted-foreground/60 italic text-[11px] py-1">
                No notes link to this note yet. Use [[{activeNote.title}]] in other notes.
              </p>
            ) : (
              <div className="space-y-1.5">
                {backlinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => handleOpenBacklink(link)}
                    className="w-full text-left p-2 rounded-md bg-muted/40 hover:bg-primary/10 hover:border-primary/30 border border-border/40 transition-all group"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {link.title}
                      </span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {link.excerpt && (
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 font-normal">
                        {link.excerpt}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Tags Section */}
          <div>
            <div className="flex items-center justify-between font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <div className="flex items-center gap-1.5">
                <TagIcon className="h-3.5 w-3.5 text-indigo-400" />
                <span>Tags</span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-5 w-5"
                onClick={() => setIsAddingTag(!isAddingTag)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-1 mb-2">
              {activeNote.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[11px]"
                >
                  #{tag.name}
                  <button
                    onClick={() => handleRemoveTag(tag.id)}
                    className="hover:text-destructive transition-colors ml-0.5"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
              {activeNote.tags.length === 0 && (
                <p className="text-muted-foreground/60 italic text-[11px]">No tags applied</p>
              )}
            </div>

            {isAddingTag && (
              <div className="p-2 rounded-md bg-muted/40 border border-border space-y-2 mt-2">
                <input
                  type="text"
                  placeholder="New tag name..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateAndAddTag()}
                  className="w-full bg-background border border-input rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {allTags
                    .filter((t) => !activeNote.tags.some((at) => at.id === t.id))
                    .map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleAddTag(t.id)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-background hover:bg-primary/20 border border-border"
                      >
                        +{t.name}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Revision History Action */}
          <div>
            <div className="flex items-center justify-between font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <div className="flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-amber-400" />
                <span>History & Versions</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs gap-2"
              onClick={() => setRevisionHistoryOpen(true)}
            >
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Browse Revision History</span>
            </Button>
          </div>

          <Separator />

          {/* Note Metadata Details */}
          <div className="space-y-2 text-muted-foreground">
            <div className="flex items-center gap-1.5 font-semibold uppercase tracking-wider mb-1 text-muted-foreground">
              <Info className="h-3.5 w-3.5 text-blue-400" />
              <span>Note Statistics</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div className="p-2 rounded-md bg-muted/30 border border-border/40">
                <span className="block text-muted-foreground/70">Words</span>
                <span className="font-semibold text-foreground text-sm">{wordCount}</span>
              </div>
              <div className="p-2 rounded-md bg-muted/30 border border-border/40">
                <span className="block text-muted-foreground/70">Characters</span>
                <span className="font-semibold text-foreground text-sm">{charCount}</span>
              </div>
            </div>

            <div className="space-y-1 pt-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground/70">Created:</span>
                <span className="text-foreground">{formatDate(activeNote.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground/70">Modified:</span>
                <span className="text-foreground">{formatDate(activeNote.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </aside>
  )
}
