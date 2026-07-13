import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route for parsing baggage advertisement text
  app.post("/api/parse-baggage", async (req, res) => {
    try {
      const { text, currentDate } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "No text provided" });
      }

      const prompt = `
      Anda adalah asisten cerdas yang mengekstraksi data dari teks iklan penyedia jasa bagasi.
      Ekstrak informasi berikut dan kembalikan sebagai objek JSON murni:
      
      1. providerName: Nama penyedia bagasi (string, gunakan "Tidak Diketahui" jika tidak ada).
      2. policy: Kebijakan bagasi singkat, misal "Maks 30kg, cairan dilarang" (string).
      3. pricePerKg: Biaya per kg (string atau number, misalnya "Rp 150.000/kg" atau 150000).
      4. phoneNumbers: Array of strings. Temukan SEMUA nomor telepon/whatsapp di teks. Jika ada dua kontak whatsapp atau lebih pada iklan bagasi, maka cantumkan semuanya! Jangan pernah hanya mencantumkan satu saja jika ada lebih dari satu. Formatkan nomor sehingga HANYA berisi angka yang diawali kode negara (misal "628123456789", jangan gunakan +).
      5. addressCairo: Alamat lokasi drop bagasi atau kantor di Kairo, Mesir (string, gunakan "Tidak Diketahui" jika tidak ada).
      6. addressIndonesia: Alamat lokasi drop bagasi atau pengiriman di Indonesia (string, gunakan "Tidak Diketahui" jika tidak ada).
      7. schedules: Array of objects. Setiap object mewakili satu jadwal/rute, memiliki properti:
         - route: Rute spesifik untuk tanggal tersebut, misal "Jakarta - Kairo" atau "Kairo - Jakarta" (string, gunakan "Tidak Diketahui" jika tidak ada).
         - departureDate: Tanggal penerbangan untuk rute tersebut dalam format ISO 8601 (YYYY-MM-DD). Hari ini adalah ${currentDate}.
         Pastikan memisahkan jadwal berdasarkan rute (misal Jakarta-Kairo dan Kairo-Jakarta) beserta tanggalnya masing-masing. Jika rute tidak ada, gunakan rute umum atau "Tidak Diketahui".

      Teks Iklan:
      """
      ${text}
      """

      Hanya kembalikan JSON yang valid, tanpa markdown \`\`\`json. Pastikan formatnya sesuai schema di atas.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      });

      const jsonStr = response.text || "{}";
      const parsed = JSON.parse(jsonStr);
      
      res.json(parsed);
    } catch (error: any) {
      console.error("Error parsing baggage text:", error);
      
      const errorMessage = error?.message || "";
      const errorStr = typeof error === 'object' ? JSON.stringify(error) : "";
      
      let clientError = "Gagal memproses teks. Silakan coba lagi nanti.";
      
      if (
        errorMessage.includes("quota") || 
        errorMessage.includes("429") || 
        errorMessage.includes("RESOURCE_EXHAUSTED") ||
        errorStr.includes("quota") ||
        errorStr.includes("429") ||
        errorStr.includes("RESOURCE_EXHAUSTED")
      ) {
        clientError = "⚠️ Batas kuota AI tercapai. Silakan coba lagi beberapa detik lagi (atau gunakan API key sendiri jika tersedia).";
      } else if (
        errorMessage.includes("503") || 
        errorMessage.includes("high demand") ||
        errorStr.includes("503") ||
        errorStr.includes("high demand")
      ) {
        clientError = "⚠️ Layanan AI sedang sibuk (tingginya permintaan). Silakan coba lagi beberapa saat lagi.";
      } else if (errorMessage.includes("API key")) {
        clientError = "⚠️ API Key tidak valid atau tidak ditemukan. Hubungi administrator.";
      }
      
      res.status(500).json({ error: clientError });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
