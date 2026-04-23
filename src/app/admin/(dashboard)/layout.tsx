import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const session = cookieStore.get("admin_session")

  if (!session || session.value !== "authenticated") {
    redirect("/admin/login")
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center font-bold text-sm">
              RB
            </div>
            <span className="font-semibold text-gray-900">RateBridge Admin</span>
          </div>
          {/* A small logout button could go here if implemented on client */}
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
