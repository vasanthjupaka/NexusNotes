import { create } from 'zustand'

type EditorMode = 'edit' | 'split' | 'preview'
type SidebarView = 'all' | 'favorites' | 'folders' | 'tags' | 'archive' | 'trash'

interface UIState {
  isSidebarOpen: boolean
  isContextPanelOpen: boolean
  sidebarView: SidebarView
  selectedFolderId: number | null
  selectedTagId: number | null
  isCommandPaletteOpen: boolean
  isSearchOpen: boolean
  isImageEditorOpen: boolean
  isRevisionHistoryOpen: boolean
  editorMode: EditorMode
  theme: 'dark' | 'light'

  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleContextPanel: () => void
  setContextPanelOpen: (open: boolean) => void
  setSidebarView: (view: SidebarView) => void
  setSelectedFolderId: (id: number | null) => void
  setSelectedTagId: (id: number | null) => void
  setCommandPaletteOpen: (open: boolean) => void
  setSearchOpen: (open: boolean) => void
  setImageEditorOpen: (open: boolean) => void
  setRevisionHistoryOpen: (open: boolean) => void
  setEditorMode: (mode: EditorMode) => void
  toggleTheme: () => void
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  isContextPanelOpen: true,
  sidebarView: 'all',
  selectedFolderId: null,
  selectedTagId: null,
  isCommandPaletteOpen: false,
  isSearchOpen: false,
  isImageEditorOpen: false,
  isRevisionHistoryOpen: false,
  editorMode: 'split',
  theme: (localStorage.getItem('nexus_theme') as 'dark' | 'light') || 'dark',

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleContextPanel: () => set((state) => ({ isContextPanelOpen: !state.isContextPanelOpen })),
  setContextPanelOpen: (open) => set({ isContextPanelOpen: open }),
  setSidebarView: (view) => set({ sidebarView: view, selectedFolderId: null, selectedTagId: null }),
  setSelectedFolderId: (id) => set({ selectedFolderId: id, sidebarView: 'folders' }),
  setSelectedTagId: (id) => set({ selectedTagId: id, sidebarView: 'tags' }),
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),
  setImageEditorOpen: (open) => set({ isImageEditorOpen: open }),
  setRevisionHistoryOpen: (open) => set({ isRevisionHistoryOpen: open }),
  setEditorMode: (mode) => set({ editorMode: mode }),

  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem('nexus_theme', nextTheme)
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      return { theme: nextTheme }
    }),
}))
