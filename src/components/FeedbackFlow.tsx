"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, MapPin, ArrowRight, Star, CheckCircle2, Loader2 } from "lucide-react"
import FingerprintJS from '@fingerprintjs/fingerprintjs'

import { StarRating } from "./StarRating"
import { PremiumCard } from "./ui/PremiumCard"
import { Textarea } from "./ui/Textarea"
import { Input } from "./ui/Input" // Tambahkan ini
import { Button } from "./ui/Button"
import { supabase } from "@/lib/supabase"
import { sendTelegramNotification } from "@/actions/telegram"

type FlowState = "initial" | "complaint" | "appreciation" | "success" | "already_voted"

export function FeedbackFlow() {
  const [rating, setRating] = React.useState<number>(0)
  const [tempRating, setTempRating] = React.useState<number>(0)
  const [flowState, setFlowState] = React.useState<FlowState>("initial")
  const [comment, setComment] = React.useState("")
  const [customerContact, setCustomerContact] = React.useState("") // Tambahkan ini
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [visitorId, setVisitorId] = React.useState<string | null>(null)
  const [lastInsertedId, setLastInsertedId] = React.useState<string | null>(null)

  const [kebersihan, setKebersihan] = React.useState(0)
  const [rasa, setRasa] = React.useState(0)
  const [pelayanan, setPelayanan] = React.useState(0)

  const googleMapsUrl = process.env.NEXT_PUBLIC_GOOGLE_MAPS_URL || "https://g.page/r/placeholder"

  React.useEffect(() => {
    async function initAntiSpam() {
      try {
        const fp = await FingerprintJS.load()
        const result = await fp.get()
        const vid = result.visitorId
        setVisitorId(vid)

        const checkTime = new Date()
        checkTime.setHours(checkTime.getHours() - 24)

        const { data, error } = await supabase
          .from("feedbacks")
          .select("id")
          .eq("visitor_id", vid)
          .gt("created_at", checkTime.toISOString())
          .limit(1)

        if (data && data.length > 0) {
          setFlowState("already_voted")
        }
      } catch (err) {
        console.error("Anti-spam failed:", err)
      } finally {
        setIsLoading(false)
      }
    }
    initAntiSpam()
  }, [])

  const handleRatingSelect = async (selectedRating: number) => {
    setRating(selectedRating)
    const savedId = await saveToDatabase(selectedRating, "")
    if (savedId) setLastInsertedId(savedId)

    if (selectedRating <= 3) {
      setFlowState("complaint")
    } else {
      setFlowState("appreciation")
      fireConfetti()
    }
  }

  const fireConfetti = async () => {
    const confetti = (await import("canvas-confetti")).default
    const duration = 3 * 1000
    const animationEnd = Date.now() + duration
    const defaults = { 
        startVelocity: 30, spread: 360, ticks: 60, zIndex: 0,
        colors: ['#10B981', '#34D399', '#A7F3D0'] 
    }

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now()
      if (timeLeft <= 0) return clearInterval(interval)
      const particleCount = 50 * (timeLeft / duration)
      confetti({ ...defaults, particleCount, origin: { x: Math.random() * 0.2 + 0.1, y: Math.random() - 0.2 } })
      confetti({ ...defaults, particleCount, origin: { x: Math.random() * 0.2 + 0.7, y: Math.random() - 0.2 } })
    }, 250)
  }

  const saveToDatabase = async (ratingVal: number, commentVal: string, subs?: {keb:number, ras:number, pel:number}, contact?: string) => {
    try {
      const payload = { 
        rating: ratingVal, 
        comment: commentVal,
        kebersihan: subs?.keb || 0,
        rasa: subs?.ras || 0,
        pelayanan: subs?.pel || 0,
        visitor_id: visitorId,
        customer_contact: contact || null
      }

      if (lastInsertedId) {
        const { error } = await supabase
          .from("feedbacks")
          .update(payload)
          .eq("id", lastInsertedId)
        if (error) console.error("Update error:", error)
        return lastInsertedId
      } else {
        const { data, error } = await supabase
          .from("feedbacks")
          .insert([payload])
          .select()
          .single()
        if (error) return null
        return data.id
      }
    } catch (err) {
      return null
    }
  }

  const handleComplaintSubmit = async () => {
    if (!comment.trim()) return
    setIsSubmitting(true)

    const calculatedAvgRating = Math.round((kebersihan + rasa + pelayanan) / 3) || rating
    
    await saveToDatabase(
      calculatedAvgRating, 
      comment, 
      { keb: kebersihan, ras: rasa, pel: pelayanan },
      customerContact
    )

    await sendTelegramNotification({
      rating: calculatedAvgRating,
      kebersihan,
      rasa,
      pelayanan,
      comment,
      customer_contact: customerContact
    })

    setIsSubmitting(false)
    setFlowState("success")
  }

  const handleAppreciationSubmit = async () => {
    setIsSubmitting(true)
    await saveToDatabase(rating, "")
    setIsSubmitting(false)
    window.location.href = googleMapsUrl
  }

  if (isLoading) {
    return (
      <PremiumCard className="w-full max-w-lg mx-auto flex flex-col items-center justify-center py-20 italic text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-emerald-500" />
        Menyiapkan sistem ulasan...
      </PremiumCard>
    )
  }

  return (
    <PremiumCard className="w-full max-w-lg mx-auto relative overflow-hidden">
      <AnimatePresence mode="wait">
        {flowState === "initial" && (
          <motion.div
            key="initial"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center text-center space-y-6"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
                Bagaimana pengalaman Anda?
              </h2>
              <p className="text-gray-500">
                Bantu kami menjadi lebih baik dengan memberikan rating.
              </p>
            </div>
            <div className="py-6 scale-110">
              <StarRating onRatingSelect={setTempRating} />
            </div>

            {tempRating > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full"
              >
                <Button 
                  onClick={() => handleRatingSelect(tempRating)}
                  className="w-full py-6 rounded-2xl text-lg shadow-lg shadow-emerald-100"
                >
                  Konfirmasi Penilaian
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}

        {flowState === "complaint" && (
          <motion.div
            key="complaint"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex flex-col space-y-6"
          >
            <div className="space-y-1 text-center">
              <h2 className="text-xl font-bold text-gray-900">
                Evaluasi Layanan Kami
              </h2>
              <p className="text-sm text-gray-500">
                Bantu kami mengidentifikasi kekurangan kami.
              </p>
            </div>

            <div className="space-y-4 bg-gray-50 p-4 rounded-3xl border border-gray-100">
              <DetailRow label="🧹 Kebersihan" value={kebersihan} onChange={setKebersihan} />
              <DetailRow label="🍽️ Rasa Hidangan" value={rasa} onChange={setRasa} />
              <DetailRow label="👤 Pelayanan" value={pelayanan} onChange={setPelayanan} />
            </div>

            <div className="space-y-2">
               <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Komentar Tambahan</p>
               <Textarea
                placeholder="Apa yang bisa kami tingkatkan?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            {/* Follup Section */}
            <div className="space-y-2">
               <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Informasi Kontak (Opsional)</p>
               <Input
                placeholder="Nomor WhatsApp atau Email"
                value={customerContact}
                onChange={(e) => setCustomerContact(e.target.value)}
              />
              <p className="text-[10px] text-gray-400 italic ml-1">
                Isi jika Anda ingin dihubungi oleh manajemen untuk solusi/kompensasi.
              </p>
            </div>

            <Button
              className="w-full group"
              size="lg"
              disabled={isSubmitting || !comment.trim()}
              onClick={handleComplaintSubmit}
            >
              {isSubmitting ? "Mengirim..." : "Kirim Masukan"}
              <Send className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        )}

        {flowState === "appreciation" && (
          <motion.div
            key="appreciation"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex flex-col items-center text-center space-y-6"
          >
            <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-2">
              <Star className="w-8 h-8 fill-emerald-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">
                Terima Kasih!
              </h2>
              <p className="text-gray-600 px-4">
                Kami sangat senang Anda menyukai layanan kami. Dukungan Anda sangat berarti.
              </p>
            </div>
            <Button
              className="w-full group mt-4"
              size="lg"
              disabled={isSubmitting}
              onClick={handleAppreciationSubmit}
            >
              <MapPin className="w-5 h-5 mr-2" />
              Bantu Kami di Google Maps
              <ArrowRight className="w-4 h-4 ml-2 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </Button>
          </motion.div>
        )}

        {flowState === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center py-8 space-y-4"
          >
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mb-2">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Masukan Diterima</h2>
            <p className="text-gray-600 px-6">
              Terima kasih, masukan Anda telah kami terima secara anonim. Kami akan segera mengevaluasi laporan Anda.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-6 text-sm font-semibold text-emerald-600"
            >
              Kembali ke Beranda
            </button>
          </motion.div>
        )}

        {flowState === "already_voted" && (
          <motion.div
            key="already_voted"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center py-8 space-y-4"
          >
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-2">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Terima Kasih!</h2>
            <p className="text-gray-600 px-6">
              Anda sudah memberikan ulasan untuk hari ini. Masukan Anda sangat berarti bagi kami.
            </p>
            <p className="text-xs text-gray-400 italic mt-4">
              Anda dapat memberikan ulasan kembali dalam 24 jam.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </PremiumCard>
  )
}

function DetailRow({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
              value >= i 
                ? "bg-emerald-500 text-white shadow-sm" 
                : "bg-white text-gray-300 border border-gray-100 hover:border-emerald-200"
            }`}
          >
            {i}
          </button>
        ))}
      </div>
    </div>
  )
}
