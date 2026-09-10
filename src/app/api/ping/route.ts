import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { error } = await supabase.from("feedbacks").select("id").limit(1)

    if (error) {
      return NextResponse.json(
        { success: false, status: "error", error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      status: "online",
      message: "Supabase database pinged successfully to prevent auto-pause!",
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, status: "error", error: err?.message || "Ping failed" },
      { status: 500 }
    )
  }
}
