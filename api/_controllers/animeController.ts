import axios from 'axios';
import { Request, Response } from 'express';
import NodeCache from 'node-cache';

const getAnimeApiBaseUrl = (): string => {
  const envUrl = process.env.ANIME_API_URL?.trim();

  if (!envUrl) {
    throw new Error(
      'ANIME_API_URL belum diatur. Tambahkan ANIME_API_URL=https://www.sankavollerei.web.id ke file .env Anda.'
    );
  }

  return envUrl.replace(/\/+$/, '');
};

const TARGET_BASE_URL = getAnimeApiBaseUrl();
const cache = new NodeCache({ stdTTL: 1800, checkperiod: 600 }); // Cache for 30 minutes

const apiClient = axios.create({
  baseURL: TARGET_BASE_URL,
  timeout: 12000,
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
});

/**
 * Clean slug for anime and episode IDs
 */
export const cleanSlug = (raw: string): string => {
  if (!raw) return '';
  let s = decodeURIComponent(raw.trim());
  s = s.replace(/^\/?(anime\/anime|anime\/episode|anime|episode|watch|ntn)\//i, '');
  s = s.replace(/^\/+|\/+$/g, '');
  return s;
};

/**
 * Convert genre name/string to slug
 */
export const cleanGenreSlug = (genre: string): string => {
  if (!genre) return '';
  return genre.trim().toLowerCase().replace(/\s+/g, '-');
};

/**
 * GET /anime/home or /anime/ongoing-anime
 */
export const getHomeData = async (req: Request, res: Response) => {
  const page = (req.query.page as string) || '1';
  const pageNum = parseInt(page) || 1;
  const cacheKey = `home_v2_${pageNum}`;

  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  try {
    const TARGET_URL = `/anime/ongoing-anime?page=${pageNum}`;
    console.log(`[API] Fetching Home/Ongoing: ${TARGET_URL}`);

    const response = await apiClient.get(TARGET_URL);
    const data = response.data?.data || {};
    const rawList = data.animeList || [];

    const latestRelease = rawList.map((item: any) => ({
      episode: typeof item.episodes === 'number' ? `Ep ${item.episodes}` : (item.episodes ? `Ep ${item.episodes}` : 'Ongoing'),
      image: item.poster || '',
      slug: item.animeId || cleanSlug(item.href || ''),
      status: item.releaseDay ? `Setiap ${item.releaseDay}` : 'Ongoing',
      title_full: item.title || '',
      title_short: item.title || '',
      type: 'TV',
      url: item.otakudesuUrl || item.href || '',
      release_date: item.latestReleaseDate || ''
    }));

    const paginationRaw = response.data?.pagination || {};
    const pagination = {
      current_page: paginationRaw.currentPage || pageNum,
      next_page: paginationRaw.hasNextPage ? paginationRaw.nextPage : null,
      prev_page: paginationRaw.hasPrevPage ? paginationRaw.prevPage : null,
      total_pages: paginationRaw.totalPages || null
    };

    const result = {
      count: latestRelease.length,
      page: pageNum,
      pagination,
      latest_release: latestRelease
    };

    cache.set(cacheKey, result);
    return res.json(result);
  } catch (error: any) {
    console.error('[API ERROR] Home:', error.message);
    return res.status(error.response?.status || 500).json({
      error: 'Gagal mengambil data beranda anime.',
      message: error.message
    });
  }
};

/**
 * GET /anime/anime/:slug
 */
export const getAnimeDetail = async (req: Request, res: Response) => {
  const rawSlug = req.params.slug as string;
  const slug = cleanSlug(rawSlug);

  if (!slug) {
    return res.status(400).json({ error: 'Slug anime tidak boleh kosong.' });
  }

  const cacheKey = `detail_v2_${slug}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  try {
    const TARGET_URL = `/anime/anime/${slug}`;
    console.log(`[API] Fetching Detail: ${TARGET_URL}`);

    const response = await apiClient.get(TARGET_URL);
    const raw = response.data?.data;

    if (!raw || !raw.title) {
      return res.status(404).json({ error: 'Data anime tidak ditemukan.' });
    }

    const synopsisText = Array.isArray(raw.synopsis?.paragraphs)
      ? raw.synopsis.paragraphs.filter(Boolean).join('\n\n')
      : (typeof raw.synopsis === 'string' ? raw.synopsis : '');

    const genres = (raw.genreList || []).map((g: any) => ({
      title: g.title || '',
      name: g.title || '',
      genreId: g.genreId || cleanGenreSlug(g.title || ''),
      slug: g.genreId || cleanGenreSlug(g.title || ''),
      href: g.href || '',
      otakudesuUrl: g.otakudesuUrl || ''
    }));

    const episodes = (raw.episodeList || []).map((ep: any) => ({
      episode: ep.eps !== undefined && ep.eps !== null ? `Episode ${ep.eps}` : ep.title,
      title: ep.title || (ep.eps ? `Episode ${ep.eps}` : ''),
      slug: ep.episodeId || cleanSlug(ep.href || ''),
      date: ep.date || '',
      url: ep.otakudesuUrl || ep.href || ''
    }));

    const studiosList = Array.isArray(raw.studios)
      ? raw.studios
      : (raw.studios ? [raw.studios] : []);

    const producersList = Array.isArray(raw.producers)
      ? raw.producers
      : (raw.producers ? [raw.producers] : []);

    const detail = {
      title: raw.title || '',
      alter_title: raw.japanese || '',
      thumbnail: raw.poster || '',
      synopsis: synopsisText || 'Tidak ada sinopsis tersedia.',
      description: synopsisText || '',
      rating: raw.score ? `${raw.score}` : 'N/A',
      status: raw.status || 'Ongoing',
      type: raw.type || 'TV',
      released: raw.aired || '',
      duration: raw.duration || '',
      studios: studiosList,
      studio: studiosList.join(', '),
      producers: producersList,
      genres: genres,
      batch: raw.batch || null,
      recommended: raw.recommendedAnimeList || []
    };

    const result = {
      detail,
      episodes
    };

    cache.set(cacheKey, result);
    return res.json(result);
  } catch (error: any) {
    console.error('[API ERROR] Detail:', error.message);
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Anime tidak ditemukan di server sumber.' });
    }
    return res.status(error.response?.status || 500).json({
      error: 'Gagal mengambil detail anime.',
      message: error.message
    });
  }
};

/**
 * GET /anime/episode/:slug
 */
export const getWatchData = async (req: Request, res: Response) => {
  const rawSlug = req.params.slug as string;
  const slug = cleanSlug(rawSlug);

  if (!slug) {
    return res.status(400).json({ error: 'Slug episode tidak boleh kosong.' });
  }

  const cacheKey = `watch_v2_${slug}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  try {
    const TARGET_URL = `/anime/episode/${slug}`;
    console.log(`[API] Fetching Episode Streaming: ${TARGET_URL}`);

    const response = await apiClient.get(TARGET_URL);
    const data = response.data?.data;

    if (!data) {
      return res.status(404).json({ error: 'Episode tidak ditemukan.' });
    }

    let parentDetail: any = null;
    if (data.animeId) {
      const parentCacheKey = `detail_v2_${data.animeId}`;
      parentDetail = cache.get(parentCacheKey);
      if (!parentDetail) {
        try {
          const detailRes = await apiClient.get(`/anime/anime/${data.animeId}`);
          parentDetail = detailRes.data?.data;
          if (parentDetail) {
            cache.set(parentCacheKey, { detail: parentDetail, episodes: parentDetail.episodeList || [] }, 3600);
          }
        } catch (e) {
          // Non-fatal if parent detail fetch fails
        }
      } else if (parentDetail.detail) {
        parentDetail = parentDetail.detail;
      }
    }

    const seriesTitle = parentDetail?.title || data.title?.split('Episode')[0]?.trim() || data.title || '';
    const thumbnail = parentDetail?.poster || parentDetail?.thumbnail || '';
    const synopsis = parentDetail?.synopsis?.paragraphs?.join('\n\n') || parentDetail?.synopsis || parentDetail?.description || '';

    let iframe = data.defaultStreamingUrl || '';

    if (!iframe && data.server?.qualities?.length > 0) {
      const firstQuality = data.server.qualities[0];
      const firstServer = firstQuality?.serverList?.[0];
      if (firstServer?.serverId) {
        try {
          const serverRes = await apiClient.get(`/anime/server/${firstServer.serverId}`);
          iframe = serverRes.data?.data?.url || '';
        } catch (e) {
          // ignore
        }
      }
    }

    const rawEpList = data.info?.episodeList || parentDetail?.episodeList || [];
    const episodes = rawEpList.map((ep: any) => {
      const epSlug = ep.episodeId || cleanSlug(ep.href || '');
      return {
        id: epSlug,
        title: ep.title || (ep.eps ? `Episode ${ep.eps}` : ''),
        episode_info: ep.eps ? `Episode ${ep.eps}` : (ep.date || ''),
        image: thumbnail,
        slug: epSlug,
        selected: epSlug === slug,
        url: ep.otakudesuUrl || ep.href || ''
      };
    });

    const genresList = (data.info?.genreList || parentDetail?.genreList || []).map((g: any) => ({
      title: g.title || g.name || g,
      name: g.title || g.name || g
    }));

    const detail = {
      series_title: seriesTitle,
      alter_title: parentDetail?.japanese || parentDetail?.alter_title || '',
      thumbnail: thumbnail,
      description: synopsis || (data.info?.duration ? `Durasi: ${data.info.duration}` : ''),
      rating: parentDetail?.score || parentDetail?.rating || 'N/A',
      status: parentDetail?.status || 'Ongoing',
      type: data.info?.type || parentDetail?.type || 'TV',
      released: parentDetail?.aired || parentDetail?.released || '',
      season: parentDetail?.season || '',
      studio: Array.isArray(parentDetail?.studios) ? parentDetail.studios.join(', ') : (parentDetail?.studios || ''),
      genres: genresList
    };

    const streaming = {
      iframe: iframe
    };

    const result = {
      detail,
      episodes,
      streaming,
      servers: data.server?.qualities || [],
      downloadUrls: data.downloadUrl?.qualities || [],
      navigation: {
        hasPrevEpisode: data.hasPrevEpisode || false,
        prevEpisode: data.prevEpisode || null,
        hasNextEpisode: data.hasNextEpisode || false,
        nextEpisode: data.nextEpisode || null
      }
    };

    cache.set(cacheKey, result);
    return res.json(result);
  } catch (error: any) {
    console.error('[API ERROR] Watch:', error.message);
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Episode tidak ditemukan.' });
    }
    return res.status(error.response?.status || 500).json({
      error: 'Gagal mengambil data streaming.',
      message: error.message
    });
  }
};

