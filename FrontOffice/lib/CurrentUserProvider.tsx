"use client"
import React, { createContext, useContext, useEffect, useState } from 'react'
import apiClient from './api'
import { getStoredUser, fetchUserOnce, setStoredUser } from './currentUserStore'

type User = any | null

const CurrentUserContext = createContext<User | undefined>(undefined)

export function CurrentUserProvider({ children }: { children?: React.ReactNode }) {
  const [user, setUser] = useState<User>(getStoredUser())

  useEffect(() => {
    const token = apiClient.getToken()
    if (!token) return

    let mounted = true
    fetchUserOnce().then((u) => {
      if (!mounted) return
      setUser(u)
      setStoredUser(u)
    }).catch((e) => {
      console.error('CurrentUserProvider fetch failed', e)
      if (mounted) setUser(null)
      setStoredUser(null)
    })

    return () => { mounted = false }
  }, [])

  // Note: children is optional — this provider is often mounted as a standalone client entry
  return <CurrentUserContext.Provider value={user}>{children ?? null}</CurrentUserContext.Provider>
}

export function useCurrentUserContext() {
  const ctx = useContext(CurrentUserContext)
  return ctx === undefined ? null : ctx
}
