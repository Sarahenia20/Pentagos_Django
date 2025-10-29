"use client"

import { usePathname } from 'next/navigation'
import { UserNav } from './user-nav'

export default function ConditionalNav() {
  const pathname = usePathname()
  
  // Hide the global navbar on the homepage, login, register, and reset-password pages
  const hideNavbarPaths = ['/', '/login', '/register', '/reset-password']
  if (hideNavbarPaths.includes(pathname)) {
    return null
  }
  
  return <UserNav />
}
