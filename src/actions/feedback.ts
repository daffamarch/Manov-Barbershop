"use server"

import { supabase } from "@/lib/supabase"

export async function deleteFeedbackAction(id: string) {
  try {
    const { error } = await supabase
      .from("feedbacks")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Gagal menghapus feedback:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    console.error("Error delete feedback:", err)
    return { success: false, error: err?.message || "Terjadi kesalahan saat menghapus." }
  }
}
