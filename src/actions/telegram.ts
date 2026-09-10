"use server"

export async function sendTelegramNotification(payload: {
  rating: number;
  kebersihan: number;
  rasa: number;
  pelayanan: number;
  comment: string;
  customer_contact?: string;
}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error("Telegram configuration missing!");
    return { success: false, error: "Konfigurasi Telegram belum lengkap." };
  }

  const currentTime = new Date().toLocaleTimeString('id-ID', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });

  const contactValue = payload.customer_contact || "Anonim (Tidak bersedia dihubungi)";
  let waLink = "";
  
  if (payload.customer_contact && /\d/.test(payload.customer_contact)) {
    const cleanNum = payload.customer_contact.replace(/\D/g, '')
    const finalNum = cleanNum.startsWith('0') ? '62' + cleanNum.slice(1) : cleanNum
    waLink = `\n\n🟢 <a href="https://wa.me/${finalNum}?text=Halo, kami dari manajemen Manov Barbershop. Kami menerima masukan Anda...">Hubungi Pelanggan via WA</a>`
  }

  const message = `
🚨 <b>KOMPLAIN BARU: Manov Barbershop</b>
⭐ <b>Rating Total: ${payload.rating}/5</b>

📊 <b>Detail Penilaian:</b>
🧹 Kebersihan: ${payload.kebersihan}/5
✂️ Hasil Potongan: ${payload.rasa}/5
👤 Pelayanan Barber: ${payload.pelayanan}/5

💬 <b>Catatan:</b>
<i>"${payload.comment || 'Tidak ada catatan'}"</i>

📱 <b>Kontak:</b> ${contactValue}${waLink}

🕒 <b>Jam Kirim:</b> ${currentTime} WIB
📅 <i>Dikirim secara anonim untuk Manov Barbershop</i>
  `.trim()

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout max

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const result = await response.json();
    if (!result.ok) {
      throw new Error(result.description);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Telegram API Error:", error);
    return { success: false, error: error.message };
  }
}
