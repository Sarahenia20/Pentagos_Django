'use client'

import { Toaster as Sonner } from 'sonner'

export function Toaster() {
  return <Sonner position="top-center" richColors expand visibleToasts={3} />
}
