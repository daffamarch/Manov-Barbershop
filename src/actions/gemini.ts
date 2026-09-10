"use server"

export async function generateFollowUpChat(payload: {
  rating: number
  kebersihan?: number | null
  rasa?: number | null
  pelayanan?: number | null
  comment?: string | null
  customer_contact?: string | null
}) {
  const apiKey = process.env.GEMINI_API_KEY || ""

  if (!apiKey) {
    return {
      success: false,
      error: "API Key AI belum dikonfigurasi.",
    }
  }

  const kebersihanText = payload.kebersihan ? `${payload.kebersihan}/5` : "Tidak diisi"
  const rasaText = payload.rasa ? `${payload.rasa}/5` : "Tidak diisi"
  const pelayananText = payload.pelayanan ? `${payload.pelayanan}/5` : "Tidak diisi"
  const commentText = payload.comment ? payload.comment : "Tidak ada catatan spesifik"

  const prompt = `
Kamu adalah Pemilik Manov Barbershop. Buatkan pesan WhatsApp singkat, profesional, dan manusiawi untuk merespons ulasan pelanggan berikut.

Detail Ulasan Pelanggan:
- Rating Keseluruhan: ${payload.rating}/5
- Kebersihan & Tempat: ${kebersihanText}
- Hasil Potongan Rambut: ${rasaText}
- Pelayanan Barber: ${pelayananText}
- Catatan / Keluhan: "${commentText}"

PANDUAN PENULISAN PESAN (ANTI AI SLOP & PANGGILAN KAK):
1. Tulis pesan SINGKAT (maksimal 3-4 kalimat).
2. SELALU gunakan sapaan "Kak" (Contoh: "Halo Kak," atau "Terima kasih ya Kak,"). DILARANG KERAS menggunakan panggilan "Bro", "Sis", "Gan", atau "Bung".
3. Gunakan nada bicara manusiawi, ramah, profesional, seperti pemilik barbershop berkirim WA biasa.
4. DILARANG KERAS menggunakan kata-kata kaku / AI Slop seperti: "setulus hati", "senantiasa", "komitmen kami", "dedikasi", "pengalaman luar biasa", "senyuman Anda", "berbenah diri demi kebaikan", "sekali lagi mohon maaf".
5. Sampaikan terima kasih sudah berkunjung, minta maaf secara wajar atas poin keluhan yang spesifik (misal hasil cukur / kebersihan / pelayanan), lalu ajak berdiskusi santai jika ada masukan lebih lanjut.
6. DILARANG menawarkan voucher, promo, atau diskon.
7. Langsung hasilkan teks pesan WhatsApp tanpa tanda petik pembuka/penutup atau teks pengantar.
`.trim()

  const models = ["gemini-3.5-flash-lite", "gemini-3.5-flash"]

  for (const model of models) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s per model to allow AI completion
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
          signal: controller.signal,
        }
      )

      // Rate limited — tunggu sebentar lalu coba model berikutnya
      if (response.status === 429) {
        console.warn(`Model ${model} rate limited (429), trying next...`)
        await new Promise((r) => setTimeout(r, 500))
        continue
      }

      const data = await response.json()

      if (response.ok && data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        const generatedText = data.candidates[0].content.parts[0].text.trim()
        return { success: true, text: generatedText }
      }

      console.warn(`Model ${model} returned error:`, data)
    } catch (err: any) {
      if (err?.name === "AbortError") {
        console.warn(`Model ${model} timeout, trying next...`)
      } else {
        console.error(`Error calling Gemini API model ${model}:`, err)
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  return {
    success: false,
    error: "Gagal menghasilkan pesan otomatis dari AI. Silakan coba lagi.",
  }
}

export async function generateOwnerInsights(feedbacks: {
  rating: number
  kebersihan?: number | null
  rasa?: number | null
  pelayanan?: number | null
  comment?: string | null
}[]) {
  const apiKey = process.env.GEMINI_API_KEY || ""

  if (!apiKey || feedbacks.length === 0) {
    return {
      success: false,
      error: "Data ulasan tidak cukup untuk dianalisis.",
    }
  }

  // Calculate averages (fallback to overall rating if sub-metric is 0 or unassigned)
  const getAvg = (key: "kebersihan" | "rasa" | "pelayanan") => {
    if (feedbacks.length === 0) return 0
    const sum = feedbacks.reduce((acc, curr) => {
      const val = typeof curr[key] === "number" && (curr[key] as number) > 0 ? (curr[key] as number) : curr.rating
      return acc + val
    }, 0)
    return Number((sum / feedbacks.length).toFixed(1))
  }

  const avgKebersihan = getAvg("kebersihan")
  const avgHasilPotongan = getAvg("rasa")
  const avgPelayanan = getAvg("pelayanan")
  const totalRatingAvg = Number((feedbacks.reduce((acc, curr) => acc + curr.rating, 0) / feedbacks.length).toFixed(1))

  const commentsList = feedbacks
    .filter((f) => f.comment && f.comment.trim().length > 0)
    .slice(0, 3)
    .map((f) => `[Rating ${f.rating}/5] ${f.comment}`)
    .join("\n")

  const prompt = `
Kamu adalah Konsultan Bisnis Barbershop Eksekutif untuk "Manov Barbershop".
Analisis data kepuasan pelanggan berikut dan berikan evaluasi mendalam serta rekomendasi strategi perbaikan untuk Owner Manov Barbershop.

Data Rata-rata Kepuasan:
- Total Rata-rata Rating: ${totalRatingAvg}/5
- 🧹 Kebersihan & Tempat: ${avgKebersihan}/5
- ✂️ Hasil Potongan Rambut: ${avgHasilPotongan}/5
- 👤 Pelayanan Barber: ${avgPelayanan}/5

Daftar Komentar / Keluhan Pelanggan:
${commentsList || "Tidak ada komentar tertulis"}

Tugasmu:
Hasilkan analisis ringkas dan padat khusus untuk Owner Manov Barbershop dalam format JSON persis berikut:
{
  "worstMetric": "Tuliskan nama indikator dengan performa terburuk/paling rendah (misal: 'Hasil Potongan Rambut' atau 'Kebersihan & Tempat' atau 'Pelayanan Barber')",
  "summary": "Tuliskan 2 kalimat ringkasan tentang kondisi kepuasan pelanggan Manov Barbershop saat ini dan apa penyebab utama nilai terendah tersebut.",
  "recommendations": [
    "Saran perbaikan konkrit ke-1 yang harus dilakukan owner",
    "Saran perbaikan konkrit ke-2 yang harus dilakukan owner",
    "Saran perbaikan konkrit ke-3 yang harus dilakukan owner"
  ]
}

PENTING: HANYA kembalikan string JSON valid tanpa format markdown \`\`\`json atau teks tambahan apapun.
`.trim()

  const models = ["gemini-3.5-flash-lite", "gemini-3.5-flash"]

  for (const model of models) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s per model to allow AI completion
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
          signal: controller.signal,
        }
      )

      // Rate limited — tunggu sebentar lalu coba model berikutnya
      if (response.status === 429) {
        console.warn(`Model ${model} rate limited (429), trying next...`)
        await new Promise((r) => setTimeout(r, 500))
        continue
      }

      const data = await response.json()

      if (response.ok && data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        let rawText = data.candidates[0].content.parts[0].text.trim()
        rawText = rawText.replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/i, "").trim()
        
        try {
          const parsed = JSON.parse(rawText)
          return { success: true, insights: parsed }
        } catch (e) {
          // If JSON parse fails, return raw text in summary
          return {
            success: true,
            insights: {
              worstMetric: avgHasilPotongan < avgKebersihan && avgHasilPotongan < avgPelayanan ? "Hasil Potongan Rambut" : avgKebersihan < avgPelayanan ? "Kebersihan & Tempat" : "Pelayanan Barber",
              summary: rawText,
              recommendations: [
                "Lakukan briefing rutin sebelum shift mengenai ketelitian cukur & kenyamanan.",
                "Pastikan peralatan cukur dan handuk selalu bersih serta disterilkan.",
                "Tanyakan konfirmasi style rambut kepada pelanggan di tengah proses cukur."
              ]
            }
          }
        }
      }
      console.warn(`Model ${model} insight error:`, data)
    } catch (err: any) {
      if (err?.name === "AbortError") {
        console.warn(`Model ${model} timeout, trying next...`)
      } else {
        console.error(`Error generating owner insights with ${model}:`, err)
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  return {
    success: false,
    error: "Gagal membuat analisis AI.",
  }
}
