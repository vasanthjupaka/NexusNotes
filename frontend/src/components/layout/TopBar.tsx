import React from 'react'
import {
  Search,
  Command,
  PanelLeft,
  PanelRight,
  Sun,
  Moon,
  Plus,
  Network,
  LogOut,
  User as UserIcon,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { useNoteStore } from '@/stores/noteStore'
import { useNavigate } from 'react-router-dom'
import { notesApi } from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'

export const TopBar: React.FC = () => {
  const { user, logout } = useAuthStore()
  const {
    toggleSidebar,
    toggleContextPanel,
    theme,
    toggleTheme,
    setCommandPaletteOpen,
  } = useUIStore()
  const { setActiveNote } = useNoteStore()
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleCreateNote = async () => {
    try {
      const newNote = await notesApi.create({
        title: 'Untitled Note',
        content: '# Untitled Note\n\nStart writing your thoughts here...',
      })
      setActiveNote(newNote)
      navigate('/')
      toast({
        title: 'Note created',
        description: 'New blank note ready for editing.',
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Failed to create note',
        description: 'Could not create a new note. Please try again.',
      })
    }
  }

  const userInitials = user?.display_name
    ? user.display_name.substring(0, 2).toUpperCase()
    : user?.username.substring(0, 2).toUpperCase() || 'NX'

  return (
    <header className="h-14 border-b border-border bg-card/60 backdrop-blur-md px-4 flex items-center justify-between z-30 sticky top-0 select-none">
      {/* Left section: App branding & Sidebar toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleSidebar}
          title="Toggle Navigation Sidebar (Ctrl+\)"
          className="text-muted-foreground hover:text-foreground"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>

        <div
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => navigate('/')}
        >
          <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-[1.5px] shadow-sm group-hover:scale-105 transition-transform">
            <div className="h-full w-full bg-card rounded-[6px] flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            </div>
          </div>
          <span className="font-bold text-sm tracking-tight hidden sm:inline-block bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
            NexusNotes
          </span>
        </div>
      </div>

      {/* Middle section: Search & Command Palette trigger */}
      <div className="flex items-center gap-2 max-w-md w-full mx-2 sm:mx-6">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-border/80 bg-background/50 hover:bg-accent/60 text-xs text-muted-foreground transition-all shadow-inner group"
        >
          <span className="flex items-center gap-2 truncate">
            <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="hidden md:inline">Quick search or command...</span>
            <span className="md:hidden">Search...</span>
          </span>
          <kbd className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground">
            <Command className="h-2.5 w-2.5" /> K
          </kbd>
        </button>
      </div>

      {/* Right section: Actions & User menu */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button
          onClick={handleCreateNote}
          size="sm"
          className="h-8 gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-sm font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New Note</span>
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate('/graph')}
          title="Open Knowledge Graph"
          className="text-muted-foreground hover:text-foreground"
        >
          <Network className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          title="Toggle Theme"
          className="text-muted-foreground hover:text-foreground"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleContextPanel}
          title="Toggle Context Panel"
          className="text-muted-foreground hover:text-foreground hidden lg:flex"
        >
          <PanelRight className="h-4 w-4" />
        </Button>

        {/* User profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0 ml-1">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.display_name || user?.username}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Settings & Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/graph')}>
              <Network className="mr-2 h-4 w-4" />
              <span>Knowledge Graph</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
