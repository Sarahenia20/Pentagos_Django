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
    const token = apiClient.getToken()
    if (!token) return

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me/`, { headers: apiClient.headers() })
        if (!res.ok) {
          // token invalid or expired
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

    fetchUser()
  }, [])

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
                <DropdownMenuItem asChild>
                  <Link href="/" className="cursor-pointer text-red-600" onClick={() => { localStorage.removeItem('pentaart_token'); setUser(null); }}>
                    Log out
                  </Link>
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