/**
 * GET /anime/server/:serverId
 */
export const getServerUrl = async (req: Request, res: Response) => {
  const { serverId } = req.params;
  if (!serverId) {
    return res.status(400).json({ error: 'Server ID tidak boleh kosong.' });
  }

  const cacheKey = `server_v2_${serverId}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  try {
    const TARGET_URL = `/anime/server/${serverId}`;
    console.log(`[API] Fetching Server URL: ${TARGET_URL}`);

    const response = await apiClient.get(TARGET_URL);
    const data = response.data?.data || {};

    const result = {
      status: 'success',
      data: data,
      url: data.url || ''
    };

    cache.set(cacheKey, result, 3600);
    return res.json(result);
  } catch (error: any) {
    console.error('[API ERROR] Server URL:', error.message);
    return res.status(error.response?.status || 500).json({
      error: 'Gagal mengambil URL embed server.',
      message: error.message
    });
  }
};

/**
 * GET /anime/search/:keyword
 */
export const getSearchData = async (req: Request, res: Response) => {
  const query = typeof req.params.query === 'string'
    ? req.params.query.trim()
    : typeof req.params.keyword === 'string'
    ? req.params.keyword.trim()
    : typeof req.query.q === 'string'
    ? req.query.q.trim()
    : '';
  const page = (req.params.page as string) || (req.query.page as string) || '1';
  const pageNum = parseInt(page) || 1;

  if (!query) {
    return res.status(400).json({ error: 'Kata kunci pencarian tidak boleh kosong.' });
  }

  const cacheKey = `search_v2_${query}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  try {
    const encodedQuery = encodeURIComponent(query);
    const TARGET_URL = `/anime/search/${encodedQuery}`;
    console.log(`[API] Fetching Search: ${TARGET_URL}`);

    const response = await apiClient.get(TARGET_URL);
    const rawResults = response.data?.data?.animeList || [];

    const results = rawResults.map((item: any) => ({
      title: item.title || '',
      title_short: item.title || '',
      slug: item.animeId || cleanSlug(item.href || ''),
      image: item.poster || '',
      status: item.status || 'Unknown',
      episode: item.score ? `★ ${item.score}` : (item.status || 'Anime'),
      type: 'TV',
      url: item.otakudesuUrl || item.href || '',
      genres: (item.genreList || []).map((g: any) => g.title || g)
    }));

    const result = {
      info: {
        page: pageNum,
        query: query,
        search_title: `Search '${query}'`,
        source: 'SankaVollerei'
      },
      pagination: {
        current_page: pageNum,
        next_page: null,
        prev_page: null,
        total_pages: 1
      },
      results
    };

    cache.set(cacheKey, result, 900);
    return res.json(result);
  } catch (error: any) {
    console.error('[API ERROR] Search:', error.message);
    if (error.response?.status === 404) {
      return res.json({
        info: { page: pageNum, query: query },
        pagination: { current_page: 1, next_page: null, prev_page: null, total_pages: 1 },
        results: []
      });
    }
    return res.status(500).json({
      error: 'Gagal melakukan pencarian anime.',
      message: error.message
    });
  }
};

