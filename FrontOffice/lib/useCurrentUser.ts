"use client"
import { useEffect, useState } from 'react'
import apiClient from './api'
import { getStoredUser, fetchUserOnce } from './currentUserStore'

export default function useCurrentUser() {
  const [user, setUser] = useState<any | null>(getStoredUser())

  useEffect(() => {
    const token = apiClient.getToken()
    if (!token) return

    let mounted = true
    // use shared store to dedupe concurrent requests
    fetchUserOnce().then((u) => {
      if (!mounted) return
      setUser(u)
    }).catch((e) => {
      if (!mounted) return
      console.error('useCurrentUser fetch failed', e)
      setUser(null)
    })

    return () => { mounted = false }
  }, [])

  return user
}
