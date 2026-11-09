# 🎎 HenVeronime - Streaming Anime

[![Logo](https://cdn.zass.in/LQmWLrK10c.jpg)](#-henveronime---website-streaming-anime)

<p align="center">
   Website streaming anime subtitle Indonesia dengan tampilan Modern Sketch Cartoon, berbasis Node.js (Express).
</p>

---

### 📋 Daftar Isi
- [🐳 Developer](#-developer)
- [📝 Cara Kerja Website](#-cara-kerja-website)
- [🌊 Total Fitur](#-total-fitur)
- [📂 Struktur Project](#-struktur-project)
- [⚙️ Konfigurasi](#-konfigurasi)
- [🎛 Deploy di Vercel](#-deploy-di-vercel)
- [💻 Jalankan di Lokal](#-jalankan-di-lokal)
- [🤝🏻 Thanks](#-thanks)

---

# 🐳 Developer

- 👤 Name : Henkaramazov
- 🌐 Website : [Henkaramazov](https://henkarmazov.my.id)
- 🐙 Github : [Henkarmazov](https://github.com/Henkarmazov)


# 📝 Cara kerja website

> [!NOTE]
> Website ini **tidak memiliki endpoint API publik**. Semua data diambil oleh server lalu langsung ditanam ke halaman HTML. Browser tidak memanggil URL JSON apa pun.

Alur singkatnya:

1. Pengunjung membuka sebuah halaman, misalnya `/anime/nama-anime`.
2. Server mengambil data dari sumber, merapikannya, lalu mengirim halaman HTML lengkap beserta datanya.
3. Alamat sumber data **hanya** ada di environment (`ANIME_API_URL`). Tidak ada di kode, tidak ada di browser, dan tidak pernah ditampilkan di pesan error.
4. Alamat seperti `/api/...` tidak ada. Membukanya hanya menampilkan halaman 404.

Daftar halaman:

| Halaman | Fungsi |
|---|---|
| `/` | Beranda, anime sedang tayang (`?page=2` untuk halaman berikutnya) |
| `/anime/:slug` | Detail anime dan daftar episode |
| `/watch/:slug` | Nonton episode (`?server=ID` untuk ganti server streaming) |
| `/search?q=kata` | Hasil pencarian |
| `/list/:type` | Kategori: `popular` `movies` `ongoing` `completed` |
| `/genre` dan `/genre/:slug` | Daftar genre dan anime per genre |
| `/schedule` | Jadwal rilis anime per hari |
| `/donasi` | Halaman donasi (mengarah ke Saweria) |

---
## 🌊 Total fitur

**8 halaman** dengan fitur pendukung:

| Kategori | Fitur |
|---|---|
| Menonton | Pemutar video, pilih server dan resolusi, tombol episode sebelumnya/selanjutnya |
| Download | Link unduhan episode per resolusi |
| Pencarian | Cari anime berdasarkan judul |
| Jelajah | Anime Populer, Movie, Ongoing, Tamat, Genre, Jadwal Rilis |
| Pengguna | Riwayat tontonan (tersimpan di browser), kutipan anime acak |
| Tampilan | Gaya sketch cartoon, maskot Si Meow, responsif untuk HP |

### 📂 Struktur project

```
henveronime/
├── server.ts           # entry point: jalankan server (lokal) / handler Vercel
├── index.html          # template halaman (tampilan, favicon, sidebar, dll)
├── package.json
├── tsconfig.json
├── vercel.json         # konfigurasi deploy Vercel
├── .env.example        # contoh isi .env
├── server/
│   ├── app.ts          # daftar halaman (route) dan penanganan error
│   ├── anime.ts        # pengambilan dan perapian data anime
│   ├── upstream.ts     # koneksi ke sumber data + cache + penyaring alamat
│   ├── render.ts       # menanam data ke index.html
│   └── quotes.ts       # kutipan anime
└── public/
    ├── app.js          # logika tampilan di browser
    └── assets/images/  # hvicon.png (logo), hero-banner.webm, admin-profile.jpg
```

---

## ⚙️ Konfigurasi

Semua pengaturan rahasia ada di file `.env` (lokal) atau Environment Variables (hosting).

```env
# URL sumber data anime. Isi dengan URL dari Sanka Vollerei.
ANIME_API_URL=
```

| Variabel | Wajib | Fungsi |
|---|---|---|
| `ANIME_API_URL` | Ya | Alamat sumber data. Tidak boleh ditulis di kode |
| `PORT` | Tidak | Port server lokal (bawaan `3000`) |

---

## 🎛 Deploy di Vercel

1. **Upload ke GitHub.** Buat repository, lalu push seluruh project. Pastikan `.env` **tidak ikut** terunggah (sudah diabaikan oleh `.gitignore`).
2. Buka [vercel.com](https://vercel.com), login, klik **Add New > Project**, lalu pilih repository tadi.
3. Pada pengaturan project:
   - **Framework Preset**: `Other`
   - **Build Command** dan **Output Directory**: biarkan kosong
   - **Install Command**: bawaan (`npm install`)
4. Buka bagian **Environment Variables**, lalu tambahkan:

   | Name | Value |
   |---|---|
   | `ANIME_API_URL` | URL sumber data (isi sesuai milik Anda) |

   Centang **Production**, **Preview**, dan **Development**.
5. Klik **Deploy**. Tunggu sampai selesai, lalu buka domain `.vercel.app` yang diberikan.
   
> [!TIP]
> - Mengubah nilai Environment Variable baru berlaku setelah **Redeploy**.
> - Kalau halaman menampilkan "Layanan belum dikonfigurasi", artinya `ANIME_API_URL` belum diisi atau belum di-redeploy.
> - `vercel.json` sudah mengarahkan semua alamat ke `server.ts`, jadi tidak perlu mengatur rewrite lagi.

---

## 💻 Jalankan di lokal

Butuh **Node.js 20** atau lebih baru.

```bash
npm install
cp .env.example .env     # lalu isi ANIME_API_URL di file .env
npm run dev
```

Buka **http://localhost:3000**.

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Jalankan mode pengembangan (restart otomatis saat file berubah) |
| `npm start` | Jalankan mode produksi |
| `npm run lint` | Cek tipe TypeScript |

> [!TIP]
> Untuk Termux Android: `pkg install nodejs unzip`, ekstrak project, lalu jalankan perintah di atas.

---

# 🤝🏻 Thanks

Terima kasih kepada **Sanka Vollerei** atas penyediaan data anime yang menjadi sumber utama dan bagian penting dalam pengembangan `HenVeronime`.

---

<div align="center">Henkaramazov</div>