/**
 * GET /anime/ongoing-anime
 */
export const getOngoingData = async (req: Request, res: Response) => {
  const page = (req.params.page as string) || (req.query.page as string) || '1';
  const pageNum = parseInt(page) || 1;
  const cacheKey = `ongoing_v2_${pageNum}`;

  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  try {
    const TARGET_URL = `/anime/ongoing-anime?page=${pageNum}`;
    console.log(`[API] Fetching Ongoing: ${TARGET_URL}`);

    const response = await apiClient.get(TARGET_URL);
    const rawList = response.data?.data?.animeList || [];
    const paginationRaw = response.data?.pagination || {};

    const results = rawList.map((item: any) => ({
      title: item.title || '',
      title_short: item.title || '',
      slug: item.animeId || cleanSlug(item.href || ''),
      image: item.poster || '',
      status: item.releaseDay ? `Setiap ${item.releaseDay}` : 'Ongoing',
      episode: typeof item.episodes === 'number' ? `Ep ${item.episodes}` : (item.episodes ? `Ep ${item.episodes}` : 'Ongoing'),
      type: 'TV',
      url: item.otakudesuUrl || item.href || ''
    }));

    const result = {
      pagination: {
        current_page: paginationRaw.currentPage || pageNum,
        next_page: paginationRaw.hasNextPage ? paginationRaw.nextPage : null,
        prev_page: paginationRaw.hasPrevPage ? paginationRaw.prevPage : null,
        total_pages: paginationRaw.totalPages || null
      },
      results
    };

    cache.set(cacheKey, result);
    return res.json(result);
  } catch (error: any) {
    console.error('[API ERROR] Ongoing:', error.message);
    return res.status(500).json({
      error: 'Gagal mengambil data anime ongoing.',
      message: error.message
    });
  }
};

