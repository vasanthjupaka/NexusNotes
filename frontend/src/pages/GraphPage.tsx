import React from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { Sidebar } from '@/components/layout/Sidebar'
import { KnowledgeGraph } from '@/components/graph/KnowledgeGraph'
import { CommandPalette } from '@/components/search/CommandPalette'

export const GraphPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden relative">
          <KnowledgeGraph />
        </main>
      </div>
      <CommandPalette />
    </div>
  )
}
