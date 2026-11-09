import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import * as anime from './anime.js';
import { AppError } from './upstream.js';
import { renderPage } from './render.js';
import { quotes } from './quotes.js';

type Handler = (req: Request, res: Response) => Promise<void> | void;

const LIST_TYPES: Record<string, { title: string }> = {
  popular: { title: 'Anime Populer' },
  movies: { title: 'Anime Movie' },
  ongoing: { title: 'Anime Sedang Tayang' },
  completed: { title: 'Anime Tamat' },
};

const errorPage = (res: Response, status: number, message: string) =>
  renderPage(res, { status, title: status === 404 ? 'Tidak ditemukan' : 'Terjadi kesalahan', data: { page: 'error', status, message } });

/** Semua error ditampilkan sebagai halaman HTML dengan pesan generik. */
const wrap =
  (fn: Handler) =>
  async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (e) {
      if (e instanceof AppError) return errorPage(res, e.status, e.message);
      console.error('[server] error tak terduga:', (e as Error)?.message);
      return errorPage(res, 500, 'Terjadi kesalahan pada server.');
    }
  };

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  // Aset statis (gambar, video, app.js). Tidak ada route data/JSON.
  app.use(express.static(path.join(process.cwd(), 'public'), { index: false, maxAge: '1h' }));

  // Beranda
  app.get(
    '/',
    wrap(async (req, res) => {
      const page = anime.toPage(req.query.page);
      const data = await anime.getOngoing(page);
      renderPage(res, { data: { page: 'home', ...data, quotes } });
    })
  );

  // Detail anime
  app.get(
    '/anime/:slug',
    wrap(async (req, res) => {
      const slug = String(req.params.slug);
      if (!anime.isValidSlug(slug)) throw new AppError(404, 'Halaman tidak ditemukan.');
      const data = await anime.getDetail(slug);
      renderPage(res, { title: data.detail.title, data: { page: 'detail', ...data } });
    })
  );

  // Nonton episode (?server=ID untuk ganti server streaming)
  app.get(
    '/watch/:slug',
    wrap(async (req, res) => {
      const slug = String(req.params.slug);
      if (!anime.isValidSlug(slug)) throw new AppError(404, 'Halaman tidak ditemukan.');
      const server = typeof req.query.server === 'string' ? req.query.server : undefined;
      const data = await anime.getWatch(slug, server);
      renderPage(res, { title: data.detail.series_title, data: { page: 'streaming', slug, ...data } });
    })
  );

  // Pencarian
  app.get(
    '/search',
    wrap(async (req, res) => {
      const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
      if (!q) return res.redirect(302, '/');
      const data = await anime.getSearch(q);
      renderPage(res, { title: `Cari: ${q}`, data: { page: 'list', kind: 'search', title: `Hasil Pencarian: ${q}`, query: q, ...data } });
    })
  );

  // Kategori
  app.get(
    '/list/:type',
    wrap(async (req, res) => {
      const type = String(req.params.type);
      const meta = Object.hasOwn(LIST_TYPES, type) ? LIST_TYPES[type] : undefined;
      if (!meta) throw new AppError(404, 'Halaman tidak ditemukan.');
      const page = anime.toPage(req.query.page);
      const data =
        type === 'ongoing' ? await anime.getOngoing(page) : type === 'movies' ? await anime.getMovies() : await anime.getCompleted(page);
      renderPage(res, { title: meta.title, data: { page: 'list', kind: 'category', type, title: meta.title, ...data } });
    })
  );

  // Genre (daftar) dan hasil per genre
  const genreHandler = wrap(async (req, res) => {
    const slug = req.params.slug as string | undefined;
    if (slug !== undefined && !anime.isValidSlug(slug)) throw new AppError(404, 'Halaman tidak ditemukan.');
    const genres = await anime.getGenres();
    if (!slug) return renderPage(res, { title: 'Daftar Genre', data: { page: 'genre', genres, selected: null } });

    const wanted = slug.toLowerCase();
    const found = genres.find((g) => g.genreId.toLowerCase() === wanted);
    const results = await anime.getGenreAnime(found ? found.genreId : slug, anime.toPage(req.query.page));
    const title = found ? found.title : slug;
    renderPage(res, {
      title: `Genre ${title}`,
      data: { page: 'genre', genres, selected: { slug: found ? found.genreId : slug, title }, ...results },
    });
  });
  app.get('/genre', genreHandler);
  app.get('/genre/:slug', genreHandler);

  // Jadwal rilis
  app.get(
    '/schedule',
    wrap(async (_req, res) => {
      const days = await anime.getSchedule();
      renderPage(res, { title: 'Jadwal Rilis', data: { page: 'schedule', days } });
    })
  );

  // Donasi
  app.get('/donasi', (_req, res) => renderPage(res, { title: 'Donasi', data: { page: 'donation' } }));

  // Selain itu: 404 berupa halaman HTML (tidak ada respons JSON dan tidak ada route /api)
  app.use((_req, res) => errorPage(res, 404, 'Halaman tidak ditemukan.'));

  // Penjaga terakhir agar error tidak pernah membocorkan detail
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[server] error:', (err as Error)?.message);
    errorPage(res, 500, 'Terjadi kesalahan pada server.');
  });

  return app;
}
