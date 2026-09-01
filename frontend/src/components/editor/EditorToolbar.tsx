import React from 'react'
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Quote,
  Link,
  Image as ImageIcon,
  Columns,
  Eye,
  Edit2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

interface EditorToolbarProps {
  onInsertMarkdown: (prefix: string, suffix?: string, defaultText?: string) => void
  onInsertImage: () => void
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onInsertMarkdown,
  onInsertImage,
}) => {
  const { editorMode, setEditorMode } = useUIStore()

  return (
    <div className="h-10 border-b border-border/80 bg-card/40 px-3 flex items-center justify-between gap-1 overflow-x-auto select-none shrink-0">
      {/* Formatting Tools */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onInsertMarkdown('**', '**', 'bold text')}
          title="Bold (Ctrl+B)"
          className="text-muted-foreground hover:text-foreground"
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onInsertMarkdown('*', '*', 'italic text')}
          title="Italic (Ctrl+I)"
          className="text-muted-foreground hover:text-foreground"
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onInsertMarkdown('~~', '~~', 'strikethrough')}
          title="Strikethrough"
          className="text-muted-foreground hover:text-foreground"
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-4 mx-1" />

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onInsertMarkdown('# ', '', 'Heading 1')}
          title="Heading 1"
          className="text-muted-foreground hover:text-foreground"
        >
          <Heading1 className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onInsertMarkdown('## ', '', 'Heading 2')}
          title="Heading 2"
          className="text-muted-foreground hover:text-foreground"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onInsertMarkdown('### ', '', 'Heading 3')}
          title="Heading 3"
          className="text-muted-foreground hover:text-foreground"
        >
          <Heading3 className="h-3.5 w-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-4 mx-1" />

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onInsertMarkdown('- ', '', 'List item')}
          title="Unordered List"
          className="text-muted-foreground hover:text-foreground"
        >
          <List className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onInsertMarkdown('1. ', '', 'List item')}
          title="Ordered List"
          className="text-muted-foreground hover:text-foreground"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onInsertMarkdown('- [ ] ', '', 'Task to do')}
          title="Checklist"
          className="text-muted-foreground hover:text-foreground"
        >
          <CheckSquare className="h-3.5 w-3.5" />
        </Button>

        <Separator orientation="vertical" className="h-4 mx-1" />

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onInsertMarkdown('```\n', '\n```', 'code here')}
          title="Code Block"
          className="text-muted-foreground hover:text-foreground"
        >
          <Code className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onInsertMarkdown('> ', '', 'Quote')}
          title="Blockquote"
          className="text-muted-foreground hover:text-foreground"
        >
          <Quote className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onInsertMarkdown('[[', ']]', 'Note Title')}
          title="Link to another note [[Note]]"
          className="text-muted-foreground hover:text-primary"
        >
          <Link className="h-3.5 w-3.5 text-indigo-400" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onInsertImage}
          title="Upload & Insert Image"
          className="text-muted-foreground hover:text-foreground"
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* View Mode Toggle (Edit / Split / Preview) */}
      <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-lg border border-border/40">
        <button
          onClick={() => setEditorMode('edit')}
          title="Edit Mode (Ctrl+Alt+1)"
          className={cn(
            'p-1 rounded text-xs transition-colors flex items-center gap-1',
            editorMode === 'edit'
              ? 'bg-background text-foreground shadow-sm font-medium'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Edit2 className="h-3 w-3" />
          <span className="hidden sm:inline text-[11px]">Edit</span>
        </button>

        <button
          onClick={() => setEditorMode('split')}
          title="Split View (Ctrl+Alt+2)"
          className={cn(
            'p-1 rounded text-xs transition-colors flex items-center gap-1',
            editorMode === 'split'
              ? 'bg-background text-foreground shadow-sm font-medium'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Columns className="h-3 w-3" />
          <span className="hidden sm:inline text-[11px]">Split</span>
        </button>

        <button
          onClick={() => setEditorMode('preview')}
          title="Preview Mode (Ctrl+Alt+3)"
          className={cn(
            'p-1 rounded text-xs transition-colors flex items-center gap-1',
            editorMode === 'preview'
              ? 'bg-background text-foreground shadow-sm font-medium'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Eye className="h-3 w-3" />
          <span className="hidden sm:inline text-[11px]">Preview</span>
        </button>
      </div>
    </div>
  )
}
