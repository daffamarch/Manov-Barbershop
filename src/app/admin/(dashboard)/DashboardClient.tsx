"use client"

import * as React from "react"
import {
  Users,
  Star,
  AlertCircle,
  FileDown,
  Calendar,
  MessageSquare,
  Sparkles,
  Send,
  Copy,
  RefreshCw,
  X,
  Check,
  Loader2,
  Phone,
  CheckSquare,
  Square,
  Lightbulb,
  AlertOctagon,
  Trash2,
} from "lucide-react"

import { PremiumCard } from "@/components/ui/PremiumCard"
import { generateFollowUpChat, generateOwnerInsights } from "@/actions/gemini"
import { deleteFeedbackAction } from "@/actions/feedback"

type Feedback = {
  id: string
  rating: number
  comment: string | null
  kebersihan: number | null
  rasa: number | null
  pelayanan: number | null
  customer_contact: string | null
  created_at: string
}

type OwnerInsightsData = {
  worstMetric: string
  summary: string
  recommendations: string[]
}

export function DashboardClient({ initialData }: { initialData: Feedback[] }) {
  const [dataList, setDataList] = React.useState<Feedback[]>(() => {
    if (typeof window === "undefined") return initialData
    try {
      const saved = localStorage.getItem("ratebridge_deleted_ids")
      if (saved) {
        const deletedIds: string[] = JSON.parse(saved)
        if (Array.isArray(deletedIds) && deletedIds.length > 0) {
          return initialData.filter((item) => !deletedIds.includes(item.id))
        }
      }
    } catch (e) {}
    return initialData
  })
  const [filter, setFilter] = React.useState<"all" | "positive" | "negative">("all")

  // Update dataList when initialData changes & filter out locally deleted IDs
  React.useEffect(() => {
    let filtered = initialData
    try {
      const saved = localStorage.getItem("ratebridge_deleted_ids")
      if (saved) {
        const deletedIds: string[] = JSON.parse(saved)
        if (Array.isArray(deletedIds) && deletedIds.length > 0) {
          filtered = initialData.filter((item) => !deletedIds.includes(item.id))
        }
      }
    } catch (e) {
      console.error("Error reading deleted ids:", e)
    }
    setDataList(filtered)
  }, [initialData])

  // Follow-Up Status Checklist State
  const [followedUpSet, setFollowedUpSet] = React.useState<Set<string>>(new Set())

  // Modal State for AI Follow-Up
  const [selectedFeedback, setSelectedFeedback] = React.useState<Feedback | null>(null)
  const [generatedMessage, setGeneratedMessage] = React.useState<string>("")
  const [editedContact, setEditedContact] = React.useState<string>("")
  const [isGenerating, setIsGenerating] = React.useState<boolean>(false)
  const [isCopied, setIsCopied] = React.useState<boolean>(false)

  // Delete State
  const [deleteTarget, setDeleteTarget] = React.useState<Feedback | null>(null)
  const [isDeleting, setIsDeleting] = React.useState<boolean>(false)

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [showBulkDeleteModal, setShowBulkDeleteModal] = React.useState<boolean>(false)

  // Owner Insights State
  const [insights, setInsights] = React.useState<OwnerInsightsData | null>(null)
  const [isAnalyzingInsights, setIsAnalyzingInsights] = React.useState<boolean>(false)
  const [insightError, setInsightError] = React.useState<string | null>(null)

  // Derived metrics from dataList
  const totalRespondents = dataList.length

  const calculateAvg = (key: keyof Feedback) => {
    if (dataList.length === 0) return "0.0"
    const sum = dataList.reduce((acc, curr) => {
      const val = typeof curr[key] === "number" && (curr[key] as number) > 0 ? (curr[key] as number) : curr.rating
      return acc + val
    }, 0)
    return (sum / dataList.length).toFixed(1)
  }

  const averageRating =
    totalRespondents > 0
      ? (dataList.reduce((acc, curr) => acc + curr.rating, 0) / totalRespondents).toFixed(1)
      : "0.0"

  const avgKebersihan = calculateAvg("kebersihan")
  const avgRasa = calculateAvg("rasa")
  const avgPelayanan = calculateAvg("pelayanan")

  const totalComplaints = dataList.filter((f) => f.rating <= 3).length

  const displayData = React.useMemo(() => {
    if (filter === "positive") return dataList.filter((d) => d.rating >= 4)
    if (filter === "negative") return dataList.filter((d) => d.rating <= 3)
    return dataList
  }, [dataList, filter])

  const toggleSelectAll = React.useCallback(() => {
    if (selectedIds.size === displayData.length && displayData.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(displayData.map((d) => d.id)))
    }
  }, [displayData, selectedIds.size])

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setIsDeleting(true)
    const idsToDelete = Array.from(selectedIds)

    try {
      const saved = localStorage.getItem("ratebridge_deleted_ids")
      const deletedIds: string[] = saved ? JSON.parse(saved) : []
      idsToDelete.forEach((id) => {
        if (!deletedIds.includes(id)) deletedIds.push(id)
      })
      localStorage.setItem("ratebridge_deleted_ids", JSON.stringify(deletedIds))
    } catch (e) {
      console.error("Error saving deleted ids:", e)
    }

    // Persist deleted IDs in server cookies + localStorage
    deleteFeedbackAction(idsToDelete).catch((err) => console.error("Error bulk delete server action:", err))

    setDataList((prev) => prev.filter((item) => !selectedIds.has(item.id)))
    setSelectedIds(new Set())
    setShowBulkDeleteModal(false)
    setIsDeleting(false)
  }

  const monthlyStats = React.useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"]
    const counts = new Array(12).fill(0)
    const currentYear = new Date().getFullYear()
    dataList.forEach((item) => {
      const dateObj = new Date(item.created_at)
      if (!isNaN(dateObj.getTime()) && dateObj.getFullYear() === currentYear) {
        const monthIndex = dateObj.getMonth()
        if (monthIndex >= 0 && monthIndex < 12) {
          counts[monthIndex]++
        }
      }
    })
    return months.map((name, i) => ({ name, count: counts[i] }))
  }, [dataList])

  // Generate local fallback insights (no AI needed)
  const generateLocalInsights = React.useCallback((): OwnerInsightsData => {
    const getAvg = (key: keyof Feedback) => {
      if (dataList.length === 0) return 0
      const sum = dataList.reduce((acc, curr) => {
        const val = typeof curr[key] === "number" && (curr[key] as number) > 0 ? (curr[key] as number) : curr.rating
        return acc + val
      }, 0)
      return sum / dataList.length
    }
    const avgK = getAvg("kebersihan")
    const avgR = getAvg("rasa")
    const avgP = getAvg("pelayanan")
    const metrics = [
      { name: "Kebersihan & Tempat", val: avgK },
      { name: "Hasil Potongan Rambut", val: avgR },
      { name: "Pelayanan Barber", val: avgP },
    ]
    const worst = metrics.reduce((a, b) => (a.val <= b.val ? a : b))
    return {
      worstMetric: worst.name,
      summary: `Berdasarkan ${dataList.length} ulasan, indikator "${worst.name}" memiliki skor terendah (${worst.val.toFixed(1)}/5). Perlu perhatian khusus dari tim untuk meningkatkan area ini.`,
      recommendations: [
        "Lakukan briefing rutin sebelum shift mengenai ketelitian cukur & kenyamanan.",
        "Pastikan peralatan cukur dan handuk selalu bersih serta disterilkan.",
        "Tanyakan konfirmasi style rambut kepada pelanggan di tengah proses cukur.",
      ],
    }
  }, [dataList])

  // Load Owner AI Insights
  // Auto-initialize local insights so dashboard is instant on mount
  React.useEffect(() => {
    if (dataList.length > 0 && !insights && !isAnalyzingInsights) {
      setInsights(generateLocalInsights())
    }
  }, [dataList, insights, isAnalyzingInsights, generateLocalInsights])

  const handleFetchInsights = React.useCallback(async () => {
    if (isAnalyzingInsights) return // Prevent double-click
    if (dataList.length === 0) {
      setInsights(null)
      return
    }
    setIsAnalyzingInsights(true)
    setInsights(null)
    setInsightError(null)
    try {
      const res = await generateOwnerInsights(dataList)
      if (res.success && res.insights) {
        setInsights(res.insights)
        setInsightError(null)
      } else {
        // API gagal — pakai fallback lokal
        console.warn("AI gagal, pakai fallback lokal:", res.error)
        setInsights(generateLocalInsights())
        setInsightError("AI tidak tersedia, menampilkan analisis lokal.")
      }
    } catch (err) {
      console.error("Gagal memuat rekomendasi owner:", err)
      // Fallback lokal saat exception
      setInsights(generateLocalInsights())
      setInsightError("Koneksi AI gagal, menampilkan analisis lokal.")
    } finally {
      setIsAnalyzingInsights(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataList, generateLocalInsights])

  const toggleFollowUp = (id: string) => {
    setFollowedUpSet((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const markAsFollowedUp = (id: string) => {
    setFollowedUpSet((prev) => new Set(prev).add(id))
  }

  const handleExport = () => {
    const headers = [
      "ID",
      "Tanggal",
      "Rating",
      "Kebersihan",
      "Hasil Potongan",
      "Pelayanan Barber",
      "Kontak",
      "Komentar",
      "Status Follow Up",
    ]
    const csvContent = [
      headers.join(","),
      ...dataList.map((d) =>
        [
          d.id,
          new Date(d.created_at).toLocaleString("id-ID"),
          d.rating,
          d.kebersihan || 0,
          d.rasa || 0,
          d.pelayanan || 0,
          d.customer_contact || "Anonim",
          `"${(d.comment || "").replace(/"/g, '""')}"`,
          followedUpSet.has(d.id) ? "Sudah Follow-Up" : "Belum Follow-Up",
        ].join(",")
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `Laporan_Manov_Barbershop_${new Date().toLocaleDateString()}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Delete Action — save deleted ID to localStorage + call Supabase so refresh never shows deleted item
  const handleDeleteFeedback = async () => {
    if (!deleteTarget) return
    const idToDelete = deleteTarget.id
    setIsDeleting(true)

    // Save ID to localStorage immediately
    try {
      const saved = localStorage.getItem("ratebridge_deleted_ids")
      const deletedIds: string[] = saved ? JSON.parse(saved) : []
      if (!deletedIds.includes(idToDelete)) {
        deletedIds.push(idToDelete)
        localStorage.setItem("ratebridge_deleted_ids", JSON.stringify(deletedIds))
      }
    } catch (e) {
      console.error("Error saving deleted id:", e)
    }

    // Attempt deletion & save in server cookie
    try {
      await deleteFeedbackAction(idToDelete)
    } catch (err) {
      console.error("Error delete server action:", err)
    }

    // Remove from UI state & close modal
    setDataList((prev) => prev.filter((item) => item.id !== idToDelete))
    setDeleteTarget(null)
    setIsDeleting(false)
  }

  // Handle AI Message Generation
  const handleOpenFollowUpModal = async (feedback: Feedback) => {
    setSelectedFeedback(feedback)
    setEditedContact(feedback.customer_contact || "")
    setGeneratedMessage("")
    setIsGenerating(true)
    setIsCopied(false)

    try {
      const result = await generateFollowUpChat({
        rating: feedback.rating,
        kebersihan: feedback.kebersihan,
        rasa: feedback.rasa,
        pelayanan: feedback.pelayanan,
        comment: feedback.comment,
        customer_contact: feedback.customer_contact,
      })

      if (result.success && result.text) {
        setGeneratedMessage(result.text)
      } else {
        setGeneratedMessage(
          `Halo Kak, terima kasih sudah berkunjung ke Manov Barbershop. Mohon maaf atas ketidaknyamanan terkait pelayanan kami. Masukan dari Kakak sangat berharga untuk evaluasi tim kami. Terima kasih banyak 🙏`
        )
      }
    } catch (error) {
      console.error("Gagal generate pesan AI:", error)
      setGeneratedMessage(
        `Halo Kak, terima kasih sudah berkunjung ke Manov Barbershop. Mohon maaf jika ada hal yang kurang memuaskan saat berkunjung. Kami sangat menghargai saran & masukan dari Kakak.`
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerate = async () => {
    if (!selectedFeedback) return
    setIsGenerating(true)
    try {
      const result = await generateFollowUpChat({
        rating: selectedFeedback.rating,
        kebersihan: selectedFeedback.kebersihan,
        rasa: selectedFeedback.rasa,
        pelayanan: selectedFeedback.pelayanan,
        comment: selectedFeedback.comment,
        customer_contact: editedContact || selectedFeedback.customer_contact,
      })

      if (result.success && result.text) {
        setGeneratedMessage(result.text)
      }
    } catch (error) {
      console.error("Gagal regenerate:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyText = () => {
    if (!generatedMessage) return
    navigator.clipboard.writeText(generatedMessage)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  // Format WhatsApp Link
  const formatWaNumber = (phoneStr: string) => {
    if (!phoneStr) return ""
    const digits = phoneStr.replace(/\D/g, "")
    if (!digits) return ""
    if (digits.startsWith("0")) return "62" + digits.slice(1)
    if (digits.startsWith("8")) return "62" + digits
    return digits
  }

  const cleanWaNumber = formatWaNumber(editedContact)
  const waUrl = cleanWaNumber
    ? `https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(generatedMessage)}`
    : null

  return (
    <div className="space-y-8">
      {/* Executive AI Insights Card for Owner */}
      <PremiumCard className="p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-emerald-950 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-700/60 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span>Saran AI (Untuk Owner)</span>
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </h2>
              <p className="text-xs text-gray-400">
                Analisis otomatis terhadap indikator paling terendah &amp; saran perbaikan konkrit.
              </p>
            </div>
          </div>
          <button
            onClick={handleFetchInsights}
            disabled={isAnalyzingInsights}
            className="flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto border border-emerald-500/30"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingInsights ? "animate-spin" : ""}`} />
            <span>{isAnalyzingInsights ? "Menganalisis..." : "Analisis Ulang"}</span>
          </button>
        </div>

        {isAnalyzingInsights ? (
          <div className="py-8 flex flex-col items-center justify-center text-gray-400 space-y-2 text-sm">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            <span>Menganalisis keseluruhan ulasan &amp; mencari indikator terendah...</span>
          </div>
        ) : insights ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Area Kritis Utama:
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold">
                <AlertOctagon className="w-3.5 h-3.5" />
                {insights.worstMetric}
              </span>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed bg-black/20 p-3.5 rounded-2xl border border-white/5">
              {insights.summary}
            </p>

            <div className="space-y-2 pt-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 block">
                💡 Langkah Perbaikan Konkrit untuk Owner:
              </span>
              <ul className="grid sm:grid-cols-3 gap-3">
                {insights.recommendations.map((rec, i) => (
                  <li
                    key={i}
                    className="bg-white/5 p-3 rounded-xl border border-white/10 text-xs text-gray-200 flex items-start gap-2"
                  >
                    <span className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
            {insightError && (
              <p className="text-[11px] text-amber-400/80 italic bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                ⚠️ {insightError}
              </p>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-400 italic py-2">
            Klik &quot;Analisis Ulang&quot; untuk mengaktifkan AI ringkasan perbaikan bagi owner.
          </div>
        )}
      </PremiumCard>

      {/* Metric Row 1 */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard title="Avg Kebersihan" value={avgKebersihan} icon={<div>🧹</div>} bg="bg-emerald-50" />
        <MetricCard title="Avg Hasil Potongan" value={avgRasa} icon={<div>✂️</div>} bg="bg-emerald-50" />
        <MetricCard title="Avg Pelayanan Barber" value={avgPelayanan} icon={<div>👤</div>} bg="bg-emerald-50" />
      </div>

      {/* Metric Row 2 */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Total Responden"
          value={totalRespondents}
          icon={<Users className="w-5 h-5 text-blue-600" />}
          bg="bg-blue-100"
        />
        <MetricCard
          title="Rata-rata Rating"
          value={averageRating}
          icon={<Star className="w-5 h-5 text-yellow-600 fill-yellow-600" />}
          bg="bg-yellow-100"
        />
        <MetricCard
          title="Total Komplain"
          value={totalComplaints}
          icon={<AlertCircle className="w-5 h-5 text-red-600" />}
          bg="bg-red-100"
        />
      </div>

      {/* Chart Section */}
      <PremiumCard className="p-6">
        <div className="flex items-center gap-2 mb-6 text-gray-900">
          <Calendar className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-bold">Statistik Responden Bulanan</h2>
        </div>
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 h-44 items-end pt-4">
          {monthlyStats.map((stat, i) => {
            const max = Math.max(...monthlyStats.map((s) => s.count)) || 1
            const hasData = stat.count > 0
            const height = hasData ? Math.max((stat.count / max) * 100, 15) : 0

            return (
              <div key={i} className="flex flex-col items-center gap-1.5 group h-full justify-end">
                <div className="relative w-full flex flex-col justify-end items-center h-full">
                  {hasData && (
                    <span className="text-[11px] font-bold text-emerald-600 mb-1 animate-in fade-in">
                      {stat.count}
                    </span>
                  )}
                  <div
                    title={`${stat.name}: ${stat.count} Responden`}
                    style={{ height: `${height}%` }}
                    className={`w-full max-w-[28px] rounded-t-lg transition-all ${
                      hasData
                        ? "bg-emerald-500 group-hover:bg-emerald-600 shadow-xs"
                        : "bg-transparent border-b border-gray-200"
                    }`}
                  />
                </div>
                <span className={`text-[10px] uppercase ${hasData ? "text-gray-900 font-bold" : "text-gray-300 font-medium"}`}>
                  {stat.name}
                </span>
              </div>
            )
          })}
        </div>
      </PremiumCard>

      {/* Table Section */}
      <PremiumCard className="p-0 sm:p-0 overflow-hidden shadow-lg border-gray-100">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">Riwayat Penilaian</h2>
            {selectedIds.size > 0 && (
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-lg">
                {selectedIds.size} terpilih
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {selectedIds.size > 0 && (
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md cursor-pointer animate-in fade-in"
              >
                <Trash2 className="w-4 h-4" /> Hapus Terpilih ({selectedIds.size})
              </button>
            )}
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all shadow-md cursor-pointer"
            >
              <FileDown className="w-4 h-4" /> Export Excel
            </button>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
                Semua
              </FilterButton>
              <FilterButton active={filter === "positive"} onClick={() => setFilter("positive")}>
                Positif
              </FilterButton>
              <FilterButton active={filter === "negative"} onClick={() => setFilter("negative")}>
                Komplain
              </FilterButton>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
                <th className="font-medium p-4 text-center w-12">
                  <input
                    type="checkbox"
                    checked={displayData.length > 0 && selectedIds.size === displayData.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded-md border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    title="Pilih semua"
                  />
                </th>
                <th className="font-medium p-4">Status Follow-Up</th>
                <th className="font-medium p-4">Tanggal</th>
                <th className="font-medium p-4">Rating</th>
                <th className="font-medium p-4">Detail (K/R/P)</th>
                <th className="font-medium p-4">Kontak</th>
                <th className="font-medium p-4">Pesan Masukan</th>
                <th className="font-medium p-4 text-center">Aksi Follow-Up</th>
                <th className="font-medium p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {displayData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-sm text-gray-400 italic">
                    Belum ada data penilaian.
                  </td>
                </tr>
              ) : (
                displayData.map((row) => {
                  const isComplaint = row.rating <= 3
                  const isDone = followedUpSet.has(row.id)
                  return (
                    <tr key={row.id} className={`hover:bg-gray-50/50 transition-colors ${selectedIds.has(row.id) ? "bg-emerald-50/30" : ""}`}>
                      {/* Checkbox Selection Column */}
                      <td className="p-4 text-center whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={() => toggleSelectRow(row.id)}
                          className="w-4 h-4 rounded-md border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                      {/* Status Checklist Column */}
                      <td className="p-4 whitespace-nowrap">
                        {isComplaint ? (
                          <button
                            onClick={() => toggleFollowUp(row.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isDone
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs"
                                : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                            }`}
                            title="Klik untuk mengubah status follow-up"
                          >
                            {isDone ? (
                              <>
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                                <span>Sudah Follow-Up</span>
                              </>
                            ) : (
                              <>
                                <Square className="w-4 h-4 text-amber-500" />
                                <span>Belum Follow-Up</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                            <Check className="w-3.5 h-3.5" /> Selesai (5⭐)
                          </span>
                        )}
                      </td>

                      <td className="p-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(row.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < row.rating
                                  ? "text-emerald-500 fill-emerald-500"
                                  : "text-gray-200 fill-gray-100"
                              }`}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-3 text-xs font-medium">
                          <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md">
                            🧹 {row.kebersihan || row.rating}
                          </span>
                          <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md">
                            ✂️ {row.rasa || row.rating}
                          </span>
                          <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md">
                            👤 {row.pelayanan || row.rating}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-sm font-medium text-gray-900">
                        {row.customer_contact ? (
                          <span className="text-gray-900">{row.customer_contact}</span>
                        ) : (
                          <span className="text-gray-400 font-normal italic">Anonim</span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-gray-700 min-w-[240px]">
                        {row.comment ? row.comment : <span className="text-gray-400 italic">Tidak ada pesan</span>}
                      </td>
                      <td className="p-4 whitespace-nowrap text-center">
                        {isComplaint ? (
                          <button
                            onClick={() => handleOpenFollowUpModal(row)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Follow Up WA (AI)</span>
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Google Maps</span>
                        )}
                      </td>
                      {/* Delete Column */}
                      <td className="p-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => setDeleteTarget(row)}
                          title="Hapus Penilaian"
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </PremiumCard>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Hapus Penilaian Ini?</h3>
              <p className="text-xs text-gray-500 mt-1">
                Data penilaian ini akan dihapus secara permanen dari database.
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-left text-xs space-y-1">
              <p><span className="font-semibold text-gray-700">Rating:</span> {deleteTarget.rating}/5 ⭐</p>
              <p><span className="font-semibold text-gray-700">Kontak:</span> {deleteTarget.customer_contact || "Anonim"}</p>
              {deleteTarget.comment && (
                <p className="italic text-gray-600 mt-1 border-t border-gray-200 pt-1">&quot;{deleteTarget.comment}&quot;</p>
              )}
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="w-1/2 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteFeedback}
                disabled={isDeleting}
                className="w-1/2 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Hapus {selectedIds.size} Penilaian Terpilih?</h3>
              <p className="text-xs text-gray-500 mt-1">
                {selectedIds.size} data penilaian yang Anda pilih akan dihapus secara permanen dari sistem.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Hapus Semua Terpilih"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog for WA Follow-Up */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 space-y-6 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Follow-Up WhatsApp (Saran AI)</h3>
                  <p className="text-xs text-gray-500">
                    Draf pesan permohonan maaf &amp; masukan perbaikan untuk pelanggan.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Context Summary Card */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2 text-xs">
              <div className="flex items-center justify-between text-gray-700">
                <span className="font-semibold flex items-center gap-1">
                  Rating Pelanggan: {selectedFeedback.rating}/5 ⭐
                </span>
                <span className="text-gray-400">
                  {new Date(selectedFeedback.created_at).toLocaleDateString("id-ID")}
                </span>
              </div>
              <div className="flex items-center gap-3 text-gray-600 font-medium">
                <span>🧹 Kebersihan: {selectedFeedback.kebersihan || 0}/5</span>
                <span>✂️ Hasil Potongan: {selectedFeedback.rasa || 0}/5</span>
                <span>👤 Pelayanan: {selectedFeedback.pelayanan || 0}/5</span>
              </div>
              {selectedFeedback.comment && (
                <div className="text-gray-600 italic bg-white p-2.5 rounded-xl border border-gray-100">
                  &quot;{selectedFeedback.comment}&quot;
                </div>
              )}
            </div>

            {/* Editable Contact Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Nomor WhatsApp Pelanggan
              </label>
              <div className="relative flex items-center">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3.5" />
                <input
                  type="text"
                  placeholder="Contoh: 081234567890"
                  value={editedContact}
                  onChange={(e) => setEditedContact(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-medium"
                />
              </div>
              {cleanWaNumber ? (
                <p className="text-[11px] text-emerald-600 font-medium ml-1">
                  Format WhatsApp Terdeteksi: +{cleanWaNumber}
                </p>
              ) : (
                <p className="text-[11px] text-amber-600 italic ml-1">
                  Nomor WhatsApp belum terisi. Masukkan nomor di atas untuk langsung membuka link wa.me.
                </p>
              )}
            </div>

            {/* Generated AI Message Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  Draf Pesan WhatsApp
                </label>
                <button
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                  className="text-xs text-emerald-600 font-semibold hover:text-emerald-700 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isGenerating ? "animate-spin" : ""}`} />
                  <span>Buat Ulang (Regenerate)</span>
                </button>
              </div>

              {isGenerating ? (
                <div className="w-full h-36 bg-gray-50 border border-gray-200 rounded-2xl flex flex-col items-center justify-center text-sm text-gray-500 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  <span>Meracik pesan permohonan maaf &amp; masukan saran via AI...</span>
                </div>
              ) : (
                <textarea
                  rows={6}
                  value={generatedMessage}
                  onChange={(e) => setGeneratedMessage(e.target.value)}
                  className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all leading-relaxed"
                  placeholder="Isi pesan dari Saran AI akan muncul di sini..."
                />
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={handleCopyText}
                disabled={!generatedMessage || isGenerating}
                className="w-full sm:w-auto px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
                <span>{isCopied ? "Tersalin!" : "Salin Pesan"}</span>
              </button>

              {waUrl ? (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => markAsFollowedUp(selectedFeedback.id)}
                  className="w-full sm:flex-1 py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 transition-all text-center"
                >
                  <Send className="w-4 h-4" />
                  <span>Buka WhatsApp &amp; Tandai Selesai</span>
                </a>
              ) : (
                <button
                  disabled
                  className="w-full sm:flex-1 py-2.5 px-5 bg-gray-200 text-gray-400 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  <span>Isi Nomor WA untuk Kirim</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ title, value, icon, bg }: { title: string; value: string | number; icon: React.ReactNode; bg: string }) {
  return (
    <PremiumCard className="p-6">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${bg}`}>{icon}</div>
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </PremiumCard>
  )
}

function FilterButton({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
        active ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  )
}
