// HenVeronime frontend.
// Data halaman ditanam server di <script id="page-data"> — tidak ada fetch ke endpoint/API apa pun.

const PAGE = (() => {
  try {
    return JSON.parse(document.getElementById('page-data').textContent);
  } catch {
    return { page: 'error', status: 500, message: 'Halaman gagal dimuat.' };
  }
})();

// --- Helpers ---
const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC_MAP[c]);
const safeUrl = (u) => (/^https?:\/\//i.test(String(u || '')) ? esc(u) : '');
const enc = encodeURIComponent;
const $ = (id) => document.getElementById(id);

// --- Navigasi (semua berupa pindah halaman biasa) ---
function urlFor(pageId, subParam = null, extra = null) {
  switch (pageId) {
    case 'home':
      return '/';
    case 'genre':
      return subParam ? `/genre/${enc(subParam)}` : '/genre';
    case 'schedule':
      return '/schedule';
    case 'donation':
      return '/donasi';
    case 'detail':
      return `/anime/${enc(subParam)}`;
    case 'streaming':
      return `/watch/${enc(extra || subParam)}`;
    default:
      return '/';
  }
}

window.navigateTo = (pageId, subParam = null, extra = null) => {
  window.location.assign(urlFor(pageId, subParam, extra));
};

window.fetchListPage = (type) => {
  window.location.assign(`/list/${enc(type)}`);
};

window.goBack = () => {
  if (window.history.length > 1) history.back();
  else window.location.assign('/');
};

window.toggleSidebar = () => {
  const sidebar = $('sidebar');
  const overlay = $('sidebar-overlay');
  if (!sidebar || !overlay) return;
  const isOpen = !sidebar.classList.contains('translate-x-full');
  sidebar.classList.toggle('translate-x-full', isOpen);
  overlay.classList.toggle('hidden', isOpen);
};

// --- Tampilan umum ---
function showPage(pageId) {
  document.querySelectorAll('.page-container').forEach((p) => p.classList.add('hidden'));
  const target = $(`page-${pageId}`);
  if (target) target.classList.remove('hidden');

  const hero = $('hero-slider');
  const search = $('search-container');
  const stats = $('site-stats');
  const showHero = pageId === 'home';
  const showSearch = !['detail', 'streaming', 'genre', 'donation'].includes(pageId);
  if (hero) hero.classList.toggle('hidden', !showHero);
  if (stats) stats.classList.toggle('hidden', !showHero);
  if (search) search.classList.toggle('hidden', !showSearch);
}

const emptyState = (text) =>
  `<div class="col-span-full text-center py-20 font-bold text-gray-400 italic">${text}</div>`;

function renderError(container, message) {
  container.innerHTML = `
    <div class="col-span-full text-center py-12">
      <p class="text-xl font-bold text-red-500">${esc(message)}</p>
      <a href="/" class="inline-block mt-4 sketch-button bg-white">Kembali ke Beranda</a>
    </div>
  `;
}

// --- Kartu anime & pagination ---
function renderAnimeList(list, container) {
  container.innerHTML = '';
  list.forEach((anime) => {
    if (!anime.slug) return;
    const card = document.createElement('a');
    card.href = `/anime/${enc(anime.slug)}`;
    card.className = 'block group relative bg-white sketch-border overflow-hidden cursor-pointer';
    card.innerHTML = `
      <div class="aspect-[3/4] overflow-hidden relative">
        <img src="${safeUrl(anime.image)}" alt="${esc(anime.title)}" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerpolicy="no-referrer" />
        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div class="w-12 h-12 bg-[#ec4899] border-2 border-black rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>
        <div class="absolute top-2 left-2 flex flex-col gap-1">
          <span class="bg-[#3b82f6] text-white text-[8px] font-bold px-1.5 py-0.5 border border-black rounded shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">${esc(anime.episode)}</span>
          <span class="bg-yellow-400 text-black text-[8px] font-bold px-1.5 py-0.5 border border-black rounded shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">${esc(anime.type)}</span>
        </div>
      </div>
      <div class="p-3 border-t-4 border-black">
        <h3 class="font-bold text-sm line-clamp-2 leading-tight group-hover:text-[#3b82f6] transition-colors">${esc(anime.title)}</h3>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderPagination(pagination, containerId, hrefFor) {
  const container = $(containerId);
  if (!container) return;
  container.innerHTML = '';
  if (!pagination) return;

  const { current_page, next_page, prev_page, total_pages } = pagination;
  const curr = parseInt(current_page, 10) || 1;
  const total = total_pages ? parseInt(total_pages, 10) : 0;

  const base = 'px-4 py-2 border-2 border-black font-bold rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-sm transition-all';
  const link = (p, text, cls) => `<a href="${esc(hrefFor(p))}" class="${cls}">${text}</a>`;
  const num = (p) =>
    p === curr
      ? `<span class="px-4 py-2 bg-yellow-400 border-2 border-black font-bold rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] z-10">${p}</span>`
      : link(p, p, `${base} bg-white hover:bg-gray-50 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none`);
  const dots = '<span class="px-1 font-bold">...</span>';

  let html = '';
  if (prev_page) html += link(curr - 1, 'Sebelumnya', `${base} bg-[#ec4899] text-white hover:bg-[#db2777]`);

  if (total > 0) {
    let start = Math.max(1, curr - 1);
    let end = Math.min(total, curr + 1);
    if (curr === 1) end = Math.min(total, 3);
    if (total > 1 && curr === total) start = Math.max(1, total - 2);

    if (start > 1) {
      html += num(1);
      if (start > 2) html += dots;
    }
    for (let i = start; i <= end; i++) html += num(i);
    if (end < total) {
      if (end < total - 1) html += dots;
      html += num(total);
    }
  } else {
    for (let i = Math.max(1, curr - 1); i <= (next_page ? curr + 1 : curr); i++) html += num(i);
  }

  if (next_page) html += link(curr + 1, 'Selanjutnya', `${base} bg-[#3b82f6] text-white hover:bg-[#2563eb]`);

  container.innerHTML = `<div class="flex flex-wrap justify-center items-center gap-2 md:gap-3">${html}</div>`;
}

// --- Kutipan ---
let quotes = [];
let quoteIndex = 0;

function renderQuote() {
  const quoteEl = $('anime-quote');
  const authorEl = $('quote-author');
  const containerEl = $('quote-container');
  if (!quoteEl || !authorEl || !containerEl || quotes.length === 0) return;

  containerEl.style.opacity = '0';
  containerEl.style.transform = 'translateY(10px)';
  setTimeout(() => {
    const current = quotes[quoteIndex];
    quoteEl.textContent = `"${current.quot}"`;
    authorEl.textContent = `— ${current.nama}`;
    containerEl.style.opacity = '1';
    containerEl.style.transform = 'translateY(0)';
  }, 400);
}

window.nextQuote = () => {
  quoteIndex = (quoteIndex + 1) % quotes.length;
  renderQuote();
};
window.prevQuote = () => {
  quoteIndex = (quoteIndex - 1 + quotes.length) % quotes.length;
  renderQuote();
};

// --- Halaman: Beranda ---
function renderHome() {
  const grid = $('home-grid');
  if (PAGE.results && PAGE.results.length > 0) {
    renderAnimeList(PAGE.results, grid);
    renderPagination(PAGE.pagination, 'home-pagination', (p) => (p > 1 ? `/?page=${p}` : '/'));
  } else {
    grid.innerHTML = `
      <div class="col-span-full text-center py-20">
        <div class="bg-white sketch-border p-8 border-4 border-black inline-block">
          <h3 class="text-2xl font-bold mb-2">Belum Ada Data</h3>
          <p class="text-gray-500 font-bold italic">Latest release tidak ditemukan.</p>
        </div>
      </div>`;
  }

  quotes = Array.isArray(PAGE.quotes) ? PAGE.quotes : [];
  if (quotes.length) {
    quoteIndex = Math.floor(Math.random() * quotes.length);
    renderQuote();
  }
}

// --- Halaman: Daftar kategori / pencarian ---
function renderList() {
  const titleEl = $('list-title');
  const grid = $('list-grid');
  if (titleEl) titleEl.textContent = PAGE.title || 'Daftar Anime';

  if (PAGE.results && PAGE.results.length > 0) {
    renderAnimeList(PAGE.results, grid);
    if (PAGE.kind === 'category') {
      renderPagination(PAGE.pagination, 'list-pagination', (p) => `/list/${enc(PAGE.type)}?page=${p}`);
    }
  } else if (PAGE.kind === 'search') {
    grid.innerHTML = emptyState(`Anime "${esc(PAGE.query)}" tidak ditemukan.`);
  } else {
    grid.innerHTML = emptyState('Tidak ada anime ditemukan dalam kategori ini.');
  }
}

// --- Halaman: Genre ---
function renderGenre() {
  const container = $('genres-container');
  const genres = Array.isArray(PAGE.genres) ? PAGE.genres : [];
  const selected = PAGE.selected;

  if (genres.length === 0) {
    container.innerHTML = '<div class="col-span-full text-center py-6 font-bold text-gray-400 italic">Daftar genre tidak tersedia.</div>';
  } else {
    container.innerHTML = genres
      .map((g) => {
        const on = selected && selected.slug.toLowerCase() === g.genreId.toLowerCase();
        return `
        <a href="/genre/${enc(g.genreId)}"
          class="genre-chip p-3 border-2 border-black rounded-xl font-bold text-xs md:text-sm text-left flex items-center justify-between transition-all cursor-pointer ${
            on ? 'bg-[#ec4899] text-white shadow-[3px_3px_0px_0px_black]' : 'bg-white hover:bg-yellow-300 text-black shadow-[2px_2px_0px_0px_black]'
          }">
          <span class="truncate">${esc(g.title)}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="opacity-70"><path d="m9 18 6-6-6-6"/></svg>
        </a>`;
      })
      .join('');
  }

  if (!selected) return;

  const results = $('genre-results-container');
  results.classList.remove('hidden');
  $('genre-results-title').innerHTML = `Anime Genre: <span class="text-[#ec4899]">${esc(selected.title)}</span>`;

  const grid = $('genre-grid');
  if (PAGE.results && PAGE.results.length > 0) {
    renderAnimeList(PAGE.results, grid);
    renderPagination(PAGE.pagination, 'genre-pagination', (p) => `/genre/${enc(selected.slug)}?page=${p}`);
  } else {
    grid.innerHTML = '<div class="col-span-full text-center py-16 font-bold text-gray-400 italic">Tidak ada anime ditemukan untuk genre ini.</div>';
  }
  setTimeout(() => results.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
}

window.scrollToGenreTop = () => {
  const el = $('page-genre');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
  else window.scrollTo({ top: 0, behavior: 'smooth' });
};

// --- Halaman: Jadwal ---
function renderSchedule(day = null) {
  const grid = $('schedule-grid');
  const days = Array.isArray(PAGE.days) ? PAGE.days.filter((d) => d.day) : [];
  if (days.length === 0) {
    grid.innerHTML = '<div class="col-span-full text-center py-10 font-bold text-gray-400 italic">Jadwal rilis anime belum tersedia.</div>';
    return;
  }

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const today = dayNames[new Date().getDay()];
  const wanted = (day || today).toLowerCase();
  const active = days.find((d) => d.day.toLowerCase() === wanted) || days[0];

  grid.innerHTML = `
    <div class="col-span-full mb-6">
      <div class="flex flex-wrap gap-2 justify-center">
        ${days
          .map(
            (d) => `
          <button type="button" data-day="${esc(d.day)}"
            class="schedule-day px-4 py-2 rounded-xl font-bold text-xs border-2 border-black transition-all ${
              d.day === active.day ? 'bg-yellow-400 shadow-[3px_3px_0px_0px_black]' : 'bg-white hover:bg-gray-100 shadow-[2px_2px_0px_0px_black]'
            }">${esc(d.day)} (${(d.anime || []).length})</button>`
          )
          .join('')}
      </div>
    </div>`;

  const cards = document.createElement('div');
  cards.className = 'col-span-full grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-6';
  renderAnimeList(
    (active.anime || []).map((a) => ({ title: a.title, image: a.image, slug: a.slug, episode: 'Rilis Hari Ini', type: 'TV' })),
    cards
  );
  grid.appendChild(cards);

  grid.querySelectorAll('.schedule-day').forEach((btn) =>
    btn.addEventListener('click', () => renderSchedule(btn.dataset.day))
  );
}

// --- Halaman: Detail anime ---
function renderDetail() {
  const container = $('detail-content');
  const { detail, episodes = [] } = PAGE;
  if (!detail) return renderError(container, 'Data detail tidak lengkap.');

  const genres = (detail.genres || [])
    .map(
      (g) => `
      <a href="/genre/${enc(g.slug)}"
        class="px-3 py-1 bg-yellow-300 border-2 border-black rounded-lg font-bold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-400 active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer">${esc(g.name)}</a>`
    )
    .join('');

  const eps = episodes.length
    ? episodes
        .filter((ep) => ep.slug)
        .map(
          (ep) => `
      <a href="/watch/${enc(ep.slug)}" class="p-3 border-2 border-black rounded-xl font-bold text-sm bg-gray-50 hover:bg-[#3b82f6] hover:text-white cursor-pointer transition-colors flex justify-between items-center group">
        <span class="line-clamp-1">${esc(ep.title)}</span>
        <div class="w-6 h-6 flex items-center justify-center bg-white border-2 border-black rounded-md group-hover:bg-yellow-400 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="black" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </div>
      </a>`
        )
        .join('')
    : '<p class="col-span-full italic text-gray-400 font-bold">Belum ada episode tersedia.</p>';

  container.innerHTML = `
    <div class="space-y-8">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="md:col-span-1">
          <div class="bg-white sketch-border overflow-hidden border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <img src="${safeUrl(detail.thumbnail)}" alt="${esc(detail.title)}" class="w-full object-cover" referrerpolicy="no-referrer" />
          </div>
        </div>
        <div class="md:col-span-2 space-y-4">
          <h1 class="text-4xl font-extrabold leading-tight">${esc(detail.title) || 'Unknown Title'}</h1>
          <p class="text-gray-500 font-bold italic">${esc(detail.alter_title)}</p>
          <div class="flex flex-wrap gap-2 py-2">${genres}</div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm font-bold">
            <div class="p-3 bg-white border-2 border-black rounded-xl"><span class="text-gray-400 block pb-1">Status</span><span class="text-[#3b82f6]">${esc(detail.status)}</span></div>
            <div class="p-3 bg-white border-2 border-black rounded-xl"><span class="text-gray-400 block pb-1">Rating</span><span class="text-orange-500">${esc(detail.rating)}</span></div>
            <div class="p-3 bg-white border-2 border-black rounded-xl"><span class="text-gray-400 block pb-1">Tipe</span><span>${esc(detail.type)}</span></div>
            <div class="p-3 bg-white border-2 border-black rounded-xl overflow-hidden"><span class="text-gray-400 block pb-1">Studio</span><span class="truncate block">${esc(detail.studio) || 'N/A'}</span></div>
          </div>
        </div>
      </div>

      <div class="bg-white border-4 border-black p-6 sketch-border shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <h3 class="text-xl font-bold mb-4 border-b-2 border-black pb-2">Synopsis</h3>
        <p class="leading-relaxed text-gray-700 whitespace-pre-line">${esc(detail.synopsis)}</p>
      </div>

      <div class="bg-white border-4 border-black p-6 sketch-border">
        <h3 class="text-xl font-bold mb-4 border-b-2 border-black pb-2">Daftar Episode</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">${eps}</div>
      </div>

      <div class="flex justify-center pb-8">
        <button onclick="goBack()" class="px-6 py-2 bg-[#ec4899] text-white border-4 border-black rounded-xl font-bold uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] text-xs">Kembali</button>
      </div>
    </div>`;
}

// --- Halaman: Streaming ---
const safeKey = (title, idx, prefix) => (title || `${prefix}_${idx}`).replace(/[^a-zA-Z0-9]/g, '_') + `_${idx}`;

function toggleGroup(kind, key, onCls, offCls) {
  const list = $(`${kind}-list-${key}`);
  if (!list) return;
  const wasHidden = list.classList.contains('hidden');
  document.querySelectorAll(`.${kind}-quality-list`).forEach((el) => el.classList.add('hidden'));
  document.querySelectorAll(`.${kind}-quality-icon`).forEach((el) => el.classList.remove('rotate-180'));
  document.querySelectorAll(`.${kind}-tab-btn`).forEach((el) => {
    el.classList.remove(...onCls);
    el.classList.add(...offCls);
  });
  if (wasHidden) {
    list.classList.remove('hidden');
    const icon = $(`${kind}-icon-${key}`);
    const btn = $(`${kind}-tab-btn-${key}`);
    if (icon) icon.classList.add('rotate-180');
    if (btn) {
      btn.classList.remove(...offCls);
      btn.classList.add(...onCls);
    }
  }
}

window.toggleServerQuality = (key) =>
  toggleGroup('server', key, ['bg-yellow-400', 'shadow-[3px_3px_0px_0px_black]'], ['bg-white', 'shadow-[2px_2px_0px_0px_black]']);
window.toggleDownloadQuality = (key) =>
  toggleGroup('dl', key, ['bg-blue-400', 'text-white', 'shadow-[3px_3px_0px_0px_black]'], ['bg-white', 'text-black', 'shadow-[2px_2px_0px_0px_black]']);

function renderStreaming() {
  const container = $('streaming-content');
  const { detail, episodes = [], iframe, servers = [], downloadUrls = [], navigation = {}, slug, activeServer } = PAGE;

  if (!detail) return renderError(container, 'Data episode tidak lengkap.');
  if (!iframe) return renderError(container, 'Video belum tersedia untuk episode ini.');

  const active = episodes.find((ep) => ep.selected);
  let episodeDisplay = '';
  if (active) {
    const info = active.episode_info || '';
    const title = active.title || '';
    episodeDisplay = info && title && !title.includes(info) ? `${info}: ${title}` : info || title;
  }

  addToHistory({
    title: detail.series_title,
    slug: detail.anime_slug || String(slug).split('-episode-')[0],
    thumbnail: detail.thumbnail,
    episodeSlug: slug,
    episodeTitle: episodeDisplay,
  });

  const navBtn = (id, label, primary, arrowLeft) => {
    if (!id) return '<div></div>';
    const cls = primary
      ? 'bg-[#3b82f6] text-white hover:bg-blue-600'
      : 'bg-white hover:bg-gray-100';
    const left = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
    const right = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
    return `<a href="/watch/${enc(id)}" class="px-4 py-2 ${cls} border-2 border-black rounded-xl font-bold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center gap-1.5">${arrowLeft ? left : ''}<span>${label}</span>${arrowLeft ? '' : right}</a>`;
  };

  const activeQualityIdx = servers.findIndex((q) => (q.serverList || []).some((s) => s.serverId === activeServer));

  const serverBlock = servers.length
    ? `
    <div class="bg-white border-2 border-black rounded-xl p-4 sketch-border space-y-3">
      <div class="flex items-center justify-between">
        <span class="font-bold text-xs text-gray-500 uppercase tracking-wider">Pilih Server Streaming:</span>
        <span class="text-[10px] text-gray-400 font-bold italic">Klik resolusi untuk memilih server</span>
      </div>
      <div class="flex flex-wrap gap-2.5">
        ${servers
          .map((q, idx) => {
            const key = safeKey(q.title, idx, 'q');
            const on = idx === activeQualityIdx;
            return `
          <button type="button" id="server-tab-btn-${key}" onclick="toggleServerQuality('${key}')"
            class="server-tab-btn px-4 py-2 ${on ? 'bg-yellow-400 shadow-[3px_3px_0px_0px_black]' : 'bg-white shadow-[2px_2px_0px_0px_black]'} hover:bg-yellow-50 border-2 border-black rounded-xl text-xs font-bold transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1.5">
            <span>${esc(q.title)}</span>
            <span class="text-[10px] px-1.5 bg-gray-100 rounded border border-black/30 text-gray-600">${(q.serverList || []).length}</span>
            <svg id="server-icon-${key}" class="server-quality-icon w-3.5 h-3.5 transition-transform duration-200 ${on ? 'rotate-180' : ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>`;
          })
          .join('')}
      </div>
      <div class="space-y-2 pt-1">
        ${servers
          .map((q, idx) => {
            const key = safeKey(q.title, idx, 'q');
            const list = q.serverList || [];
            return `
          <div id="server-list-${key}" class="server-quality-list ${idx === activeQualityIdx ? '' : 'hidden'} p-3 bg-gray-50 border-2 border-dashed border-black/40 rounded-xl space-y-2">
            <div class="flex items-center justify-between text-[11px] font-bold text-gray-600">
              <span>Server Tersedia (${esc(q.title)}):</span>
              <span class="text-[10px] text-gray-400">Klik server untuk memutar</span>
            </div>
            <div class="flex flex-wrap gap-2">
              ${
                list.length
                  ? list
                      .filter((s) => s.serverId)
                      .map(
                        (s) => `
                <a href="/watch/${enc(slug)}?server=${enc(s.serverId)}"
                  class="server-btn px-3 py-1.5 ${s.serverId === activeServer ? 'bg-yellow-400' : 'bg-gray-100'} hover:bg-yellow-300 border-2 border-black rounded-lg text-xs font-bold transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1.5 capitalize">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  <span>${esc(s.title)}</span>
                </a>`
                      )
                      .join('')
                  : '<p class="text-xs italic text-gray-400 font-bold py-1">Tidak ada server streaming pada resolusi ini.</p>'
              }
            </div>
          </div>`;
          })
          .join('')}
      </div>
    </div>`
    : '';

  const downloadBlock = downloadUrls.length
    ? `
    <div class="bg-white border-2 border-black rounded-xl p-4 sketch-border space-y-3">
      <div class="flex items-center justify-between">
        <span class="font-bold text-xs text-gray-500 uppercase tracking-wider">Download Episode:</span>
        <span class="text-[10px] text-gray-400 font-bold italic">Simpan video untuk offline</span>
      </div>
      <div class="flex flex-wrap gap-2.5">
        ${downloadUrls
          .map((dl, idx) => {
            const key = safeKey(dl.title, idx, 'dl');
            return `
          <button type="button" id="dl-tab-btn-${key}" onclick="toggleDownloadQuality('${key}')"
            class="dl-tab-btn px-4 py-2 bg-white hover:bg-blue-50 border-2 border-black rounded-xl text-xs font-bold transition-all shadow-[2px_2px_0px_0px_black] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1.5">
            <span>${esc(dl.title)}</span>
            ${dl.size ? `<span class="text-[10px] text-gray-500 font-normal">(${esc(dl.size)})</span>` : ''}
            <svg id="dl-icon-${key}" class="dl-quality-icon w-3.5 h-3.5 transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>`;
          })
          .join('')}
      </div>
      <div class="space-y-2 pt-1">
        ${downloadUrls
          .map((dl, idx) => {
            const key = safeKey(dl.title, idx, 'dl');
            const urls = (dl.urls || []).filter((u) => safeUrl(u.url));
            return `
          <div id="dl-list-${key}" class="dl-quality-list hidden p-3 bg-gray-50 border-2 border-dashed border-black/40 rounded-xl space-y-2">
            <div class="text-[11px] font-bold text-gray-600">Link Unduhan (${esc(dl.title)}${dl.size ? ` - ${esc(dl.size)}` : ''}):</div>
            <div class="flex flex-wrap gap-2">
              ${
                urls.length
                  ? urls
                      .map(
                        (u) => `
                <a href="${safeUrl(u.url)}" target="_blank" rel="noopener noreferrer"
                  class="px-3 py-1.5 bg-white hover:bg-emerald-300 border-2 border-black rounded-lg text-xs font-bold transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1.5">
                  <span>${esc(u.title)}</span>
                </a>`
                      )
                      .join('')
                  : '<p class="text-xs italic text-gray-400 font-bold py-1">Tidak ada link unduhan tersedia.</p>'
              }
            </div>
          </div>`;
          })
          .join('')}
      </div>
    </div>`
    : '';

  const episodeList = episodes
    .filter((ep) => ep.slug)
    .map(
      (ep) => `
      <a href="/watch/${enc(ep.slug)}"
        class="flex items-center gap-3 p-3 border-2 border-black rounded-xl cursor-pointer transition-all hover:translate-x-1 ${ep.selected ? 'bg-[#3b82f6] text-white' : 'bg-white hover:bg-gray-50'}"
        style="box-shadow: ${ep.selected ? '4px 4px' : '2px 2px'} 0px 0px black;">
        <div class="w-12 h-12 shrink-0 border-2 border-black rounded-lg overflow-hidden flex-none">
          <img src="${safeUrl(ep.image)}" class="w-full h-full object-cover" referrerpolicy="no-referrer" loading="lazy">
        </div>
        <div class="text-left overflow-hidden">
          <p class="font-bold text-xs truncate">${esc(ep.title)}</p>
          <p class="text-[10px] opacity-70">${esc(ep.episode_info)}</p>
        </div>
      </a>`
    )
    .join('');

  container.innerHTML = `
    <div class="space-y-6">
      <div class="flex items-center gap-3">
        <button onclick="goBack()" class="p-2 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div class="overflow-hidden flex-1">
          <h2 class="text-xl md:text-2xl font-bold truncate">${esc(detail.series_title)}</h2>
          ${
            episodeDisplay
              ? `<p class="text-base text-[#ec4899] font-bold italic truncate flex items-center gap-2"><span class="w-1.5 h-1.5 bg-[#ec4899] rounded-full animate-pulse"></span>${esc(episodeDisplay)}</p>`
              : `<p class="text-xs text-gray-400 font-bold italic truncate font-sans">${esc(detail.alter_title)}</p>`
          }
        </div>
      </div>

      <div class="bg-black sketch-border overflow-hidden border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative aspect-video">
        <iframe id="streaming-iframe" src="${safeUrl(iframe)}" class="absolute inset-0 w-full h-full border-0" allowfullscreen referrerpolicy="no-referrer"></iframe>
      </div>

      <div class="flex justify-between items-center gap-3">
        ${navBtn(navigation.prev, 'Eps Sebelumnya', false, true)}
        ${navBtn(navigation.next, 'Eps Selanjutnya', true, false)}
      </div>

      ${serverBlock}
      ${downloadBlock}

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white border-4 border-black p-6 sketch-border">
            <div class="flex flex-col md:flex-row gap-6">
              <div class="w-32 h-44 shrink-0 border-2 border-black rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <img src="${safeUrl(detail.thumbnail)}" class="w-full h-full object-cover" referrerpolicy="no-referrer">
              </div>
              <div class="flex-1 space-y-3">
                <div class="flex flex-wrap gap-2">
                  ${(detail.genres || []).map((g) => `<span class="px-2 py-1 bg-gray-100 border-2 border-black rounded-lg text-[10px] font-bold">${esc(g.name)}</span>`).join('')}
                </div>
                <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] font-bold">
                  <p><span class="text-gray-400 uppercase">Status:</span> ${esc(detail.status)}</p>
                  <p><span class="text-gray-400 uppercase">Type:</span> ${esc(detail.type)}</p>
                  <p><span class="text-gray-400 uppercase">Studio:</span> ${esc(detail.studio)}</p>
                  <p><span class="text-gray-400 uppercase">Season:</span> ${esc(detail.season)}</p>
                  <p><span class="text-gray-400 uppercase">Rating:</span> <span class="text-orange-500">⭐ ${esc(detail.rating)}</span></p>
                </div>
              </div>
            </div>
            <div class="mt-6 pt-6 border-t-2 border-dashed border-black">
              <h4 class="font-bold mb-2">Sinopsis</h4>
              <p class="text-sm text-gray-700 leading-relaxed whitespace-pre-line">${esc(detail.description)}</p>
            </div>
          </div>
        </div>
        <div class="space-y-4">
          <h3 class="text-lg font-bold p-2 bg-yellow-400 border-2 border-black rounded-lg inline-block rotate-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">Episode Lainnya</h3>
          <div class="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">${episodeList}</div>
        </div>
      </div>
    </div>`;
}

// --- Sidebar & akordion ---
window.toggleAccordion = (id) => {
  const content = $(id);
  const icon = $(`${id}-icon`);
  if (!content) return;

  document.querySelectorAll('[id^="acc-"]:not([id$="-icon"])').forEach((acc) => {
    if (acc.id !== id) {
      acc.style.maxHeight = null;
      const other = $(`${acc.id}-icon`);
      if (other) other.style.transform = 'rotate(0deg)';
    }
  });

  if (content.style.maxHeight) {
    content.style.maxHeight = null;
    if (icon) icon.style.transform = 'rotate(0deg)';
  } else {
    content.style.maxHeight = content.scrollHeight + 'px';
    if (icon) icon.style.transform = 'rotate(180deg)';
  }
};

// --- Riwayat tontonan (tersimpan di browser) ---
const HISTORY_KEY = 'henveronime_history';

function readHistory() {
  try {
    const list = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function addToHistory(item) {
  try {
    let history = readHistory().filter((h) => h.slug !== item.slug);
    history.unshift({ ...item, timestamp: Date.now() });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
  } catch {
    /* penyimpanan tidak tersedia */
  }
  renderHistory();
}

window.clearHistory = () => {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    /* abaikan */
  }
  renderHistory();
};

function renderHistory() {
  const container = $('history-container');
  if (!container) return;
  const history = readHistory();

  if (history.length === 0) {
    container.innerHTML = '<p class="text-xs text-gray-400 italic font-bold text-center py-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">Belum ada riwayat...</p>';
    return;
  }

  container.innerHTML = history
    .map(
      (item) => `
    <a href="/watch/${enc(item.episodeSlug || '')}" class="group relative flex gap-3 p-2 border-2 border-black rounded-xl bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)] hover:bg-gray-50">
      <div class="relative w-16 h-20 shrink-0 border-2 border-black rounded-lg overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <img src="${safeUrl(item.thumbnail)}" class="w-full h-full object-cover" referrerpolicy="no-referrer">
      </div>
      <div class="flex-1 overflow-hidden flex flex-col justify-center">
        <h4 class="text-xs font-extrabold truncate mb-1" title="${esc(item.title)}">${esc(item.title)}</h4>
        <p class="text-[10px] text-[#ec4899] font-bold italic truncate flex items-center gap-1">
          <span class="w-1.5 h-1.5 bg-[#ec4899] rounded-full"></span>${esc(item.episodeTitle || 'Baru Saja')}
        </p>
      </div>
    </a>`
    )
    .join('');
}

// --- Si Meow (maskot) ---
function initMascot() {
  // --- Mascot Logic (Si Meow) ---
  const meowTips = [
    "Meow! Kamu bisa cari anime favoritmu lewat kolom pencarian di atas!",
    "Tahukah kamu? Kamu bisa melihat riwayat tontonanmu di menu samping!",
    "Meow! Jangan lupa dukung HenVeronime lewat menu Donasi ya!",
    "Lagi bingung mau nonton apa? Coba cek kategori Populer!",
    "Meow! Tetap semangat menjalani hari setelah nonton anime!",
    "Kenalin aku momoy, siap membantu kamu. Meow!",
    "Meow! Gunakan menu Genre untuk mencari anime sesuai seleramu!",
    "Klik aku untuk mendapatkan tips lainnya! Meow~"
  ];

  let meowTimeout;

  window.meowTalk = function(text = null) {
    const bubble = document.getElementById('meow-bubble');
    const textEl = document.getElementById('meow-text');
    
    if (!bubble || !textEl) return;
    
    clearTimeout(meowTimeout);
    
    const tip = text || meowTips[Math.floor(Math.random() * meowTips.length)];
    textEl.innerText = tip;
    
    bubble.classList.remove('hidden', 'opacity-0', 'speech-bubble-pop');
    void bubble.offsetWidth;
    bubble.classList.add('speech-bubble-pop');
    
    meowTimeout = setTimeout(() => {
      bubble.classList.add('opacity-0');
      setTimeout(() => bubble.classList.add('hidden'), 500);
    }, 6000);
  };

  // Auto meow after load
  setTimeout(() => {
    window.meowTalk("Meow! Selamat datang di HenVeronime! Selamat menonton!");
  }, 3000);

  // Random periodic meow
  setInterval(() => {
    if (Math.random() > 0.7) window.meowTalk();
  }, 60000);

  // --- Draggable Mascot Logic ---
  const mascot = document.getElementById('si-meow');
  const dragHandle = document.getElementById('mascot-drag-handle');
  let isDragging = false;
  let startX, startY;
  let currentX = 0, currentY = 0;
  let hasMoved = false;

  if (mascot && dragHandle) {
    const startDrag = (e) => {
      isDragging = true;
      hasMoved = false;
      
      const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
      const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
      
      startX = clientX - currentX;
      startY = clientY - currentY;
      
      mascot.classList.remove('transition-transform'); // Disable transitions while dragging
      dragHandle.style.cursor = 'grabbing';
    };

    const doDrag = (e) => {
      if (!isDragging) return;
      
      const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
      const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
      
      const dx = clientX - startX;
      const dy = clientY - startY;
      
      // Check if actually moved significantly to distinguish from click
      if (Math.abs(dx - currentX) > 5 || Math.abs(dy - currentY) > 5) {
        hasMoved = true;
      }
      
      currentX = dx;
      currentY = dy;
      
      mascot.style.transform = `translate(${currentX}px, ${currentY}px)`;
    };

    const stopDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      mascot.classList.add('transition-transform');
      dragHandle.style.cursor = 'grab';
    };

    dragHandle.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', doDrag);
    window.addEventListener('mouseup', stopDrag);

    dragHandle.addEventListener('touchstart', startDrag, { passive: false });
    window.addEventListener('touchmove', doDrag, { passive: false });
    window.addEventListener('touchend', stopDrag);

    // Patch meowTalk to not trigger if the mouse moved (it was a drag)
    const originalMeowTalk = window.meowTalk;
    window.meowTalk = function(text) {
      if (hasMoved) return; // Ignore clicks if we were dragging
      originalMeowTalk(text);
    };
  }
}

// --- Mulai ---
document.addEventListener('DOMContentLoaded', () => {
  renderHistory();

  const searchInput = $('search-input');
  const searchButton = $('search-button');
  const executeSearch = () => {
    const q = searchInput && searchInput.value.trim();
    if (q) window.location.assign(`/search?q=${enc(q)}`);
  };
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') executeSearch();
    });
    if (PAGE.page === 'list' && PAGE.kind === 'search') searchInput.value = PAGE.query || '';
  }
  if (searchButton) searchButton.addEventListener('click', executeSearch);

  const pageId = PAGE.page === 'error' ? 'error' : PAGE.page;
  showPage(pageId);

  switch (pageId) {
    case 'home':
      renderHome();
      break;
    case 'list':
      renderList();
      break;
    case 'genre':
      renderGenre();
      break;
    case 'schedule':
      renderSchedule();
      break;
    case 'detail':
      renderDetail();
      break;
    case 'streaming':
      renderStreaming();
      break;
    case 'error':
      renderError($('page-error'), PAGE.message || 'Terjadi kesalahan.');
      break;
    default:
      break;
  }

  initMascot();
});
