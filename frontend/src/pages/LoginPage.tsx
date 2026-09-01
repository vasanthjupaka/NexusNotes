import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sparkles, ArrowRight, Lock, Mail, ShieldCheck } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { setToken, fetchCurrentUser } = useAuthStore()
  const { toast } = useToast()

  const [email, setEmail] = useState('demo@nexusnotes.dev')
  const [password, setPassword] = useState('demopassword123')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const tokenResponse = await authApi.login({ email, password })
      setToken(tokenResponse.access_token)
      await fetchCurrentUser()
      toast({
        title: 'Welcome back!',
        description: 'Successfully authenticated to NexusNotes.',
      })
      navigate('/')
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: err.response?.data?.detail || 'Invalid email or password.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-card/40 to-background p-4">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-card/80 backdrop-blur-xl border border-border/80 rounded-2xl p-8 shadow-2xl relative z-10">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-[2px] shadow-lg mb-4">
            <div className="h-full w-full bg-card rounded-[10px] flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-indigo-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome to NexusNotes</h1>
          <p className="text-xs text-muted-foreground mt-1.5">
            Cloud-native knowledge management & bidirectional thought architecture.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              <span>Email Address</span>
            </label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-background/60"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              <span>Password</span>
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-background/60"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-90 text-white font-medium shadow-md h-10 mt-2 gap-2"
          >
            <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        {/* Demo Credentials Helper Pill */}
        <div className="mt-6 p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs text-muted-foreground flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-foreground">Development Demo Account</span>
            <p className="text-[11px] text-muted-foreground/80">
              Email: <code className="text-primary font-mono">demo@nexusnotes.dev</code> | Password: <code className="text-primary font-mono">demopassword123</code>
            </p>
          </div>
        </div>

        {/* Switch to Register */}
        <div className="text-center mt-6 text-xs text-muted-foreground">
          Don't have an account yet?{' '}
          <Link to="/register" className="text-primary font-semibold hover:underline">
            Register for free
          </Link>
        </div>
      </div>
    </div>
  )
}
