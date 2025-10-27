"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const paramUid = searchParams.get('uid') || ''
  const paramToken = searchParams.get('token') || ''

  // Shared state
  const [mode, setMode] = useState<'request' | 'confirm'>(() => (paramUid && paramToken ? 'confirm' : 'request'))

  // Request reset
  const [email, setEmail] = useState('')
  const [isRequesting, setIsRequesting] = useState(false)
  const [requestSent, setRequestSent] = useState(false)
  const [debugResetUrl, setDebugResetUrl] = useState<string | null>(null)

  // Confirm reset
  const [uid, setUid] = useState(paramUid)
  const [token, setToken] = useState(paramToken)
  const [username, setUsername] = useState<string | null>(null)
  const [isLoadingUsername, setIsLoadingUsername] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // If the page was opened with uid+token, stay in confirm mode and prefill fields
    if (paramUid && paramToken) {
      setMode('confirm')
      setUid(paramUid)
      setToken(paramToken)
    }
  }, [paramUid, paramToken])

  // Fetch username for the provided uid so we can display it without showing token
  useEffect(() => {
    const fetchUsername = async () => {
      if (!uid) return
      setIsLoadingUsername(true)
      try {
        const res = await fetch(`${API_BASE}/auth/uid_info/?uid=${encodeURIComponent(uid)}`)
        if (!res.ok) {
          setUsername(null)
        } else {
          const data = await res.json().catch(() => ({}))
          setUsername(data.username || null)
        }
      } catch (err) {
        console.error('Failed to fetch username for uid', err)
        setUsername(null)
      } finally {
        setIsLoadingUsername(false)
      }
    }

    if (mode === 'confirm' && uid) fetchUsername()
  }, [mode, uid])

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error('Please enter your email')
      return
    }
    setIsRequesting(true)
    try {
      const res = await fetch(`${API_BASE}/auth/password_reset/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data.detail || JSON.stringify(data)
        toast.error('Request failed: ' + msg)
      } else {
        setRequestSent(true)
        toast.success('If the email exists, a reset link has been sent')
        // In DEBUG the backend returns reset_url for convenience — capture it for developer testing
        if (data.reset_url) setDebugResetUrl(data.reset_url)
      }
    } catch (err) {
      console.error('Request error', err)
      toast.error('Failed to request password reset')
    } finally {
      setIsRequesting(false)
    }
  }

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uid || !token) {
      toast.error('Missing uid or token. If you opened the link from email this should be filled automatically.')
      return
    }
    if (!password || password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (password !== passwordConfirm) {
      toast.error('Passwords do not match')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/auth/password_reset/confirm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, token, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data.detail || JSON.stringify(data)
        toast.error('Reset failed: ' + msg)
      } else {
        toast.success('Password reset successful — redirecting to login')
        setTimeout(() => router.push('/login'), 1400)
      }
    } catch (err) {
      console.error('Reset error', err)
      toast.error('Failed to reset password')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20" />

      <Card className="relative z-10 w-full max-w-md border-purple-500/20 bg-gray-900/50 backdrop-blur-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="text-4xl">🔑</div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            {mode === 'request'
              ? 'Reset Password'
              : `Reset password for ${isLoadingUsername ? 'Loading…' : (username ?? 'your account')}`}
          </CardTitle>
          <CardDescription className="text-purple-200/70">
            {mode === 'request'
              ? "Enter your email to receive reset instructions"
              : 'Enter a new secure password to restore access to your account.'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {mode === 'request' ? (
            requestSent ? (
              <div className="space-y-4 text-center">
                  <p className="text-sm text-purple-300">If the email exists, you will receive reset instructions shortly.</p>
                  <div className="pt-2">
                    <Button variant="outline" onClick={() => setRequestSent(false)} className="w-full">Try another email</Button>
                  </div>
                </div>
            ) : (
              <form onSubmit={handleRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-purple-100">Email Address</Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <Button type="submit" disabled={isRequesting} className="w-full">
                  {isRequesting ? 'Sending…' : 'Send Reset Link'}
                </Button>
              </form>
            )
          ) : (
            <form onSubmit={handleConfirm} className="space-y-4">
              {/* Minimal confirm UI: show username only in the header and present password inputs */}

              <div className="grid gap-2">
                <Label htmlFor="password">New password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="passwordConfirm">Confirm password</Label>
                <Input id="passwordConfirm" type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} placeholder="Repeat new password" />
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Resetting…' : 'Reset Password'}</Button>
              </div>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Link href="/login" className="text-sm text-purple-400 hover:text-purple-300">Back to Sign In</Link>
          <Button variant="ghost" onClick={() => setMode(mode === 'request' ? 'confirm' : 'request')}>{mode === 'request' ? 'I have a link' : 'Request link'}</Button>
        </CardFooter>
      </Card>
    </main>
  )
}
