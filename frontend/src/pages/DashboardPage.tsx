import React, { useEffect } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { Sidebar } from '@/components/layout/Sidebar'
import { ContextPanel } from '@/components/layout/ContextPanel'
import { NoteEditor } from '@/components/editor/NoteEditor'
import { CommandPalette } from '@/components/search/CommandPalette'
import { RevisionsModal } from '@/components/editor/RevisionsModal'
import { useQuery } from '@tanstack/react-query'
import { notesApi } from '@/lib/api'
import { useNoteStore } from '@/stores/noteStore'

export const DashboardPage: React.FC = () => {
  const { activeNote, setActiveNote } = useNoteStore()

  // Load first note on initial load if none selected
  const { data: notesData } = useQuery({
    queryKey: ['notes', 'initial-load'],
    queryFn: () => notesApi.list({ is_deleted: false, page_size: 1 }),
    enabled: !activeNote,
  })

  useEffect(() => {
    if (!activeNote && notesData?.items && notesData.items.length > 0) {
      notesApi.get(notesData.items[0].id).then((fullNote) => {
        setActiveNote(fullNote)
      })
    }
  }, [notesData, activeNote, setActiveNote])

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex overflow-hidden">
          <NoteEditor />
          <ContextPanel />
        </main>
      </div>

      {/* Global Modals */}
      <CommandPalette />
      <RevisionsModal />
    </div>
  )
}
