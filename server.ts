import 'dotenv/config';
import { createApp } from './server/app.js';

const app = createApp();

if (!process.env.ANIME_API_URL) {
  console.warn('[config] PERINGATAN: ANIME_API_URL belum di-set. Isi di file .env (lihat .env.example).');
}

// Lokal / VPS: jalankan server. Di Vercel, app di-export sebagai handler.
if (!process.env.VERCEL) {
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => console.log(`Server berjalan di http://localhost:${PORT}`));
}

export default app;
