import { create } from 'zustand'
import type { NoteDetail } from '@/types'

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

interface NoteState {
  activeNote: NoteDetail | null
  activeNoteId: number | null
  saveStatus: SaveStatus
  lastSavedAt: Date | null
  isDirty: boolean

  setActiveNote: (note: NoteDetail | null) => void
  setActiveNoteId: (id: number | null) => void
  setSaveStatus: (status: SaveStatus) => void
  setLastSavedAt: (date: Date | null) => void
  setIsDirty: (dirty: boolean) => void
  updateActiveNoteContent: (content: string) => void
  updateActiveNoteTitle: (title: string) => void
}

export const useNoteStore = create<NoteState>((set) => ({
  activeNote: null,
  activeNoteId: null,
  saveStatus: 'saved',
  lastSavedAt: null,
  isDirty: false,

  setActiveNote: (note) =>
    set({
      activeNote: note,
      activeNoteId: note ? note.id : null,
      isDirty: false,
      saveStatus: 'saved',
    }),

  setActiveNoteId: (id) => set({ activeNoteId: id }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  setLastSavedAt: (date) => set({ lastSavedAt: date }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),

  updateActiveNoteContent: (content) =>
    set((state) => ({
      activeNote: state.activeNote ? { ...state.activeNote, content } : null,
      isDirty: true,
      saveStatus: 'unsaved',
    })),

  updateActiveNoteTitle: (title) =>
    set((state) => ({
      activeNote: state.activeNote ? { ...state.activeNote, title } : null,
      isDirty: true,
      saveStatus: 'unsaved',
    })),
}))