/**
 * GET /anime/complete-anime
 */
export const getCompletedData = async (req: Request, res: Response) => {
  const page = (req.params.page as string) || (req.query.page as string) || '1';
  const pageNum = parseInt(page) || 1;
  const cacheKey = `completed_v2_${pageNum}`;

  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  try {
    const TARGET_URL = `/anime/complete-anime?page=${pageNum}`;
    console.log(`[API] Fetching Completed: ${TARGET_URL}`);

    const response = await apiClient.get(TARGET_URL);
    const rawList = response.data?.data?.animeList || [];
    const paginationRaw = response.data?.pagination || {};

    const results = rawList.map((item: any) => ({
      title: item.title || '',
      title_short: item.title || '',
      slug: item.animeId || cleanSlug(item.href || ''),
      image: item.poster || '',
      status: 'Completed',
      episode: item.score ? `★ ${item.score}` : (item.episodes ? `${item.episodes} Ep` : 'Completed'),
      type: 'TV',
      url: item.otakudesuUrl || item.href || ''
    }));

    const result = {
      pagination: {
        current_page: paginationRaw.currentPage || pageNum,
        next_page: paginationRaw.hasNextPage ? paginationRaw.nextPage : null,
        prev_page: paginationRaw.hasPrevPage ? paginationRaw.prevPage : null,
        total_pages: paginationRaw.totalPages || null
      },
      results
    };

    cache.set(cacheKey, result);
    return res.json(result);
  } catch (error: any) {
    console.error('[API ERROR] Completed:', error.message);
    return res.status(500).json({
      error: 'Gagal mengambil data anime tamat.',
      message: error.message
    });
  }
};

/**
 * Popular anime: mapped to highest rated complete anime
 */
