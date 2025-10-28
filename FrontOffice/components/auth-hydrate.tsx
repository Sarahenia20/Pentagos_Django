"use client"

import { useEffect } from 'react'

export default function AuthHydrate() {
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const hash = window.location.hash || ''
      if (!hash) return
      // parse #token=... and optionally other keys like next
      const params = new URLSearchParams(hash.replace(/^#/, ''))
      const token = params.get('token')
      if (token) {
        try {
          localStorage.setItem('pentaart_token', token)
        } catch (err) {
          console.error('Failed to persist token to localStorage', err)
        }
        // remove token from the URL without reloading
        const url = new URL(window.location.href)
        url.hash = ''
        window.history.replaceState({}, document.title, url.toString())
        // reload to let UI pick up the token (UserNav will fetch /auth/me/)
        // but avoid infinite loops by checking an indicator
        if (!sessionStorage.getItem('pentaart_token_applied')) {
          sessionStorage.setItem('pentaart_token_applied', '1')
          window.location.reload()
        }
      }
    } catch (err) {
      console.error('auth-hydrate error', err)
    }
  }, [])

  return null
}
