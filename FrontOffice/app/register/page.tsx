"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!")
      return
    }
    setIsLoading(true)
    // TODO: Implement Django backend registration
    console.log("[v0] Registration attempt:", { username: formData.username, email: formData.email })
    setTimeout(() => setIsLoading(false), 1000)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20" />
      <Card className="relative z-10 w-full max-w-md border-purple-500/20 bg-gray-900/50 backdrop-blur-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="text-4xl">🎨</div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Join PentaArt
          </CardTitle>
          <CardDescription className="text-purple-200/70">Create your account and start generating art</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-purple-100">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="artcreator"
                value={formData.username}
                onChange={handleChange}
                required
                className="bg-indigo-900/50 border-purple-500/30 text-white placeholder:text-purple-300/50 focus:border-purple-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-purple-100">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="bg-indigo-900/50 border-purple-500/30 text-white placeholder:text-purple-300/50 focus:border-purple-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-purple-100">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                className="bg-indigo-900/50 border-purple-500/30 text-white placeholder:text-purple-300/50 focus:border-purple-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-purple-100">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                minLength={8}
                className="bg-indigo-900/50 border-purple-500/30 text-white placeholder:text-purple-300/50 focus:border-purple-400"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold py-6 transition-all duration-300 hover:scale-105"
            >
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>

          <p className="text-xs text-purple-300/70 text-center mt-4">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-purple-300">
            Already have an account?{" "}
            <Link href="/login" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