export const getPopularData = async (req: Request, res: Response) => {
  const page = (req.params.page as string) || (req.query.page as string) || '1';
  const pageNum = parseInt(page) || 1;
  const cacheKey = `popular_v2_${pageNum}`;

  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  try {
    const TARGET_URL = `/anime/complete-anime?page=${pageNum}`;
    console.log(`[API] Fetching Popular: ${TARGET_URL}`);

    const response = await apiClient.get(TARGET_URL);
    const rawList = response.data?.data?.animeList || [];
    const paginationRaw = response.data?.pagination || {};

    const results = rawList.map((item: any) => ({
      title: item.title || '',
      title_short: item.title || '',
      slug: item.animeId || cleanSlug(item.href || ''),
      image: item.poster || '',
      status: item.score ? `Skor: ${item.score}` : 'Popular',
      episode: item.score ? `★ ${item.score}` : (item.episodes ? `${item.episodes} Ep` : 'Completed'),
      type: 'TV',
      url: item.otakudesuUrl || item.href || ''
    }));

    const result = {
      pagination: {
        current_page: paginationRaw.currentPage || pageNum,
        next_page: paginationRaw.hasNextPage ? paginationRaw.nextPage : null,
        prev_page: paginationRaw.hasPrevPage ? paginationRaw.prevPage : null,
        total_pages: paginationRaw.totalPages || null
      },
      results
    };

    cache.set(cacheKey, result);
    return res.json(result);
  } catch (error: any) {
    console.error('[API ERROR] Popular:', error.message);
    return res.status(500).json({
      error: 'Gagal mengambil data anime populer.',
      message: error.message
    });
  }
};

/**
 * Movie anime: search anime movies
 */
export const getMovieData = async (req: Request, res: Response) => {
  const page = (req.params.page as string) || (req.query.page as string) || '1';
  const pageNum = parseInt(page) || 1;
  const cacheKey = `movie_v2_${pageNum}`;

  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  try {
    const TARGET_URL = `/anime/search/movie`;
    console.log(`[API] Fetching Movies: ${TARGET_URL}`);

    const response = await apiClient.get(TARGET_URL);
    const rawList = response.data?.data?.animeList || [];

    const results = rawList.map((item: any) => ({
      title: item.title || '',
      title_short: item.title || '',
      slug: item.animeId || cleanSlug(item.href || ''),
      image: item.poster || '',
      status: item.status || 'Movie',
      episode: item.score ? `★ ${item.score}` : 'Movie',
      type: 'Movie',
      url: item.otakudesuUrl || item.href || ''
    }));

    const result = {
      pagination: {
        current_page: pageNum,
        next_page: null,
        prev_page: null,
        total_pages: 1
      },
      results
    };

    cache.set(cacheKey, result);
    return res.json(result);
  } catch (error: any) {
    console.error('[API ERROR] Movie:', error.message);
    return res.status(500).json({
      error: 'Gagal mengambil data anime movie.',
      message: error.message
    });
  }
};

/**
 * GET /anime/genre/:slug
 * Supports filtering by genre or status
 */
