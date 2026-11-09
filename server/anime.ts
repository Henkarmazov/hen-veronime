import { AppError, cache, upstream } from './upstream.js';

/** Hanya field yang benar-benar dipakai halaman yang diteruskan ke browser. */

const SLUG_RE = /^[A-Za-z0-9][A-Za-z0-9_.\-]{0,200}$/;

export const isValidSlug = (s: unknown): s is string => typeof s === 'string' && SLUG_RE.test(s);

export const toPage = (v: unknown): number => {
  const n = parseInt(String(v ?? '1'), 10);
  return Number.isFinite(n) && n > 0 && n < 10000 ? n : 1;
};

const genreSlug = (g: string) => g.trim().toLowerCase().replace(/\s+/g, '-');

const mapPagination = (raw: any, page: number) => ({
  current_page: raw?.currentPage || page,
  next_page: raw?.hasNextPage ? raw.nextPage : null,
  prev_page: raw?.hasPrevPage ? raw.prevPage : null,
  total_pages: raw?.totalPages || null,
});

const noPagination = (page = 1) => ({ current_page: page, next_page: null, prev_page: null, total_pages: 1 });

export interface AnimeCard {
  title: string;
  image: string;
  slug: string;
  episode: string;
  type: string;
}

const card = (item: any, episode: string, type = 'TV'): AnimeCard => ({
  title: item?.title || '',
  image: item?.poster || '',
  slug: item?.animeId || '',
  episode,
  type,
});

async function cached<T>(key: string, ttl: number | undefined, load: () => Promise<T>): Promise<T> {
  const hit = cache.get<T>(key);
  if (hit !== undefined) return hit;
  const value = await load();
  if (ttl) cache.set(key, value, ttl);
  else cache.set(key, value);
  return value;
}

/** Anime sedang tayang (beranda + kategori "ongoing") */
export const getOngoing = (page: number) =>
  cached(`ongoing:${page}`, undefined, async () => {
    const body = await upstream(`/anime/ongoing-anime?page=${page}`);
    const list: any[] = body?.data?.animeList || [];
    return {
      pagination: mapPagination(body?.pagination, page),
      results: list.map((i) => card(i, i.episodes ? `Ep ${i.episodes}` : 'Ongoing')),
    };
  });

/** Anime tamat (kategori "completed" dan "popular") */
export const getCompleted = (page: number) =>
  cached(`completed:${page}`, undefined, async () => {
    const body = await upstream(`/anime/complete-anime?page=${page}`);
    const list: any[] = body?.data?.animeList || [];
    return {
      pagination: mapPagination(body?.pagination, page),
      results: list.map((i) => card(i, i.score ? `★ ${i.score}` : i.episodes ? `${i.episodes} Ep` : 'Completed')),
    };
  });

export const getMovies = () =>
  cached('movies', undefined, async () => {
    const body = await upstream('/anime/search/movie');
    const list: any[] = body?.data?.animeList || [];
    return {
      pagination: noPagination(),
      results: list.map((i) => card(i, i.score ? `★ ${i.score}` : 'Movie', 'Movie')),
    };
  });

export const getSearch = (query: string) =>
  cached(`search:${query.toLowerCase()}`, 900, async () => {
    try {
      const body = await upstream(`/anime/search/${encodeURIComponent(query)}`);
      const list: any[] = body?.data?.animeList || [];
      return {
        pagination: noPagination(),
        results: list.map((i) => card(i, i.score ? `★ ${i.score}` : i.status || 'Anime')),
      };
    } catch (e) {
      if (e instanceof AppError && e.status === 404) return { pagination: noPagination(), results: [] as AnimeCard[] };
      throw e;
    }
  });

export const getGenres = () =>
  cached('genres', 86400, async () => {
    const body = await upstream('/anime/genre');
    const list: any[] = body?.data?.genreList || [];
    return list
      .map((g) => ({ title: String(g?.title || ''), genreId: String(g?.genreId || genreSlug(g?.title || '')) }))
      .filter((g) => g.title && g.genreId);
  });

export const getGenreAnime = (slug: string, page: number) =>
  cached(`genre:${slug}:${page}`, undefined, async () => {
    try {
      const body = await upstream(`/anime/genre/${slug}?page=${page}`);
      const list: any[] = body?.data?.animeList || [];
      return {
        pagination: mapPagination(body?.pagination, page),
        results: list.map((i) => card(i, typeof i.episodes === 'number' ? `${i.episodes} Ep` : i.episodes || 'N/A')),
      };
    } catch (e) {
      if (e instanceof AppError && e.status === 404) {
        return { pagination: { current_page: page, next_page: null, prev_page: null, total_pages: null }, results: [] as AnimeCard[] };
      }
      throw e;
    }
  });

export const getSchedule = () =>
  cached('schedule', 7200, async () => {
    const body = await upstream('/anime/schedule');
    const raw = body?.data;
    const days: any[] = Array.isArray(raw) ? raw : raw?.days || [];
    return days.map((d) => ({
      day: String(d?.day || ''),
      anime: ((d?.anime_list || d?.animeList || []) as any[]).map((a) => ({
        title: a?.title || '',
        image: a?.poster || '',
        slug: a?.slug || a?.animeId || String(a?.url || '').replace('/anime/anime/', '').replace(/^\/+|\/+$/g, ''),
      })),
    }));
  });

