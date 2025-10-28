"use client"
import React from 'react'
import { CurrentUserProvider } from '@/lib/CurrentUserProvider'

// ClientRoot is mounted from the server layout as a client-only entry
// It mounts CurrentUserProvider to populate the shared user store.
export default function ClientRoot() {
  return <CurrentUserProvider />
}
