import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notesApi } from '@/lib/api'
import { useNoteStore } from '@/stores/noteStore'
import { useUIStore } from '@/stores/uiStore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock, RotateCcw, AlertTriangle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import type { NoteRevisionSummary, NoteRevisionDetail } from '@/types'

export const RevisionsModal: React.FC = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { activeNote, setActiveNote } = useNoteStore()
  const { isRevisionHistoryOpen, setRevisionHistoryOpen } = useUIStore()

  const [selectedRevisionId, setSelectedRevisionId] = useState<number | null>(null)

  // Fetch revisions list
  const { data: revisions = [], isLoading } = useQuery({
    queryKey: ['revisions', activeNote?.id],
    queryFn: () => (activeNote ? notesApi.getRevisions(activeNote.id) : Promise.resolve([])),
    enabled: !!activeNote?.id && isRevisionHistoryOpen,
  })

  // Fetch specific revision detail
  const { data: selectedRevision } = useQuery({
    queryKey: ['revision', activeNote?.id, selectedRevisionId],
    queryFn: () =>
      activeNote && selectedRevisionId
        ? notesApi.getRevision(activeNote.id, selectedRevisionId)
        : Promise.resolve(null),
    enabled: !!activeNote?.id && !!selectedRevisionId,
  })

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!activeNote) return
      return await notesApi.update(activeNote.id, { content })
    },
    onSuccess: (updated) => {
      if (updated) {
        setActiveNote(updated)
        queryClient.invalidateQueries({ queryKey: ['notes'] })
        queryClient.invalidateQueries({ queryKey: ['revisions', activeNote?.id] })
        setRevisionHistoryOpen(false)
        toast({
          title: 'Revision Restored',
          description: 'Note content has been reverted to the selected snapshot.',
        })
      }
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Restore Failed',
        description: 'Could not restore revision. Please try again.',
      })
    },
  })

  if (!activeNote) return null

  return (
    <Dialog open={isRevisionHistoryOpen} onOpenChange={setRevisionHistoryOpen}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-amber-400" />
            <span>Revision History: {activeNote.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden my-2 min-h-[350px]">
          {/* Revisions List */}
          <div className="border border-border/80 rounded-lg p-2 bg-muted/20 flex flex-col">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
              Snapshots ({revisions.length})
            </h4>
            <ScrollArea className="flex-1">
              {isLoading ? (
                <p className="text-xs text-muted-foreground p-2">Loading history...</p>
              ) : revisions.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2 italic">No revisions found.</p>
              ) : (
                <div className="space-y-1">
                  {revisions.map((rev: NoteRevisionSummary, index: number) => (
                    <button
                      key={rev.id}
                      onClick={() => setSelectedRevisionId(rev.id)}
                      className={`w-full text-left p-2 rounded-md text-xs transition-colors flex items-center justify-between ${
                        selectedRevisionId === rev.id
                          ? 'bg-primary/15 text-primary font-medium border border-primary/30'
                          : 'hover:bg-accent text-foreground'
                      }`}
                    >
                      <span>{formatDate(rev.created_at)}</span>
                      {index === 0 && (
                        <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-medium">
                          Current
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Revision Content Preview */}
          <div className="md:col-span-2 border border-border/80 rounded-lg p-4 bg-background/50 flex flex-col overflow-hidden">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Snapshot Content Preview
            </h4>
            {selectedRevision ? (
              <ScrollArea className="flex-1 font-mono text-xs p-2 bg-card/40 rounded border border-border/40 whitespace-pre-wrap leading-relaxed text-foreground">
                {selectedRevision.content}
              </ScrollArea>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground italic">
                Select a revision snapshot from the left to preview its content.
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
          <Button variant="outline" size="sm" onClick={() => setRevisionHistoryOpen(false)}>
            Close
          </Button>
          <Button
            size="sm"
            variant="default"
            disabled={!selectedRevision || restoreMutation.isPending}
            onClick={() => selectedRevision && restoreMutation.mutate(selectedRevision.content)}
            className="gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Restore This Snapshot</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
