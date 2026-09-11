"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Lock } from "lucide-react"

import { PremiumCard } from "@/components/ui/PremiumCard"
import { Button } from "@/components/ui/Button"
import { loginAction } from "@/actions/auth"

export default function AdminLogin() {
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await loginAction(password)
      if (result.success) {
        window.location.href = "/admin"
      } else {
        setError(result.error || "Login gagal")
      }
    } catch {
      setError("Terjadi kesalahan. Coba lagi.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen py-12 px-4 bg-gray-50">
      <PremiumCard className="w-full max-w-sm">
        <div className="flex flex-col items-center space-y-4 mb-6">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Area</h1>
          <p className="text-sm text-gray-500 text-center">
            Masukkan kata sandi untuk mengakses dasbor.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Kata Sandi..."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              required
            />
            {error && <p className="text-sm text-red-500 font-medium px-1">{error}</p>}
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? "Memeriksa..." : "Masuk"}
          </Button>
        </form>
      </PremiumCard>
    </div>
  )
}
