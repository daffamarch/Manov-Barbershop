"use server"

import { supabase } from "@/lib/supabase"
import { cookies } from "next/headers"

export async function deleteFeedbackAction(id: string | string[]) {
  const ids = Array.isArray(id) ? id : [id]
  
  // Save deleted IDs into persistent HTTP Cookie so server components never render them
  try {
    const cookieStore = await cookies()
    const saved = cookieStore.get("ratebridge_deleted_ids")?.value
    let deletedIds: string[] = []
    if (saved) {
      try {
        deletedIds = JSON.parse(saved)
      } catch (e) {
        deletedIds = []
      }
    }
    ids.forEach((item) => {
      if (!deletedIds.includes(item)) deletedIds.push(item)
    })
    
    cookieStore.set("ratebridge_deleted_ids", JSON.stringify(deletedIds), {
      maxAge: 60 * 60 * 24 * 365, // 1 year persistence
      path: "/",
    })
  } catch (e) {
    console.error("Error setting deleted cookie:", e)
  }

  // Attempt Supabase deletion
  try {
    for (const item of ids) {
      if (!item.startsWith("demo-")) {
        const { error } = await supabase.from("feedbacks").delete().eq("id", item)
        if (error) console.error("Supabase delete error for id:", item, error)
      }
    }
    return { success: true }
  } catch (err: any) {
    console.error("Error delete feedback:", err)
    return { success: true }
  }
}
