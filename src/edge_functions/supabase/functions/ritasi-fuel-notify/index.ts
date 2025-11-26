import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

/**
 * Edge Function: ritasi-fuel-notify
 * Dijalankan otomatis oleh trigger PostgreSQL setelah insert ke tabel ritasi_fuel
 * Mengirim notifikasi Telegram dengan tombol inline
 */

// Definisikan tipe payload sesuai API Telegram
interface TelegramPayload {
  chat_id: string;
  photo: string;
  caption: string;
  parse_mode: string;
  message_thread_id?: number;
  reply_markup: {
    inline_keyboard: {
      text: string;
      callback_data: string;
    }[][];
  };
}

serve(async (req) => {
  try {
    // Ambil data record dari Supabase webhook
    const { record } = await req.json();

    // Ambil environment variables
    const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_TOKEN");
    const CHAT_ID = Deno.env.get("CHAT_ID");
    const THREAD_ID_RITASI = Deno.env.get("THREAD_ID_RITASI"); // opsional untuk forum topic/thread

    if (!TELEGRAM_TOKEN || !CHAT_ID) {
      console.error("Missing TELEGRAM_TOKEN or CHAT_ID in environment variables");
      return new Response("Server configuration error", { status: 500 });
    }

    // Buat caption yang rapi untuk pesan Telegram
    const caption = `
🗓️ *Tanggal:* ${record.ritation_date ?? "-"}
⏱️ *Shift:* ${record.shift ?? "-"}
🧾 *No SJ:* ${record.no_surat_jalan ?? "-"}
📦 *Qty SJ:* ${record.qty_sj ?? 0} L
🏭 *Warehouse:* ${record.warehouse_id ?? "-"}
    `.trim();

    // Siapkan payload dasar untuk Telegram API
    const payload: TelegramPayload = {
      chat_id: CHAT_ID,
      photo: record.photo_url || "https://via.placeholder.com/300x200?text=No+Photo",
      caption,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: record.isValidated ? "❌ Unvalidate" : "✅ Validate",
              callback_data: `toggle:${record.id}`,
            },
          ],
        ],
      },
    };

    // Tambahkan message_thread_id jika diset
    if (THREAD_ID_RITASI) {
      payload.message_thread_id = Number(THREAD_ID_RITASI);
    }

    // Kirim ke Telegram API
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`;
    const resp = await fetch(telegramUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // Tangani hasil dari Telegram API
    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Telegram API error:", errText);
      return new Response(`Failed to send to Telegram: ${errText}`, { status: 500 });
    }

    console.log("✅ Notification sent successfully for record:", record.id);
    return new Response("Notification sent ✅", { status: 200 });
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
    return new Response("Error processing webhook", { status: 400 });
  }
});