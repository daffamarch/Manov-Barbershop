import { supabase } from "@/lib/supabase"
import { DashboardClient } from "./DashboardClient"
import { AlertTriangle } from "lucide-react"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

const SAMPLE_DEMO_FEEDBACKS = [
  {
    id: "demo-1",
    rating: 1,
    kebersihan: 2,
    rasa: 1,
    pelayanan: 1,
    comment: "Kebersihan tempat kurang dijaga, dan barbershop terasa kurang rapi pas dipanggil.",
    customer_contact: "081234567890",
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-2",
    rating: 2,
    kebersihan: 3,
    rasa: 2,
    pelayanan: 2,
    comment: "Antrean cukup lama hampir 40 menit, dan hasil cukur bagian samping agak kurang simetris.",
    customer_contact: "085712345678",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "demo-3",
    rating: 3,
    kebersihan: 4,
    rasa: 3,
    pelayanan: 3,
    comment: "Hasil cukur tergolong standar, namun suasana barbershop dan kebersihannya lumayan bagus.",
    customer_contact: "089612345678",
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: "demo-4",
    rating: 5,
    kebersihan: 5,
    rasa: 5,
    pelayanan: 5,
    comment: "Sangat puas! Cukuran sangat rapi dan pelayanan barber sangat ramah.",
    customer_contact: "081987654321",
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
]

export default async function AdminDashboardPage() {
  let data = null
  let isOffline = false
  let errorMessage = ""

  try {
    const res = await supabase
      .from("feedbacks")
      .select("*")
      .order("created_at", { ascending: false })

    if (res.error) {
      isOffline = true
      errorMessage = res.error.message
    } else {
      data = res.data
    }
  } catch (err: any) {
    isOffline = true
    errorMessage = err?.message || "TypeError: fetch failed"
  }

  // Filter out deleted IDs stored in server cookies so deleted items never return on refresh or relog
  const cookieStore = await cookies()
  const deletedCookie = cookieStore.get("ratebridge_deleted_ids")?.value
  let deletedIds: string[] = []
  if (deletedCookie) {
    try {
      deletedIds = JSON.parse(deletedCookie)
    } catch (e) {
      deletedIds = []
    }
  }

  const rawList = data !== null ? data : SAMPLE_DEMO_FEEDBACKS
  const filteredData = Array.isArray(deletedIds) && deletedIds.length > 0
    ? rawList.filter((item: any) => !deletedIds.includes(item.id))
    : rawList

  return (
    <div className="w-full space-y-6">
      {isOffline && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-bold">Mode Demo Aktif (Project Supabase Sedang Non-aktif / Paused)</p>
            <p className="text-amber-800 text-xs">
              Project Supabase (<code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900">qlwcmkodpcgrwsybktsz</code>)
              kemungkinan sedang di-pause otomatis oleh Supabase karena inaktivitas (Error: <i>{errorMessage}</i>).
              Menampilkan data ulasan agar Anda tetap dapat menguji fitur <b>Follow-Up WhatsApp Saran AI</b> secara langsung di browser.
            </p>
            <p className="text-xs text-amber-700 font-medium pt-1">
              💡 Untuk mengaktifkan kembali database Supabase: Silakan masuk ke Dashboard Supabase Anda (supabase.com/dashboard) dan klik tombol <b>Restore / Unpause project</b>.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dasbor Manajemen</h1>
      </div>

      <DashboardClient initialData={filteredData} />
    </div>
  )
}
