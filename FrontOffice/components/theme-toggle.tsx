"use client"

import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const shouldBeDark = stored === "dark" || (!stored && prefersDark)

    setIsDark(shouldBeDark)
    document.documentElement.classList.toggle("dark", shouldBeDark)
    document.documentElement.classList.toggle("light", !shouldBeDark)
  }, [])

  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)

    document.documentElement.classList.toggle("dark", newTheme)
    document.documentElement.classList.toggle("light", !newTheme)

    localStorage.setItem("theme", newTheme ? "dark" : "light")
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative h-9 w-9 rounded-full hover:bg-purple-500/10"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-amber-400 transition-all" />
      ) : (
        <Moon className="h-5 w-5 text-purple-600 transition-all" />
      )}
    </Button>
  )
}
