"use client"

import * as React from "react"
import { Users, Star, AlertCircle, FileDown, Calendar } from "lucide-react"

import { PremiumCard } from "@/components/ui/PremiumCard"

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

export function DashboardClient({ initialData }: { initialData: Feedback[] }) {
  const [filter, setFilter] = React.useState<"all" | "positive" | "negative">("all")

  // Derived metrics
  const totalRespondents = initialData.length
  
  const calculateAvg = (key: keyof Feedback) => {
    const validData = initialData.filter(d => typeof d[key] === 'number' && (d[key] as number) > 0)
    if (validData.length === 0) return "0.0"
    return (validData.reduce((acc, curr) => acc + (curr[key] as number), 0) / validData.length).toFixed(1)
  }

  const averageRating = totalRespondents > 0
    ? (initialData.reduce((acc, curr) => acc + curr.rating, 0) / totalRespondents).toFixed(1)
    : "0.0"
    
  const avgKebersihan = calculateAvg('kebersihan')
  const avgRasa = calculateAvg('rasa')
  const avgPelayanan = calculateAvg('pelayanan')

  const totalComplaints = initialData.filter((f) => f.rating <= 3).length

  const displayData = React.useMemo(() => {
    if (filter === "positive") return initialData.filter(d => d.rating >= 4)
    if (filter === "negative") return initialData.filter(d => d.rating <= 3)
    return initialData
  }, [initialData, filter])

  const monthlyStats = React.useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    const counts = new Array(12).fill(0);
    initialData.forEach(item => {
      const monthIndex = new Date(item.created_at).getMonth();
      counts[monthIndex]++;
    });
    return months.map((name, i) => ({ name, count: counts[i] }));
  }, [initialData]);

  const handleExport = () => {
    const headers = ["ID", "Tanggal", "Rating", "Kebersihan", "Rasa", "Pelayanan", "Kontak", "Komentar"];
    const csvContent = [
      headers.join(","),
      ...initialData.map(d => [
        d.id,
        new Date(d.created_at).toLocaleString('id-ID'),
        d.rating,
        d.kebersihan || 0,
        d.rasa || 0,
        d.pelayanan || 0,
        d.customer_contact || "Anonim",
        `"${(d.comment || "").replace(/"/g, '""')}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_RateBridge_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard title="Avg Kebersihan" value={avgKebersihan} icon={<div>🧹</div>} bg="bg-emerald-50" />
        <MetricCard title="Avg Rasa" value={avgRasa} icon={<div>🍽️</div>} bg="bg-emerald-50" />
        <MetricCard title="Avg Pelayanan" value={avgPelayanan} icon={<div>👤</div>} bg="bg-emerald-50" />
      </div>
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard title="Total Responden" value={totalRespondents} icon={<Users className="w-5 h-5 text-blue-600" />} bg="bg-blue-100" />
        <MetricCard title="Rata-rata Rating" value={averageRating} icon={<Star className="w-5 h-5 text-yellow-600 fill-yellow-600" />} bg="bg-yellow-100" />
        <MetricCard title="Total Komplain" value={totalComplaints} icon={<AlertCircle className="w-5 h-5 text-red-600" />} bg="bg-red-100" />
      </div>

      <PremiumCard className="p-6">
        <div className="flex items-center gap-2 mb-6 text-gray-900">
          <Calendar className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-bold">Statistik Responden Bulanan</h2>
        </div>
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 h-40 items-end">
          {monthlyStats.map((stat, i) => {
            const max = Math.max(...monthlyStats.map(s => s.count)) || 1;
            const height = (stat.count / max) * 100;
            return (
              <div key={i} className="flex flex-col items-center gap-2 group h-full justify-end">
                <div className="relative w-full flex justify-center items-end h-full">
                  <div title={`${stat.count} Responden`} style={{ height: `${height}%` }} className="w-full max-w-[24px] bg-emerald-500 rounded-t-lg transition-all group-hover:bg-emerald-600 min-h-[4px]" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">{stat.name}</span>
              </div>
            );
          })}
        </div>
      </PremiumCard>

      <PremiumCard className="p-0 sm:p-0 overflow-hidden shadow-lg border-gray-100">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-gray-900">Riwayat Penilaian</h2>
          <div className="flex items-center gap-3">
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all shadow-md">
              <FileDown className="w-4 h-4" /> Export Excel
            </button>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>Semua</FilterButton>
              <FilterButton active={filter === "positive"} onClick={() => setFilter("positive")}>Positif</FilterButton>
              <FilterButton active={filter === "negative"} onClick={() => setFilter("negative")}>Komplain</FilterButton>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm string text-gray-500">
                <th className="font-medium p-4">Tanggal</th>
                <th className="font-medium p-4">Rating</th>
                <th className="font-medium p-4">Detail (K/R/P)</th>
                <th className="font-medium p-4">Kontak</th>
                <th className="font-medium p-4">Pesan Masukan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {displayData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(row.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < row.rating ? 'text-emerald-500 fill-emerald-500' : 'text-gray-200 fill-gray-100'}`} />
                      ))}
                    </div>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <div className="flex items-center gap-3 text-xs font-medium">
                      <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md">🧹 {row.kebersihan || 0}</span>
                      <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md">🍽️ {row.rasa || 0}</span>
                      <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md">👤 {row.pelayanan || 0}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm font-medium text-gray-900">
                    {row.customer_contact || <span className="text-gray-400 font-normal italic">Anonim</span>}
                  </td>
                  <td className="p-4 text-sm text-gray-700 min-w-[300px]">
                    {row.comment ? row.comment : <span className="text-gray-400 italic">Tidak ada pesan</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PremiumCard>
    </div>
  )
}

function MetricCard({ title, value, icon, bg }: { title: string, value: string | number, icon: React.ReactNode, bg: string }) {
  return (
    <PremiumCard className="p-6">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${bg}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </PremiumCard>
  )
}

function FilterButton({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${active ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
      {children}
    </button>
  )
}
