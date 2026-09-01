import React from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { Sidebar } from '@/components/layout/Sidebar'
import { CommandPalette } from '@/components/search/CommandPalette'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  User,
  Shield,
  Cloud,
  Database,
  Server,
  Layers,
  CheckCircle2,
  Lock,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

export const SettingsPage: React.FC = () => {
  const { user } = useAuthStore()

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings & Environment</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Manage your user profile and view system deployment telemetry.
            </p>
          </div>

          {/* User Profile Section */}
          <div className="bg-card/60 backdrop-blur-md border border-border/80 rounded-xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5 font-semibold text-sm">
              <User className="h-4 w-4 text-primary" />
              <span>User Profile</span>
            </div>
            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Username</label>
                <Input value={user?.username || ''} disabled className="bg-muted/40 font-mono" />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Email Address</label>
                <Input value={user?.email || ''} disabled className="bg-muted/40 font-mono" />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Display Name</label>
                <Input value={user?.display_name || user?.username || ''} disabled className="bg-muted/40" />
              </div>

              <div className="space-y-1">
                <label className="text-muted-foreground font-medium">Member Since</label>
                <Input value={user?.created_at ? formatDate(user.created_at) : 'N/A'} disabled className="bg-muted/40 font-mono" />
              </div>
            </div>
          </div>

          {/* AWS & Cloud-Native Architecture Overview */}
          <div className="bg-card/60 backdrop-blur-md border border-border/80 rounded-xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5 font-semibold text-sm">
              <Cloud className="h-4 w-4 text-indigo-400" />
              <span>Cloud-Native Infrastructure Architecture</span>
            </div>
            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-lg bg-muted/30 border border-border/50 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Database className="h-4 w-4 text-amber-400" />
                  <span>MySQL Database</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Stores users, normalized notes, folders, tags, note backlinks, and attachment metadata.
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3 w-3" /> Indexed & Normalized
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-muted/30 border border-border/50 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Server className="h-4 w-4 text-blue-400" />
                  <span>Amazon S3 / MinIO</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Stores raw and edited image objects in a private S3 bucket. Never stored in MySQL.
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3 w-3" /> Private with IAM Roles
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-muted/30 border border-border/50 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Shield className="h-4 w-4 text-purple-400" />
                  <span>Security & JWT</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Bcrypt password hashing, short-lived JWT access tokens, and httpOnly refresh cookies.
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3 w-3" /> Zero Hardcoded Secrets
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
      <CommandPalette />
    </div>
  )
}
