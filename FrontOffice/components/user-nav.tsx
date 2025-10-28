"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from 'react'
import apiClient from '@/lib/api'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeToggle } from "@/components/theme-toggle"

export function UserNav() {
  const [user, setUser] = useState<any | null>(null)

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

    const fetchUser = async () => {
      try {
        // Always attempt to fetch current user. If a token exists in localStorage
        // include it in headers; otherwise rely on session cookie set by the backend.
        const headers = apiClient.headers()
        const res = await fetch(`${API_BASE}/auth/me/`, { headers, credentials: 'include' })
        if (!res.ok) {
          // not authenticated
          setUser(null)
          return
        }
        const data = await res.json()
        setUser(data)
      } catch (err) {
        console.error('Failed to fetch current user', err)
        setUser(null)
      }
    }

    // Try to fetch user regardless of local token presence. This lets session-based
    // auth (from OAuth callback) succeed even when the client doesn't have a token.
    fetchUser()
    // listen for profile updates from other components (e.g., avatar change)
    const onProfileUpdated = (e: any) => {
      try {
        const avatar = e?.detail?.avatar
        if (avatar) {
          setUser((prev: any) => ({ ...(prev || {}), profile: { ...(prev?.profile || {}), avatar } }))
        }
      } catch (err) {
        // ignore
      }
    }

    window.addEventListener('profile-updated', onProfileUpdated as EventListener)
    return () => window.removeEventListener('profile-updated', onProfileUpdated as EventListener)
  }, [])

  const handleLogout = async () => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
    try {
      // Read CSRF token from cookie and send it in header so Django accepts the POST
      const getCookie = (name: string) => {
        if (typeof document === 'undefined') return ''
        const match = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]+)'))
        return match ? decodeURIComponent(match[2]) : ''
      }
      const csrf = getCookie('csrftoken')
      // If we have a token in localStorage, include it so TokenAuthentication can authenticate the request
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('pentaart_token') : null
      const headers: Record<string, string> = {}
      if (csrf) headers['X-CSRFToken'] = csrf
      if (storedToken) headers['Authorization'] = `Token ${storedToken}`

      const res = await fetch(`${API_BASE}/auth/logout/`, { method: 'POST', credentials: 'include', headers })
      if (!res.ok) {
        console.warn('Logout request returned non-OK', res.status)
      }
    } catch (err) {
      console.warn('Logout request failed', err)
    }
    // Clear client-side tokens/flags after attempting logout
    try { localStorage.removeItem('pentaart_token') } catch(e){}
    try { document.cookie = 'pentaart_token=; path=/; max-age=0' } catch(e){}
    try { sessionStorage.removeItem('pentaart_token_applied') } catch(e){}
    setUser(null)
    // redirect to home
    try { window.location.href = '/' } catch(e){}
  }

  return (
    <header className="border-b dark:border-purple-500/20 light:border-purple-200 dark:bg-gray-900/50 light:bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="text-2xl">🎨</div>
          <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            PentaArt
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/profile"
            className="text-sm font-medium dark:text-gray-300 light:text-gray-700 dark:hover:text-purple-400 light:hover:text-purple-600 transition-colors"
          >
            Profile
          </Link>
          <Link
            href="/community"
            className="text-sm font-medium dark:text-gray-300 light:text-gray-700 dark:hover:text-purple-400 light:hover:text-purple-600 transition-colors"
          >
            Community
          </Link>
          <Link
            href="/gallery"
            className="text-sm font-medium dark:text-gray-300 light:text-gray-700 dark:hover:text-purple-400 light:hover:text-purple-600 transition-colors"
          >
            Gallery
          </Link>
          <Link
            href="/studio"
            className="text-sm font-medium dark:text-gray-300 light:text-gray-700 dark:hover:text-purple-400 light:hover:text-purple-600 transition-colors"
          >
            Art Studio
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10 border-2 border-purple-500/30">
                    <AvatarImage src={user.profile?.avatar || '/placeholder_64px.png'} alt="User" />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                      {user.username?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.first_name || user.username}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/gallery" className="cursor-pointer">
                    My Gallery
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/studio" className="cursor-pointer">
                    Art Studio
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <button onClick={handleLogout} className="w-full text-left cursor-pointer text-red-600">Log out</button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost">Sign in</Button>
              </Link>
              <Link href="/register">
                <Button>Sign up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