export const getDetail = (slug: string) =>
  cached(`detail:${slug}`, undefined, async () => {
    const body = await upstream(`/anime/anime/${slug}`);
    const raw = body?.data;
    if (!raw || !raw.title) throw new AppError(404, 'Anime tidak ditemukan.');

    const synopsis = Array.isArray(raw.synopsis?.paragraphs)
      ? raw.synopsis.paragraphs.filter(Boolean).join('\n\n')
      : typeof raw.synopsis === 'string'
      ? raw.synopsis
      : '';
    const studios: string[] = Array.isArray(raw.studios) ? raw.studios : raw.studios ? [raw.studios] : [];

    return {
      detail: {
        title: raw.title || '',
        alter_title: raw.japanese || '',
        thumbnail: raw.poster || '',
        synopsis: synopsis || 'Tidak ada sinopsis tersedia.',
        rating: raw.score ? `${raw.score}` : 'N/A',
        status: raw.status || 'Ongoing',
        type: raw.type || 'TV',
        studio: studios.join(', '),
        genres: ((raw.genreList || []) as any[]).map((g) => ({
          name: g?.title || '',
          slug: g?.genreId || genreSlug(g?.title || ''),
        })),
      },
      episodes: ((raw.episodeList || []) as any[]).map((ep) => ({
        title: ep?.title || (ep?.eps ? `Episode ${ep.eps}` : ''),
        slug: ep?.episodeId || '',
      })),
    };
  });

/** Resolusi satu server streaming menjadi URL embed. */
const getServerEmbed = (serverId: string) =>
  cached(`server:${serverId}`, 3600, async () => {
    const body = await upstream(`/anime/server/${serverId}`);
    return String(body?.data?.url || '');
  });

export const getWatch = async (slug: string, serverId?: string) => {
  const base = await cached(`watch:${slug}`, undefined, async () => {
    const body = await upstream(`/anime/episode/${slug}`);
    const data = body?.data;
    if (!data) throw new AppError(404, 'Episode tidak ditemukan.');

    // Lengkapi dengan detail anime induk (tidak fatal bila gagal)
    let parent: any = null;
    if (data.animeId && isValidSlug(data.animeId)) {
      try {
        const p = await upstream(`/anime/anime/${data.animeId}`);
        parent = p?.data || null;
      } catch {
        parent = null;
      }
    }

    const thumbnail = parent?.poster || '';
    const synopsis = Array.isArray(parent?.synopsis?.paragraphs)
      ? parent.synopsis.paragraphs.join('\n\n')
      : typeof parent?.synopsis === 'string'
      ? parent.synopsis
      : '';

    let iframe: string = data.defaultStreamingUrl || '';
    if (!iframe) {
      const firstId = data.server?.qualities?.[0]?.serverList?.[0]?.serverId;
      if (firstId && isValidSlug(firstId)) {
        try {
          iframe = await getServerEmbed(firstId);
        } catch {
          iframe = '';
        }
      }
    }

    const epList: any[] = data.info?.episodeList || parent?.episodeList || [];
    const studios = Array.isArray(parent?.studios) ? parent.studios.join(', ') : parent?.studios || '';

    return {
      detail: {
        series_title: parent?.title || data.title?.split('Episode')[0]?.trim() || data.title || '',
        alter_title: parent?.japanese || '',
        thumbnail,
        description: synopsis || (data.info?.duration ? `Durasi: ${data.info.duration}` : ''),
        rating: parent?.score || 'N/A',
        status: parent?.status || 'Ongoing',
        type: data.info?.type || parent?.type || 'TV',
        season: parent?.season || '',
        studio: studios,
        genres: ((data.info?.genreList || parent?.genreList || []) as any[]).map((g) => ({ name: g?.title || g?.name || '' })),
        anime_slug: data.animeId || '',
      },
      episodes: epList.map((ep) => {
        const epSlug = ep?.episodeId || '';
        return {
          slug: epSlug,
          title: ep?.title || (ep?.eps ? `Episode ${ep.eps}` : ''),
          episode_info: ep?.eps ? `Episode ${ep.eps}` : ep?.date || '',
          image: thumbnail,
          selected: epSlug === slug,
        };
      }),
      iframe,
      servers: ((data.server?.qualities || []) as any[]).map((q) => ({
        title: q?.title || '',
        serverList: ((q?.serverList || []) as any[]).map((s) => ({ title: s?.title || '', serverId: s?.serverId || '' })),
      })),
      downloadUrls: ((data.downloadUrl?.qualities || []) as any[]).map((q) => ({
        title: q?.title || '',
        size: q?.size || '',
        urls: ((q?.urls || []) as any[]).map((u) => ({ title: u?.title || '', url: u?.url || '' })),
      })),
      navigation: {
        prev: data.hasPrevEpisode && data.prevEpisode?.episodeId ? data.prevEpisode.episodeId : null,
        next: data.hasNextEpisode && data.nextEpisode?.episodeId ? data.nextEpisode.episodeId : null,
      },
    };
  });

  if (serverId && isValidSlug(serverId)) {
    const url = await getServerEmbed(serverId);
    if (url) return { ...base, iframe: url, activeServer: serverId };
  }
  return { ...base, activeServer: '' };
};
