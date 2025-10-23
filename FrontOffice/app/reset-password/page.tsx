"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    // TODO: Implement Django backend password reset
    console.log("[v0] Password reset request:", { email })
    setTimeout(() => {
      setIsLoading(false)
      setIsSubmitted(true)
    }, 1000)
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20" />
        <Card className="relative z-10 w-full max-w-md border-purple-500/20 bg-gray-900/50 backdrop-blur-xl">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="text-4xl">✉️</div>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Check Your Email
            </CardTitle>
            <CardDescription className="text-purple-200/70">
              We've sent password reset instructions to {email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-purple-300 text-center">
              If you don't see the email, check your spam folder or try again.
            </p>
            <Button
              onClick={() => setIsSubmitted(false)}
              variant="outline"
              className="w-full bg-indigo-900/50 border-purple-500/30 text-purple-100 hover:bg-indigo-800/50 hover:text-white"
            >
              Try Another Email
            </Button>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href="/login" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
              Back to Sign In
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20" />
      <Card className="relative z-10 w-full max-w-md border-purple-500/20 bg-gray-900/50 backdrop-blur-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="text-4xl">🔑</div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Reset Password
          </CardTitle>
          <CardDescription className="text-purple-200/70">
            Enter your email to receive reset instructions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-purple-100">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-indigo-900/50 border-purple-500/30 text-white placeholder:text-purple-300/50 focus:border-purple-400"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold py-6 transition-all duration-300 hover:scale-105"
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/login" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
            Back to Sign In
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
