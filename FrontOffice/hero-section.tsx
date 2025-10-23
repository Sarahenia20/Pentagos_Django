import { Button } from "@/components/ui/button"
import PulsingBorderShader from "./components/pulsing-border-shader"
import { ArrowRight, Sparkles, Palette, Zap, ImageIcon } from "lucide-react"
import Link from "next/link"

export default function Component() {
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20" />

      {/* Navigation */}
      <nav className="relative z-20 container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Palette className="w-8 h-8 text-purple-400" />
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              PentaArt
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800/50">
              Gallery
            </Button>
            <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800/50">
              Pricing
            </Button>
            <Link href="/login">
              <Button
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-full"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero content */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
          {/* Left side - Text content */}
          <div className="space-y-8 lg:pr-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-sm">
              <Sparkles className="w-4 h-4" />
              AI-Powered Art Generation
            </div>

            <div className="space-y-6">
              <h1 className="text-5xl lg:text-7xl font-bold tracking-tight leading-tight">
                Generate Art with{" "}
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
                  AI Magic
                </span>
              </h1>

              <p className="text-xl lg:text-2xl text-gray-300 leading-relaxed max-w-2xl">
                Turn your imagination into stunning visual art. Powered by Gemini 2.5 Flash and GPT-4o, PentaArt brings
                your creative visions to life in seconds.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-6 text-lg rounded-full group"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

              <Button
                variant="outline"
                size="lg"
                className="border-gray-600 text-white hover:bg-gray-800 px-8 py-6 text-lg rounded-full bg-transparent"
              >
                See Gallery
              </Button>
            </div>

            <div className="flex items-center gap-8 pt-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                50 Free Generations
              </div>
              <div>No Credit Card</div>
              <div>HD Quality</div>
            </div>
          </div>

          {/* Right side - Animation */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              {/* Glow effect behind the shader */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-3xl scale-110" />

              {/* Main shader component */}
              <div className="relative">
                <PulsingBorderShader />
              </div>

              {/* Floating elements */}
              <div
                className="absolute -top-4 -right-4 w-3 h-3 bg-purple-400 rounded-full animate-bounce"
                style={{ animationDelay: "0s" }}
              />
              <div
                className="absolute top-1/3 -left-6 w-2 h-2 bg-pink-400 rounded-full animate-bounce"
                style={{ animationDelay: "1s" }}
              />
              <div
                className="absolute bottom-1/4 -right-8 w-4 h-4 bg-amber-400 rounded-full animate-bounce"
                style={{ animationDelay: "2s" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="relative z-10 container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            How{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">PentaArt</span>{" "}
            Works
          </h2>
          <p className="text-xl text-gray-400">Create stunning art in three simple steps</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-transparent rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
            <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 hover:border-purple-500/50 transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-400 rounded-xl flex items-center justify-center mb-6">
                <span className="text-2xl font-bold">1</span>
              </div>
              <h3 className="text-2xl font-bold mb-4">Sign Up Free</h3>
              <p className="text-gray-400 leading-relaxed">
                Create your account in seconds. No credit card required. Start with 50 free generations.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-600/20 to-transparent rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
            <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 hover:border-pink-500/50 transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-600 to-pink-400 rounded-xl flex items-center justify-center mb-6">
                <span className="text-2xl font-bold">2</span>
              </div>
              <h3 className="text-2xl font-bold mb-4">Describe Your Vision</h3>
              <p className="text-gray-400 leading-relaxed">
                Type what you imagine. Our AI understands natural language and artistic concepts.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-600/20 to-transparent rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
            <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 hover:border-amber-500/50 transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-600 to-amber-400 rounded-xl flex items-center justify-center mb-6">
                <span className="text-2xl font-bold">3</span>
              </div>
              <h3 className="text-2xl font-bold mb-4">Generate & Download</h3>
              <p className="text-gray-400 leading-relaxed">
                Watch your art come to life in seconds. Download in HD, share, or create variations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="relative z-10 container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            Simple{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Pricing</span>
          </h2>
          <p className="text-xl text-gray-400">Choose the plan that fits your creative needs</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Free Tier */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-600/10 to-transparent rounded-2xl blur-xl" />
            <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-2">Free</h3>
              <div className="mb-6">
                <span className="text-5xl font-bold">$0</span>
                <span className="text-gray-400">/month</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">50 generations/month</span>
                </li>
                <li className="flex items-start gap-3">
                  <ImageIcon className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">Standard quality</span>
                </li>
                <li className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">Community access</span>
                </li>
              </ul>
              <Link href="/register">
                <Button className="w-full bg-gray-800 hover:bg-gray-700 text-white rounded-full">Get Started</Button>
              </Link>
            </div>
          </div>

          {/* Premium Tier */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-pink-600/30 rounded-2xl blur-xl" />
            <div className="relative bg-gray-900/50 backdrop-blur-sm border-2 border-purple-500 rounded-2xl p-8">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-sm font-semibold">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold mb-2">Premium</h3>
              <div className="mb-6">
                <span className="text-5xl font-bold">$19</span>
                <span className="text-gray-400">/month</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">Unlimited generations</span>
                </li>
                <li className="flex items-start gap-3">
                  <ImageIcon className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">HD quality (4K)</span>
                </li>
                <li className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">No watermarks</span>
                </li>
                <li className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">Priority generation</span>
                </li>
              </ul>
              <Link href="/register">
                <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-full">
                  Upgrade Now
                </Button>
              </Link>
            </div>
          </div>

          {/* Enterprise Tier */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 to-transparent rounded-2xl blur-xl" />
            <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
              <div className="mb-6">
                <span className="text-5xl font-bold">Custom</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">Unlimited everything</span>
                </li>
                <li className="flex items-start gap-3">
                  <ImageIcon className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">API access</span>
                </li>
                <li className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">Dedicated support</span>
                </li>
                <li className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300">Custom models</span>
                </li>
              </ul>
              <Button className="w-full bg-gray-800 hover:bg-gray-700 text-white rounded-full">Contact Sales</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
    </div>
  )
}
