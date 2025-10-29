// Shared in-memory store to dedupe fetching of current user across client components
import apiClient from './api'

export type User = any | null

let storedUser: User = null
let fetchPromise: Promise<User> | null = null

export function getStoredUser(): User {
  return storedUser
}

export function setStoredUser(u: User) {
  storedUser = u
}

export async function fetchUserOnce(): Promise<User> {
  // return cached user
  if (storedUser !== null) return storedUser
  if (fetchPromise) return fetchPromise

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

  fetchPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me/`, { headers: apiClient.headers() })
      if (!res.ok) {
        setStoredUser(null)
        return null
      }
      const data = await res.json()
      setStoredUser(data)
      return data
    } catch (err) {
      console.error('fetchUserOnce failed', err)
      setStoredUser(null)
      return null
    } finally {
      fetchPromise = null
    }
  })()

  return fetchPromise
}
