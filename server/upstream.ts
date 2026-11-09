import axios, { AxiosInstance } from 'axios';
import NodeCache from 'node-cache';

/** Error yang aman ditampilkan ke pengunjung (pesan sudah generik). */
export class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const cache = new NodeCache({ stdTTL: 1800, checkperiod: 600 });

let client: AxiosInstance | null = null;
let needles: string[] = [];

/**
 * URL sumber data HANYA dibaca dari environment (ANIME_API_URL).
 * Tidak ada nilai default di dalam kode.
 */
function getClient(): AxiosInstance {
  if (client) return client;

  const raw = (process.env.ANIME_API_URL || '').trim();
  if (!raw) {
    console.error('[config] ANIME_API_URL belum di-set di environment/.env');
    throw new AppError(503, 'Layanan belum dikonfigurasi.');
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    console.error('[config] ANIME_API_URL bukan URL yang valid');
    throw new AppError(503, 'Layanan belum dikonfigurasi.');
  }

  needles = [parsed.origin, parsed.host].filter(Boolean);
  client = axios.create({
    baseURL: raw.replace(/\/+$/, ''),
    timeout: 12000,
    headers: {
      Accept: 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  return client;
}

/** Ambil data dari sumber. Error asli (yang bisa memuat URL) hanya dicatat sebagai kode status. */
export async function upstream(path: string): Promise<any> {
  const http = getClient();
  try {
    const res = await http.get(path);
    return res.data;
  } catch (e: any) {
    const status: number | undefined = e?.response?.status;
    console.error(`[upstream] ${path.split('?')[0]} -> ${status ?? e?.code ?? 'error'}`);
    if (status === 404) throw new AppError(404, 'Data tidak ditemukan.');
    throw new AppError(502, 'Gagal mengambil data. Coba lagi sebentar lagi.');
  }
}

/** Jaring pengaman: hapus alamat sumber data dari string apa pun yang akan dikirim ke browser. */
export function redact<T>(value: T): T {
  if (!needles.length) return value;
  const walk = (v: any): any => {
    if (typeof v === 'string') {
      let s = v;
      for (const n of needles) {
        if (s.includes(n)) s = s.split(n).join('');
      }
      return s;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const out: Record<string, any> = {};
      for (const k of Object.keys(v)) out[k] = walk(v[k]);
      return out;
    }
    return v;
  };
  return walk(value);
}
