import { supabase } from "@/lib/supabase"
import { DashboardClient } from "./DashboardClient"

export const dynamic = "force-dynamic"

export default async function AdminDashboardPage() {
  const { data, error } = await supabase
    .from("feedbacks")
    .select("*")
    .order("created_at", { ascending: false })

  console.log("--- DEBUG DASHBOARD ---")
  console.log("Data:", data)
  console.log("Error:", error)
  console.log("-----------------------")

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 font-medium">Gagal memuat data dari Supabase.</p>
        <p className="text-sm text-gray-500 mt-2">{error.message}</p>
        <p className="text-sm text-gray-500 mt-2">Pastikan URL dan API Key telah diatur di .env.local dan tabel feedbacks tersedia.</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Dasbor Manajemen
      </h1>
      <DashboardClient initialData={data || []} />
    </div>
  )
}
