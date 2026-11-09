# 🎌 HenVeronime - Anime Streaming & SankaVollerei API Docs

> Aplikasi web streaming anime modern bertema **Neo-Brutalism & Sketch Cartoon** dengan integrasi API anime lengkap berbasis **SankaVollerei API** (`otakudesu` scraper / REST provider).

---

## 📌 Daftar Isi
1. [Tentang API SankaVollerei](#-tentang-api-sankavollerei)
2. [Instalasi & Menjalankan Aplikasi](#-instalasi--menjalankan-aplikasi)
3. [Daftar Endpoint API](#-daftar-endpoint-api)
4. [Contoh Implementasi Kode](#-contoh-implementasi-kode)
   - [Node.js / Express (Axios)](#1-implementasi-backend-nodejs--axios)
   - [Frontend JavaScript / React (Fetch)](#2-implementasi-frontend-javascript--react)
5. [Dokumentasi Lengkap Request & Response JSON](#-dokumentasi-lengkap-request--response-json)
   - [1. Beranda / Anime Ongoing (`/api/home` atau `/anime/ongoing-anime`)](#1-beranda--anime-ongoing)
   - [2. Detail Anime (`/api/anime/:slug`)](#2-detail-anime)
   - [3. Nonton Streaming Episode (`/api/watch/:slug`)](#3-nonton-streaming-episode)
   - [4. Ambil URL Server Streaming (`/api/server/:serverId`)](#4-ambil-url-server-streaming)
   - [5. Pencarian Anime (`/api/search/:query`)](#5-pencarian-anime)
   - [6. Anime Populer (`/api/popular/:page`)](#6-anime-populer)
   - [7. Anime Movie (`/api/movies/:page`)](#7-anime-movie)
   - [8. Anime Tamat / Completed (`/api/completed/:page`)](#8-anime-tamat--completed)
   - [9. Daftar Genre Anime (`/api/genre`)](#9-daftar-genre-anime)
   - [10. Filter Anime Berdasarkan Genre (`/api/genre/:slug`)](#10-filter-anime-berdasarkan-genre)
   - [11. Jadwal Rilis Mingguan (`/api/schedule`)](#11-jadwal-rilis-mingguan)
   - [12. Download Batch Anime (`/api/batch/:slug`)](#12-download-batch-anime)
   - [13. Daftar Semua Anime A-Z (`/api/unlimited`)](#13-daftar-semua-anime-a-z)

---

## 🌐 Tentang API SankaVollerei

API yang digunakan bersumber dari layanan REST **SankaVollerei**:
- **Target Base URL Utama**: `https://www.sankavollerei.web.id`
- **Proxy Server HenVeronime**: `http://localhost:3000/api` (atau `https://domain-anda.com/api`)

Di dalam proyek ini, seluruh permintaan ke SankaVollerei di-proxy dan diformat ulang secara elegan melalui Express Controller (`/api/_controllers/animeController.ts`) dengan dukungan:
- **In-memory Caching** (`node-cache`) selama 15 - 30 menit agar tidak membebani server upstream.
- **Slug Normalization** untuk menangani format URL yang beragam.
- **CORS Handling** agar dapat diakses dari browser tanpa blokade header.

---

## 🚀 Instalasi & Menjalankan Aplikasi

```bash
# 1. Clone repository
git clone https://github.com/username/HenVeronime.git
cd HenVeronime

# 2. Pasang dependencies
npm install

# 3. Buat file .env (opsional jika ingin mengganti target API)
cp .env.example .env

# 4. Jalankan server development
npm run dev

# Aplikasi akan berjalan di http://localhost:3000
```

---

## 📋 Daftar Endpoint API

| Method | Endpoint HenVeronime | Endpoint Asli SankaVollerei | Keterangan |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/home?page=1` | `/anime/ongoing-anime?page=1` | Daftar anime rilis terbaru / sedang tayang |
| `GET` | `/api/anime/:slug` | `/anime/anime/:slug` | Info detail anime, sinopsis, & list episode |
| `GET` | `/api/watch/:slug` | `/anime/episode/:slug` | Stream episode, iframe video, & link download |
| `GET` | `/api/server/:serverId` | `/anime/server/:serverId` | URL embed iframe untuk server alternatif |
| `GET` | `/api/search/:query` | `/anime/search/:query` | Cari anime berdasarkan kata kunci |
| `GET` | `/api/popular/:page` | `/anime/complete-anime?page=1` | Daftar anime populer |
| `GET` | `/api/movies/:page` | `/anime/search/movie` | Daftar film bioskop anime (Movie) |
| `GET` | `/api/completed/:page` | `/anime/complete-anime?page=1` | Daftar anime yang sudah tamat |
| `GET` | `/api/genre` | `/anime/genre` | Daftar semua kategori genre anime |
| `GET` | `/api/genre/:slug` | `/anime/genre/:slug?page=1` | Filter anime berdasarkan genre |
| `GET` | `/api/schedule` | `/anime/schedule` | Jadwal tayang anime per hari (Senin - Minggu) |
| `GET` | `/api/batch/:slug` | `/anime/batch/:slug` | Tautan download batch per episode lengkap |
| `GET` | `/api/unlimited` | `/anime/unlimited` | Indeks direktori anime A - Z |
| `GET` | `/api/quotes` | *Lokal internal* | Kumpulan quotes anime motivasi & ikonik |

---

## 💻 Contoh Implementasi Kode

### 1. Implementasi Backend Node.js / Axios

Berikut adalah contoh modul klien Axios untuk mengonsumsi API SankaVollerei secara langsung atau melalui proxy:

```typescript
import axios from 'axios';

const SANKA_API_URL = process.env.ANIME_API_URL || 'https://www.sankavollerei.web.id';

const sankaClient = axios.create({
  baseURL: SANKA_API_URL,
  timeout: 10000,
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'HenVeronime-Client/1.0'
  }
});

// 1. Ambil Anime Ongoing / Terbaru
export async function fetchOngoingAnime(page = 1) {
  try {
    const res = await sankaClient.get(`/anime/ongoing-anime?page=${page}`);
    return res.data;
  } catch (err: any) {
    console.error('Error fetching ongoing:', err.message);
    throw err;
  }
}

// 2. Ambil Detail Anime berdasarkan Slug
export async function fetchAnimeDetail(slug: string) {
  try {
    const res = await sankaClient.get(`/anime/anime/${encodeURIComponent(slug)}`);
    return res.data;
  } catch (err: any) {
    console.error(`Error fetching detail for ${slug}:`, err.message);
    throw err;
  }
}

// 3. Ambil Data Nonton & Video Streaming Episode
export async function fetchEpisodeStream(episodeSlug: string) {
  try {
    const res = await sankaClient.get(`/anime/episode/${encodeURIComponent(episodeSlug)}`);
    return res.data;
  } catch (err: any) {
    console.error(`Error fetching stream for ${episodeSlug}:`, err.message);
    throw err;
  }
}

// 4. Ambil URL Server Alternatif
export async function fetchServerStreamUrl(serverId: string) {
  try {
    const res = await sankaClient.get(`/anime/server/${encodeURIComponent(serverId)}`);
    return res.data?.data?.url;
  } catch (err: any) {
    console.error(`Error fetching server ${serverId}:`, err.message);
    throw err;
  }
}

// 5. Pencarian Anime
export async function searchAnime(keyword: string) {
  try {
    const res = await sankaClient.get(`/anime/search/${encodeURIComponent(keyword)}`);
    return res.data?.data?.animeList || [];
  } catch (err: any) {
    console.error('Error searching:', err.message);
    return [];
  }
}
```

---

### 2. Implementasi Frontend JavaScript / React

Contoh memanggil proxy endpoint HenVeronime dari komponen React:

```jsx
import React, { useEffect, useState } from 'react';

export function AnimeHomeList() {
  const [animeList, setAnimeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Memanggil internal proxy HenVeronime
        const response = await fetch('/api/home?page=1');
        if (!response.ok) throw new Error('Gagal mengambil data beranda');
        const data = await response.json();
        setAnimeList(data.latest_release || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div>Memuat data anime...</div>;
  if (error) return <div>Terjadi kesalahan: {error}</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {animeList.map((item) => (
        <div key={item.slug} className="border-4 border-black p-2 bg-yellow-100 shadow-[4px_4px_0px_#000]">
          <img src={item.image} alt={item.title_full} className="w-full h-48 object-cover border-2 border-black" />
          <h3 className="font-bold mt-2 truncate">{item.title_full}</h3>
          <p className="text-sm text-pink-600 font-semibold">{item.episode}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## 📖 Dokumentasi Lengkap Request & Response JSON

---

### 1. Beranda / Anime Ongoing

Mengambil daftar episode anime terbaru yang sedang rilis (ongoing) beserta pagination.

#### Request:
- **cURL**:
  ```bash
  curl -X GET "http://localhost:3000/api/home?page=1"
  ```
- **Fetch**:
  ```javascript
  const res = await fetch('/api/home?page=1');
  const data = await res.json();
  ```

#### Respon JSON:
```json
{
  "count": 12,
  "page": 1,
  "pagination": {
    "current_page": 1,
    "next_page": 2,
    "prev_page": null,
    "total_pages": 45
  },
  "latest_release": [
    {
      "episode": "Ep 4",
      "image": "https://otakudesu.cloud/wp-content/uploads/2024/10/DanDaDan.jpg",
      "slug": "dandadan-sub-indo",
      "status": "Setiap Kamis",
      "title_full": "Dandadan",
      "title_short": "Dandadan",
      "type": "TV",
      "url": "https://otakudesu.cloud/anime/dandadan-sub-indo/",
      "release_date": "24 Okt"
    },
    {
      "episode": "Ep 3",
      "image": "https://otakudesu.cloud/wp-content/uploads/2024/10/ReZero-S3.jpg",
      "slug": "re-zero-kara-hajimeru-isekai-seikatsu-season-3-sub-indo",
      "status": "Setiap Rabu",
      "title_full": "Re:Zero Season 3",
      "title_short": "Re:Zero Season 3",
      "type": "TV",
      "url": "https://otakudesu.cloud/anime/re-zero-s3-sub-indo/",
      "release_date": "23 Okt"
    }
  ]
}
```

---

### 2. Detail Anime

Mengambil seluruh informasi spesifik tentang judul anime, sinopsis, skor, studio rilis, genre, dan daftar episode lengkap.

#### Request:
- **cURL**:
  ```bash
  curl -X GET "http://localhost:3000/api/anime/dandadan-sub-indo"
  ```

#### Respon JSON:
```json
{
  "detail": {
    "title": "Dandadan",
    "alter_title": "ダンダダン",
    "thumbnail": "https://otakudesu.cloud/wp-content/uploads/2024/10/DanDaDan.jpg",
    "synopsis": "Momo Ayase adalah seorang gadis SMA yang percaya pada hantu tapi tidak pada alien, sementara teman sekelasnya Ken Takakura...",
    "description": "Momo Ayase adalah seorang gadis SMA yang percaya pada hantu...",
    "rating": "8.65",
    "status": "Ongoing",
    "type": "TV",
    "released": "Oct 4, 2024",
    "duration": "24 min. per ep.",
    "studios": ["Science SARU"],
    "studio": "Science SARU",
    "producers": ["MBS", "Mainichi Broadcasting System"],
    "genres": [
      {
        "title": "Action",
        "name": "Action",
        "genreId": "action",
        "slug": "action"
      },
      {
        "title": "Supernatural",
        "name": "Supernatural",
        "genreId": "supernatural",
        "slug": "supernatural"
      }
    ],
    "batch": {
      "title": "Dandadan Batch Subtitle Indonesia",
      "slug": "dandadan-batch-sub-indo"
    },
    "recommended": []
  },
  "episodes": [
    {
      "episode": "Episode 4",
      "title": "Episode 4",
      "slug": "dandadan-episode-4-sub-indo",
      "date": "24 October 2024",
      "url": "https://otakudesu.cloud/episode/dandadan-episode-4-sub-indo/"
    },
    {
      "episode": "Episode 3",
      "title": "Episode 3",
      "slug": "dandadan-episode-3-sub-indo",
      "date": "17 October 2024",
      "url": "https://otakudesu.cloud/episode/dandadan-episode-3-sub-indo/"
    }
  ]
}
```

---

### 3. Nonton Streaming Episode

Mengambil tautan streaming video (iframe), daftar server alternatif resolusi 360p/480p/720p/1080p, dan daftar link unduhan episode.

#### Request:
- **cURL**:
  ```bash
  curl -X GET "http://localhost:3000/api/watch/dandadan-episode-4-sub-indo"
  ```

#### Respon JSON:
```json
{
  "detail": {
    "series_title": "Dandadan",
    "alter_title": "ダンダダン",
    "thumbnail": "https://otakudesu.cloud/wp-content/uploads/2024/10/DanDaDan.jpg",
    "description": "Sinopsis anime...",
    "rating": "8.65",
    "status": "Ongoing",
    "type": "TV",
    "released": "Oct 4, 2024",
    "studio": "Science SARU",
    "genres": [
      { "title": "Action", "name": "Action" },
      { "title": "Supernatural", "name": "Supernatural" }
    ]
  },
  "streaming": {
    "iframe": "https://desustream.me/embed/dandadan-ep-4/"
  },
  "servers": [
    {
      "title": "360p",
      "serverList": [
        { "title": "OtakuStream", "serverId": "server_360p_otakustream" },
        { "title": "Mega", "serverId": "server_360p_mega" }
      ]
    },
    {
      "title": "720p",
      "serverList": [
        { "title": "OtakuStream HD", "serverId": "server_720p_otakustream" },
        { "title": "Gofile", "serverId": "server_720p_gofile" }
      ]
    }
  ],
  "downloadUrls": [
    {
      "title": "Mp4 720p",
      "serverList": [
        { "title": "Acefile", "url": "https://acefile.co/f/..." },
        { "title": "Mega", "url": "https://mega.nz/..." }
      ]
    }
  ],
  "navigation": {
    "hasPrevEpisode": true,
    "prevEpisode": { "episodeId": "dandadan-episode-3-sub-indo", "title": "Episode 3" },
    "hasNextEpisode": false,
    "nextEpisode": null
  },
  "episodes": [
    {
      "id": "dandadan-episode-4-sub-indo",
      "title": "Episode 4",
      "episode_info": "Episode 4",
      "slug": "dandadan-episode-4-sub-indo",
      "selected": true
    }
  ]
}
```

---

### 4. Ambil URL Server Streaming

Digunakan saat pengguna memilih server alternatif dari daftar `servers` di atas.

#### Request:
- **cURL**:
  ```bash
  curl -X GET "http://localhost:3000/api/server/server_720p_gofile"
  ```

#### Respon JSON:
```json
{
  "status": "success",
  "data": {
    "url": "https://gofile.io/embed/watch-12345"
  },
  "url": "https://gofile.io/embed/watch-12345"
}
```

---

### 5. Pencarian Anime

Mencari daftar anime berdasarkan judul atau kata kunci.

#### Request:
- **cURL**:
  ```bash
  curl -X GET "http://localhost:3000/api/search/naruto"
  ```

#### Respon JSON:
```json
{
  "info": {
    "page": 1,
    "query": "naruto",
    "search_title": "Search 'naruto'",
    "source": "SankaVollerei"
  },
  "pagination": {
    "current_page": 1,
    "next_page": null,
    "prev_page": null,
    "total_pages": 1
  },
  "results": [
    {
      "title": "Naruto Shippuden",
      "title_short": "Naruto Shippuden",
      "slug": "naruto-shippuden-sub-indo",
      "image": "https://otakudesu.cloud/wp-content/uploads/2017/04/Naruto-Shippuden.jpg",
      "status": "Completed",
      "episode": "★ 8.25",
      "type": "TV",
      "url": "https://otakudesu.cloud/anime/naruto-shippuden-sub-indo/",
      "genres": ["Action", "Adventure", "Martial Arts"]
    }
  ]
}
```

---

### 6. Anime Populer

Menampilkan daftar judul anime dengan popularitas dan rating tertinggi.

#### Request:
- **cURL**:
  ```bash
  curl -X GET "http://localhost:3000/api/popular/1"
  ```

#### Respon JSON:
```json
{
  "pagination": {
    "current_page": 1,
    "next_page": 2,
    "prev_page": null,
    "total_pages": 50
  },
  "results": [
    {
      "title": "Fullmetal Alchemist: Brotherhood",
      "title_short": "Fullmetal Alchemist: Brotherhood",
      "slug": "fullmetal-alchemist-brotherhood-sub-indo",
      "image": "https://otakudesu.cloud/wp-content/uploads/2018/11/Fullmetal-Alchemist-Brotherhood.jpg",
      "status": "Skor: 9.10",
      "episode": "★ 9.10",
      "type": "TV",
      "url": "https://otakudesu.cloud/anime/fma-brotherhood-sub-indo/"
    }
  ]
}
```

---

### 7. Anime Movie

Menampilkan anime format film bioskop / Movie.

#### Request:
- **cURL**:
  ```bash
  curl -X GET "http://localhost:3000/api/movies/1"
  ```

#### Respon JSON:
```json
{
  "pagination": {
    "current_page": 1,
    "next_page": null,
    "prev_page": null,
    "total_pages": 1
  },
  "results": [
    {
      "title": "Kimi no Na wa.",
      "title_short": "Kimi no Na wa.",
      "slug": "kimi-no-na-wa-sub-indo",
      "image": "https://otakudesu.cloud/wp-content/uploads/2016/11/Kimi-no-Na-wa..jpg",
      "status": "Movie",
      "episode": "★ 8.84",
      "type": "Movie",
      "url": "https://otakudesu.cloud/anime/kimi-no-na-wa-sub-indo/"
    }
  ]
}
```

---

### 8. Anime Tamat / Completed

Menampilkan daftar anime yang sudah selesai penayangannya secara keseluruhan.

#### Request:
- **cURL**:
  ```bash
  curl -X GET "http://localhost:3000/api/completed/1"
  ```

#### Respon JSON:
```json
{
  "pagination": {
    "current_page": 1,
    "next_page": 2,
    "prev_page": null,
    "total_pages": 120
  },
  "results": [
    {
      "title": "Attack on Titan: The Final Season Part 3",
      "title_short": "Attack on Titan: The Final Season Part 3",
      "slug": "shingeki-no-kyojin-the-final-season-kanketsu-hen-sub-indo",
      "image": "https://otakudesu.cloud/wp-content/uploads/2023/03/Shingeki-no-Kyojin-The-Final-Season-Kanketsu-hen.jpg",
      "status": "Completed",
      "episode": "2 Ep",
      "type": "TV",
      "url": "https://otakudesu.cloud/anime/shingeki-no-kyojin-the-final-season-kanketsu-hen-sub-indo/"
    }
  ]
}
```

---

### 9. Daftar Genre Anime

Mengambil seluruh daftar tag / genre anime yang tersedia.

#### Request:
- **cURL**:
  ```bash
  curl -X GET "http://localhost:3000/api/genre"
  ```

#### Respon JSON:
```json
{
  "status": "success",
  "data": [
    {
      "title": "Action",
      "genreId": "action",
      "href": "/genres/action"
    },
    {
      "title": "Comedy",
      "genreId": "comedy",
      "href": "/genres/comedy"
    },
    {
      "title": "Fantasy",
      "genreId": "fantasy",
      "href": "/genres/fantasy"
    },
    {
      "title": "Isekai",
      "genreId": "isekai",
      "href": "/genres/isekai"
    },
    {
      "title": "Romance",
      "genreId": "romance",
      "href": "/genres/romance"
    }
  ]
}
```

---

### 10. Filter Anime Berdasarkan Genre

Menyaring katalog anime berdasarkan slug genre tertentu.

#### Request:
- **cURL**:
  ```bash
  curl -X GET "http://localhost:3000/api/genre/action?page=1"
  ```

#### Respon JSON:
```json
{
  "pagination": {
    "current_page": 1,
    "next_page": 2,
    "prev_page": null,
    "total_pages": 30
  },
  "results": [
    {
      "title": "Solo Leveling",
      "title_short": "Solo Leveling",
      "slug": "ore-dake-level-up-na-ken-sub-indo",
      "image": "https://otakudesu.cloud/wp-content/uploads/2024/01/Solo-Leveling.jpg",
      "status": "★ 8.35",
      "episode": "12 Ep",
      "type": "TV",
      "url": "https://otakudesu.cloud/anime/solo-leveling-sub-indo/",
      "studios": "A-1 Pictures",
      "genres": ["Action", "Adventure", "Fantasy"]
    }
  ]
}
```

---

### 11. Jadwal Rilis Mingguan

Mengambil jadwal anime ongoing terorganisir per hari (Senin sampai Minggu).

#### Request:
- **cURL**:
  ```bash
  curl -X GET "http://localhost:3000/api/schedule"
  ```

#### Respon JSON:
```json
{
  "status": "success",
  "data": [
    {
      "day": "Senin",
      "animeList": [
        {
          "title": "Tower of God Season 2",
          "slug": "kami-no-tou-season-2-sub-indo",
          "url": "https://otakudesu.cloud/anime/kami-no-tou-s2-sub-indo/"
        }
      ]
    },
    {
      "day": "Selasa",
      "animeList": [
        {
          "title": "Bleach: Thousand-Year Blood War",
          "slug": "bleach-sennen-kessen-hen-sub-indo",
          "url": "https://otakudesu.cloud/anime/bleach-sennen-kessen-hen-sub-indo/"
        }
      ]
    }
  ]
}
```

---

### 12. Download Batch Anime

Mengambil seluruh bundle unduhan semua episode anime dalam format batch (ZIP/RAR) untuk resolusi 360p, 480p, 720p, 1080p.

#### Request:
- **cURL**:
  ```bash
  curl -X GET "http://localhost:3000/api/batch/dandadan-batch-sub-indo"
  ```

#### Respon JSON:
```json
{
  "status": "success",
  "data": {
    "title": "Dandadan Batch Subtitle Indonesia",
    "downloadUrl": {
      "qualities": [
        {
          "title": "Batch MP4 720p",
          "size": "1.8 GB",
          "serverList": [
            { "title": "Google Drive", "url": "https://drive.google.com/..." },
            { "title": "Mega", "url": "https://mega.nz/..." }
          ]
        }
      ]
    }
  }
}
```

---

### 13. Daftar Semua Anime A-Z

Menampilkan indeks lengkap seluruh judul anime dari abjad A sampai Z.

#### Request:
- **cURL**:
  ```bash
  curl -X GET "http://localhost:3000/api/unlimited"
  ```

#### Respon JSON:
```json
{
  "status": "success",
  "data": [
    {
      "char": "A",
      "list": [
        { "title": "Akame ga Kill!", "slug": "akame-ga-kill-sub-indo" },
        { "title": "Another", "slug": "another-sub-indo" }
      ]
    },
    {
      "char": "B",
      "list": [
        { "title": "Baccano!", "slug": "baccano-sub-indo" },
        { "title": "Black Clover", "slug": "black-clover-sub-indo" }
      ]
    }
  ]
}
```

---

## 🛠️ Catatan Penggunaan & Praktik Terbaik

1. **Penanganan Iframe**:
   - URL yang ada di `streaming.iframe` merupakan embed player. Pastikan atribut iframe HTML menyertakan `allowfullscreen`, `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"`, dan `sandbox="allow-forms allow-scripts allow-same-origin allow-popups"`.
2. **Normalisasi Slug**:
   - Jika pengguna memasukkan slug dengan prefix `anime/`, `episode/`, atau `watch/`, gunakan utilitas `cleanSlug()` untuk menghapus prefix tersebut agar cocok dengan endpoint SankaVollerei.
3. **Caching**:
   - Gunakan cache di tingkat controller (misalnya 15-30 menit) untuk mengurangi latency dan mencegah batasan rate limit dari penyedia pihak ketiga.
