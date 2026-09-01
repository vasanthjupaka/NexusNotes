# Frontend Architecture — NexusNotes

## Technology Stack

- **Framework**: React 18 + Vite + TypeScript 5
- **Design System & Styling**: Tailwind CSS v3 + Radix UI / shadcn/ui primitives
- **Editor Engine**: CodeMirror 6 (with custom Wiki-Link autocomplete extension)
- **Knowledge Graph**: D3.js v7 (force-directed graph simulation)
- **Image Editor**: Fabric.js v5 (canvas-based crop, rotate, flip, annotations)
- **State Management**:
  - Global State: Zustand (`authStore`, `uiStore`, `noteStore`)
  - Server State: TanStack Query v5 (caching, optimistic mutations, automatic background invalidation)
- **Routing**: React Router v6

---

## Key Modules & Component Hierarchy

```
frontend/src/
├── components/
│   ├── layout/
│   │   ├── TopBar.tsx           # Search bar, theme switcher, quick note action, user menu
│   │   ├── Sidebar.tsx          # Folders tree, Tag pills, View switcher (All, Favs, Trash, Archive)
│   │   └── ContextPanel.tsx     # Backlinks list, Word count metrics, Tag manager, History trigger
│   ├── editor/
│   │   ├── NoteEditor.tsx       # CodeMirror 6 instance, autosave debounce, image drop target
│   │   ├── EditorToolbar.tsx    # Markdown formatting actions, split/edit/preview mode switch
│   │   ├── MarkdownPreview.tsx  # DOMPurify-sanitized preview with interactive [[Wiki Link]] clicks
│   │   └── RevisionsModal.tsx   # Snapshot comparison and one-click rollback
│   ├── graph/
│   │   └── KnowledgeGraph.tsx   # Interactive D3 force-directed visualizer
│   ├── search/
│   │   └── CommandPalette.tsx   # Ctrl+K modal with instant fuzzy filtering
│   ├── attachments/
│   │   └── ImageEditorModal.tsx # Fabric.js canvas editor
│   └── ui/                      # Standardized shadcn/ui primitives
```

---

## State Management Decisions

1. **Zustand vs Redux**: Zustand provides an unopinionated, boilerplate-free state container with native TypeScript inference and zero context provider wrapper hell.
2. **TanStack Query for Remote Data**: All REST API interactions (notes list, folders, tags, search) leverage TanStack Query's cache keys (`['notes']`, `['folders']`, `['backlinks', noteId]`), ensuring optimistic UI updates and instant synchronization across views.
3. **Autosave Debouncing**: `NoteEditor` debounces input changes by 1200ms. Save status transitions smoothly through `unsaved` → `saving` → `saved` with visual indicators in the top bar.