export const getFilterData = async (req: Request, res: Response) => {
  const page = (req.query.page as string) || '1';
  const pageNum = parseInt(page) || 1;

  let genreParam = req.params.slug || req.query.genre || req.query['genre[]'];
  if (Array.isArray(genreParam)) {
    genreParam = genreParam[0];
  }

  const statusParam = (req.query.status as string || '').toLowerCase();
  const genreSlug = cleanGenreSlug((genreParam as string) || '');

  const cacheKey = `filter_v2_${genreSlug}_${statusParam}_${pageNum}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  try {
    let TARGET_URL = '';

    if (genreSlug) {
      TARGET_URL = `/anime/genre/${genreSlug}?page=${pageNum}`;
    } else if (statusParam === 'completed') {
      TARGET_URL = `/anime/complete-anime?page=${pageNum}`;
    } else {
      TARGET_URL = `/anime/ongoing-anime?page=${pageNum}`;
    }

    console.log(`[API] Fetching Filter: ${TARGET_URL}`);

    const response = await apiClient.get(TARGET_URL);
    const rawList = response.data?.data?.animeList || [];
    const paginationRaw = response.data?.pagination || {};

    const results = rawList.map((item: any) => ({
      title: item.title || '',
      title_short: item.title || '',
      slug: item.animeId || cleanSlug(item.href || ''),
      image: item.poster || '',
      status: item.season || (item.score ? `★ ${item.score}` : 'Anime'),
      episode: typeof item.episodes === 'number' ? `${item.episodes} Ep` : (item.episodes || 'N/A'),
      type: 'TV',
      url: item.otakudesuUrl || item.href || '',
      studios: item.studios || '',
      genres: (item.genreList || []).map((g: any) => g.title || g)
    }));

    const result = {
      pagination: {
        current_page: paginationRaw.currentPage || pageNum,
        next_page: paginationRaw.hasNextPage ? paginationRaw.nextPage : null,
        prev_page: paginationRaw.hasPrevPage ? paginationRaw.prevPage : null,
        total_pages: paginationRaw.totalPages || null
      },
      results
    };

    cache.set(cacheKey, result);
    return res.json(result);
  } catch (error: any) {
    console.error('[API ERROR] Filter:', error.message);
    if (error.response?.status === 404) {
      return res.json({
        pagination: { current_page: pageNum, next_page: null, prev_page: null, total_pages: null },
        results: []
      });
    }
    return res.status(500).json({
      error: 'Gagal mengambil data filter anime.',
      message: error.message
    });
  }
};

/**
 * GET /anime/schedule
 */
export const getScheduleData = async (req: Request, res: Response) => {
  const cacheKey = 'schedule_v2';
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  try {
    const TARGET_URL = `/anime/schedule`;
    console.log(`[API] Fetching Schedule: ${TARGET_URL}`);

    const response = await apiClient.get(TARGET_URL);
    const data = response.data?.data || [];

    const result = {
      status: 'success',
      data
    };

    cache.set(cacheKey, result, 7200);
    return res.json(result);
  } catch (error: any) {
    console.error('[API ERROR] Schedule:', error.message);
    return res.status(500).json({
      error: 'Gagal mengambil jadwal anime.',
      message: error.message
    });
  }
};

/**
 * GET /anime/genre
 */
export const getGenresList = async (req: Request, res: Response) => {
  const cacheKey = 'genres_list_v2';
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  try {
    const TARGET_URL = `/anime/genre`;
    console.log(`[API] Fetching Genres: ${TARGET_URL}`);

    const response = await apiClient.get(TARGET_URL);
    const data = response.data?.data?.genreList || [];

    const result = {
      status: 'success',
      data
    };

    cache.set(cacheKey, result, 86400);
    return res.json(result);
  } catch (error: any) {
    console.error('[API ERROR] Genres:', error.message);
    return res.status(500).json({
      error: 'Gagal mengambil daftar genre anime.',
      message: error.message
    });
  }
};

/**
 * GET /anime/unlimited (A-Z Anime)
 */
export const getUnlimitedData = async (req: Request, res: Response) => {
  const cacheKey = 'unlimited_v2';
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  try {
    const TARGET_URL = `/anime/unlimited`;
    console.log(`[API] Fetching Unlimited A-Z: ${TARGET_URL}`);

    const response = await apiClient.get(TARGET_URL);
    const data = response.data?.data?.list || [];

    const result = {
      status: 'success',
      data
    };

    cache.set(cacheKey, result, 86400);
    return res.json(result);
  } catch (error: any) {
    console.error('[API ERROR] Unlimited:', error.message);
    return res.status(500).json({
      error: 'Gagal mengambil daftar semua anime.',
      message: error.message
    });
  }
};

/**
 * GET /anime/batch/:slug
 */
export const getBatchData = async (req: Request, res: Response) => {
  const slug = cleanSlug(req.params.slug as string);
  if (!slug) {
    return res.status(400).json({ error: 'Slug batch tidak boleh kosong.' });
  }

  const cacheKey = `batch_v2_${slug}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return res.json(cachedData);
  }

  try {
    const TARGET_URL = `/anime/batch/${slug}`;
    console.log(`[API] Fetching Batch: ${TARGET_URL}`);

    const response = await apiClient.get(TARGET_URL);
    const data = response.data?.data || null;

    const result = {
      status: 'success',
      data
    };

    cache.set(cacheKey, result, 7200);
    return res.json(result);
  } catch (error: any) {
    console.error('[API ERROR] Batch:', error.message);
    return res.status(error.response?.status || 500).json({
      error: 'Gagal mengambil data download batch anime.',
      message: error.message
    });
  }
};
