// --- Global State & Helpers ---
const dataCache = new Map();

async function fetchWithCache(url) {
  if (dataCache.has(url)) {
    console.log(`Frontend cache hit: ${url}`);
    return dataCache.get(url);
  }
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      const isHtml = text.trim().startsWith('<!doctype') || text.trim().startsWith('<html');
      console.error(`API Error on ${url}: ${response.status} ${text.substring(0, 100)}`);
      throw new Error(`HTTP error! status: ${response.status}${isHtml ? ' (Returned HTML/SPA Fallback)' : ''}`);
    }
    const data = await response.json();
    dataCache.set(url, data);
    return data;
  } catch (error) {
    console.error(`Fetch fail for ${url}:`, error);
    throw error;
  }
}

let animeQuotesData = [];
let currentQuoteIndex = 0;

async function fetchQuotes() {
  try {
    const response = await fetch('/api/quotes');
    animeQuotesData = await response.json();
    renderQuote();
  } catch (error) {
    console.error('Error fetching quotes:', error);
    // Fallback if fetch fails
    animeQuotesData = [{ nama: "System", quot: "Tetap semangat menonton anime!" }];
    renderQuote();
  }
}

function renderQuote() {
  const quoteEl = document.getElementById('anime-quote');
  const authorEl = document.getElementById('quote-author');
  const containerEl = document.getElementById('quote-container');
  
  if (!quoteEl || !authorEl || !containerEl || animeQuotesData.length === 0) return;
  
  // Slide animation (fade out, change, fade in)
  containerEl.style.opacity = '0';
  containerEl.style.transform = 'translateY(10px)';
  
  setTimeout(() => {
    const current = animeQuotesData[currentQuoteIndex];
    quoteEl.innerText = `"${current.quot}"`;
    authorEl.innerText = `— ${current.nama}`;
    
    containerEl.style.opacity = '1';
    containerEl.style.transform = 'translateY(0)';
  }, 400);
}

window.nextQuote = function() {
  currentQuoteIndex = (currentQuoteIndex + 1) % animeQuotesData.length;
  renderQuote();
};

window.prevQuote = function() {
  currentQuoteIndex = (currentQuoteIndex - 1 + animeQuotesData.length) % animeQuotesData.length;
  renderQuote();
};

// Initial random quote on load
function renderRandomQuote() {
  if (animeQuotesData.length === 0) {
    fetchQuotes();
  } else {
    currentQuoteIndex = Math.floor(Math.random() * animeQuotesData.length);
    renderQuote();
  }
}

let currentGenre = null;
let lastAnimeSlug = null;
let lastListState = {
  type: null,
  title: null,
  page: 1,
  query: null
};

function showLoading(container) {
  toggleFooter(false);
  container.innerHTML = `
    <div class="col-span-full flex flex-col justify-center items-center py-20">
      <div class="relative">
        <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="cat-doodle text-gray-800">
          <!-- Body -->
          <path d="M16 12c0 2.8-2.2 5-5 5s-5-2.2-5-5 2.2-5 5-5 5 2.2 5 5z" />
          <!-- Ears -->
          <path d="M7.5 8.5l-1.5-3 2.5 1M14.5 8.5l1.5-3-2.5 1" />
          <!-- Eyes -->
          <circle cx="9.5" cy="11.5" r="0.5" fill="currentColor"/>
          <circle cx="12.5" cy="11.5" r="0.5" fill="currentColor"/>
          <!-- Whiskers -->
          <path d="M16 12h2M16 13h1.5M6 12h-2M6 13h-1.5" />
          <!-- Tail -->
          <path d="M6 12c-2.5-1-4 1.5-4 3s2 4 4 2.5" class="cat-tail" />
          <!-- Small Feet -->
          <path d="M8 17v2M10 17v2M12 17v2M14 17v2" />
        </svg>
        <!-- Motion dust/speed lines -->
        <div class="absolute -left-4 top-1/2 w-3 h-0.5 bg-gray-300 opacity-50 animate-pulse"></div>
        <div class="absolute -left-6 top-1/3 w-2 h-0.5 bg-gray-300 opacity-50 animate-pulse" style="animation-delay: 0.2s"></div>
      </div>
      <p class="mt-4 font-bold text-gray-400 italic animate-pulse">Momoy lagi ngambil data... Meoww!</p>
    </div>
  `;
}

function showError(container, message = "Gagal memuat data :(") {
  toggleFooter(true);
  container.innerHTML = `
    <div class="col-span-full text-center py-12">
      <p class="text-xl font-bold text-red-500">${message}</p>
      <button onclick="location.reload()" class="mt-4 sketch-button">Coba Lagi</button>
    </div>
  `;
}

function toggleFooter(show) {
  const footer = document.getElementById('main-footer');
  if (footer) {
    if (show) {
      footer.classList.remove('hidden');
    } else {
      footer.classList.add('hidden');
    }
  }
}

// --- Navigation Logic ---
window.navigateTo = function(pageId, subParam = null, extraData = null) {
  // Push state to history
  history.pushState({ pageId, subParam, extraData }, "", "");
  navigateToInternal(pageId, subParam, extraData);
};

function navigateToInternal(pageId, subParam = null, extraData = null) {
  console.log(`Navigating to: ${pageId}`, { subParam, extraData });
  
  // Scroll to top
  window.scrollTo(0, 0);
  
  // Hide all pages
  document.querySelectorAll('.page-container').forEach(p => p.classList.add('hidden'));
  
  // Clear streaming player if moving away from streaming page to stop background audio/video
  if (pageId !== 'streaming') {
    const streamingContent = document.getElementById('streaming-content');
    if (streamingContent) streamingContent.innerHTML = '';
  }

  // Show target page
  const target = document.getElementById(`page-${pageId}`);
  if (target) {
    target.classList.remove('hidden');
  } else {
    console.error(`Target page not found: page-${pageId}`);
    return;
  }
  
  // Close sidebar if open
  const sidebar = document.getElementById('sidebar');
  if (sidebar && !sidebar.classList.contains('translate-x-full')) toggleSidebar();

  // Scroll to top
  window.scrollTo(0, 0);

  // Toggle Visibility of Hero, Stats, and Search based on page
  const hero = document.getElementById('hero-slider');
  const search = document.getElementById('search-container');
  const stats = document.getElementById('site-stats');

  toggleFooter(true);

  if (pageId === 'home') {
    if (hero) hero.classList.remove('hidden');
    if (search) search.classList.remove('hidden');
    if (stats) stats.classList.remove('hidden');
    window.loadHome();
  } else if (pageId === 'detail' || pageId === 'streaming' || pageId === 'genre' || pageId === 'donation') {
    if (hero) hero.classList.add('hidden');
    if (search) search.classList.add('hidden');
    if (stats) stats.classList.add('hidden');
  } else {
    if (hero) hero.classList.add('hidden');
    if (search) search.classList.remove('hidden');
    if (stats) stats.classList.add('hidden');
  }

  if (pageId === 'detail') lastAnimeSlug = subParam;

  if (pageId === 'genre') window.loadGenres(subParam, extraData);
  if (pageId === 'schedule') loadSchedule(subParam);
  if (pageId === 'detail') loadDetail(subParam);
  if (pageId === 'streaming') loadStreaming(extraData || subParam); 
  
  if (pageId === 'list' && extraData) {
    if (extraData.query) {
      window.loadSearch(extraData.query, extraData.page || 1, true);
    } else if (extraData.type) {
      window.fetchListPage(extraData.type, extraData.title, extraData.page || 1, true);
    }
  }
}

// Handle back button
window.onpopstate = (event) => {
  if (event.state) {
    const { pageId, subParam, extraData } = event.state;
    navigateToInternal(pageId, subParam, extraData);
  } else {
    navigateToInternal('home');
  }
};

window.toggleSidebar = function() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar || !overlay) return;

  const isOpen = !sidebar.classList.contains('translate-x-full');

  if (isOpen) {
    sidebar.classList.add('translate-x-full');
    overlay.classList.add('hidden');
  } else {
    sidebar.classList.remove('translate-x-full');
    overlay.classList.remove('hidden');
  }
};

window.goBack = function() {
  if (window.history.length > 1) {
    history.back();
  } else {
    navigateTo('home');
  }
};

// --- Empty Data View Renderers ---
window.loadHome = async function(page = 1) {
  // Clear list state when going back to home, so back from detail on home goes to home
  lastListState = { type: null, title: null, page: 1, query: null };

  const container = document.getElementById('home-grid');
  const paginationContainer = document.getElementById('home-pagination');
  showLoading(container);
  if (paginationContainer) paginationContainer.innerHTML = '';
  
  try {
    renderRandomQuote();
    const data = await fetchWithCache(`/api/home?page=${page}`);
    
    if (data.latest_release && data.latest_release.length > 0) {
      renderAnimeList(data.latest_release, container);
      renderPagination(data.pagination, 'home-pagination', (p) => window.loadHome(p));
    } else {
      toggleFooter(true);
      container.innerHTML = `
        <div class="col-span-full text-center py-20">
          <div class="bg-white sketch-border p-8 border-4 border-black inline-block">
            <h3 class="text-2xl font-bold mb-2">Belum Ada Data</h3>
            <p class="text-gray-500 font-bold italic">Latest release tidak ditemukan.</p>
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error('Fetch error:', error);
    showError(container, `Gagal terhubung ke Backend API. ${error.message || ''}`);
  }
}

function renderAnimeList(animeList, container) {
  toggleFooter(true);
  container.innerHTML = '';
  animeList.forEach(anime => {
    const card = document.createElement('div');
    card.className = 'group relative bg-white sketch-border overflow-hidden cursor-pointer';
    
    card.innerHTML = `
      <div class="aspect-[3/4] overflow-hidden relative">
        <img src="${anime.image}" alt="${anime.title_short}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" referrerpolicy="no-referrer" />
        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div class="w-12 h-12 bg-[#ec4899] border-2 border-black rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>
        <div class="absolute top-2 left-2 flex flex-col gap-1">
          <span class="bg-[#3b82f6] text-white text-[8px] font-bold px-1.5 py-0.5 border border-black rounded shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
            ${anime.episode}
          </span>
          <span class="bg-yellow-400 text-black text-[8px] font-bold px-1.5 py-0.5 border border-black rounded shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">${anime.type}</span>
        </div>
      </div>
      <div class="p-3 border-t-4 border-black">
        <h3 class="font-bold text-sm line-clamp-2 leading-tight group-hover:text-[#3b82f6] transition-colors">${anime.title_short}</h3>
      </div>
    `;
    
    card.onclick = () => {
      if (anime.slug) {
        navigateTo('detail', anime.slug);
      } else {
        console.warn('Anime slug is missing for card click');
      }
    };
    container.appendChild(card);
  });
}

function renderPagination(pagination, containerId, onClick) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  if (!pagination) return;
  
  const { current_page, next_page, prev_page, total_pages } = pagination;
  const curr = parseInt(current_page);
  const total = total_pages ? parseInt(total_pages) : 0;

  function createPageButton(p, text, isCurrent = false) {
    const btn = document.createElement('button');
    if (isCurrent) {
        btn.className = 'px-4 py-2 bg-yellow-400 border-2 border-black font-bold rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] z-10';
    } else {
        btn.className = 'px-4 py-2 bg-white border-2 border-black font-bold rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-sm';
    }
    btn.innerText = text || p;
    btn.onclick = () => onClick(p);
    return btn;
  }
  
  const wrapper = document.createElement('div');
  wrapper.className = 'flex flex-wrap justify-center items-center gap-2 md:gap-3';
  
  if (prev_page) {
    const btn = document.createElement('button');
    btn.className = 'px-4 py-2 bg-[#ec4899] text-white border-2 border-black font-bold rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-[#db2777] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-sm';
    btn.innerText = 'Sebelumnya';
    btn.onclick = () => onClick(curr - 1);
    wrapper.appendChild(btn);
  }

  // Calculate range of page numbers to show
  let startPage, endPage;
  if (total > 0) {
    startPage = Math.max(1, curr - 1);
    endPage = Math.min(total, curr + 1);
    
    // Adjust if at start or end
    if (curr === 1) endPage = Math.min(total, 3);
    if (total > 1 && curr === total) startPage = Math.max(1, total - 2);

    if (startPage > 1) {
      wrapper.appendChild(createPageButton(1));
      if (startPage > 2) {
        const dot = document.createElement('span');
        dot.className = 'px-1 font-bold';
        dot.innerText = '...';
        wrapper.appendChild(dot);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      wrapper.appendChild(createPageButton(i, null, i === curr));
    }

    if (endPage < total) {
      if (endPage < total - 1) {
        const dot = document.createElement('span');
        dot.className = 'px-1 font-bold';
        dot.innerText = '...';
        wrapper.appendChild(dot);
      }
      wrapper.appendChild(createPageButton(total));
    }
  } else {
    // If total unknown, show current and neighbors
    const rangeStart = Math.max(1, curr - 1);
    for (let i = rangeStart; i <= (next_page ? curr + 1 : curr); i++) {
      wrapper.appendChild(createPageButton(i, null, i === curr));
    }
  }
  
  if (next_page) {
    const btn = document.createElement('button');
    btn.className = 'px-4 py-2 bg-[#3b82f6] text-white border-2 border-black font-bold rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-[#2563eb] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all text-sm';
    btn.innerText = 'Selanjutnya';
    btn.onclick = () => onClick(curr + 1);
    wrapper.appendChild(btn);
  }

  container.appendChild(wrapper);
}

// --- Genre Page Logic ---
let cachedGenresList = null;
let activeGenreSlug = null;
let activeGenreTitle = null;

window.loadGenres = async function(selectedSlug = null, extraData = null) {
  const container = document.getElementById('genres-container');
  if (!container) return;

  try {
    if (!cachedGenresList) {
      container.innerHTML = `
        <div class="col-span-full py-8 text-center">
          <div class="inline-block w-8 h-8 border-4 border-black border-t-[#ec4899] rounded-full animate-spin"></div>
          <p class="mt-2 text-xs font-bold text-gray-500">Memuat daftar genre...</p>
        </div>
      `;
      const res = await fetchWithCache('/api/genre');
      cachedGenresList = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
    }

    if (!cachedGenresList || cachedGenresList.length === 0) {
      container.innerHTML = `<div class="col-span-full text-center py-6 font-bold text-gray-400 italic">Daftar genre tidak tersedia.</div>`;
      return;
    }

    // Determine target slug to highlight
    const targetSlug = selectedSlug || activeGenreSlug;

    // Render genre buttons
    container.innerHTML = cachedGenresList.map(g => {
      const isSelected = targetSlug && (g.genreId === targetSlug || g.title.toLowerCase() === targetSlug.toLowerCase());
      return `
        <button 
          id="genre-btn-${g.genreId}"
          onclick="window.selectGenre('${g.genreId}', '${g.title.replace(/'/g, "\\'")}')"
          class="genre-chip p-3 border-2 border-black rounded-xl font-bold text-xs md:text-sm text-left flex items-center justify-between transition-all cursor-pointer ${
            isSelected 
              ? 'bg-[#ec4899] text-white shadow-[3px_3px_0px_0px_black]' 
              : 'bg-white hover:bg-yellow-300 text-black shadow-[2px_2px_0px_0px_black]'
          }"
        >
          <span class="truncate">${g.title}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="opacity-70"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      `;
    }).join('');

    // If a slug is specified, load anime for that genre
    if (selectedSlug) {
      const genreObj = cachedGenresList.find(g => g.genreId === selectedSlug || g.title.toLowerCase() === selectedSlug.toLowerCase());
      const title = extraData?.title || genreObj?.title || selectedSlug;
      window.selectGenre(genreObj ? genreObj.genreId : selectedSlug, title, false);
    } else if (activeGenreSlug) {
      const resultsContainer = document.getElementById('genre-results-container');
      if (resultsContainer) resultsContainer.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Error loading genres:', err);
    container.innerHTML = `<div class="col-span-full text-center py-6 font-bold text-red-500">Gagal memuat daftar genre.</div>`;
  }
};

window.selectGenre = function(slug, title, doScroll = true) {
  activeGenreSlug = slug;
  activeGenreTitle = title || slug;

  document.querySelectorAll('.genre-chip').forEach(btn => {
    btn.classList.remove('bg-[#ec4899]', 'text-white', 'shadow-[3px_3px_0px_0px_black]');
    btn.classList.add('bg-white', 'text-black', 'shadow-[2px_2px_0px_0px_black]');
  });
  const activeBtn = document.getElementById(`genre-btn-${slug}`);
  if (activeBtn) {
    activeBtn.classList.remove('bg-white', 'text-black', 'shadow-[2px_2px_0px_0px_black]');
    activeBtn.classList.add('bg-[#ec4899]', 'text-white', 'shadow-[3px_3px_0px_0px_black]');
  }

  const resultsContainer = document.getElementById('genre-results-container');
  const resultsTitle = document.getElementById('genre-results-title');
  if (resultsContainer) resultsContainer.classList.remove('hidden');
  if (resultsTitle) resultsTitle.innerHTML = `Anime Genre: <span class="text-[#ec4899]">${activeGenreTitle}</span>`;

  window.loadGenreAnime(slug, 1, activeGenreTitle);

  if (doScroll && resultsContainer) {
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

window.loadGenreAnime = async function(genreSlug, page = 1, genreTitle = '') {
  const grid = document.getElementById('genre-grid');
  const pagContainer = document.getElementById('genre-pagination');
  if (!grid) return;

  showLoading(grid);
  if (pagContainer) pagContainer.innerHTML = '';

  try {
    const data = await fetchWithCache(`/api/genre/${genreSlug}?page=${page}`);
    toggleFooter(true);

    if (data.results && data.results.length > 0) {
      renderAnimeList(data.results, grid);
      renderPagination(data.pagination, 'genre-pagination', (p) => {
        window.loadGenreAnime(genreSlug, p, genreTitle);
        const resultsContainer = document.getElementById('genre-results-container');
        if (resultsContainer) resultsContainer.scrollIntoView({ behavior: 'smooth' });
      });
    } else {
      grid.innerHTML = `<div class="col-span-full text-center py-16 font-bold text-gray-400 italic">Tidak ada anime ditemukan untuk genre ini.</div>`;
    }
  } catch (err) {
    console.error('Error loading genre anime:', err);
    showError(grid, "Gagal memuat anime untuk genre ini.");
    toggleFooter(true);
  }
};

window.scrollToGenreTop = function() {
  const pageGenre = document.getElementById('page-genre');
  if (pageGenre) {
    pageGenre.scrollIntoView({ behavior: 'smooth' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

let scheduleDataCache = null;

window.loadSchedule = async function(day = null) {
  const grid = document.getElementById('schedule-grid');
  if (!grid) return;
  showLoading(grid);

  try {
    if (!scheduleDataCache) {
      const res = await fetchWithCache('/api/schedule');
      scheduleDataCache = Array.isArray(res) ? res : (res.data || []);
    }

    const days = scheduleDataCache;
    if (!days || days.length === 0) {
      toggleFooter(true);
      grid.innerHTML = `<div class="col-span-full text-center py-10 font-bold text-gray-400 italic">Jadwal rilis anime belum tersedia.</div>`;
      return;
    }

    // Determine current day in Indonesian name if no day provided
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const todayName = dayNames[new Date().getDay()];

    const currentDay = day || (days.some(d => d.day.toLowerCase() === todayName.toLowerCase()) ? todayName : days[0].day);
    const activeSchedule = days.find(d => d.day.toLowerCase() === currentDay.toLowerCase()) || days[0];

    toggleFooter(true);
    grid.innerHTML = `
      <div class="col-span-full mb-6">
        <div class="flex flex-wrap gap-2 justify-center">
          ${days.map(d => `
            <button 
              onclick="window.loadSchedule('${d.day}')" 
              class="px-4 py-2 rounded-xl font-bold text-xs border-2 border-black transition-all ${d.day.toLowerCase() === activeSchedule.day.toLowerCase() ? 'bg-yellow-400 shadow-[3px_3px_0px_0px_black]' : 'bg-white hover:bg-gray-100 shadow-[2px_2px_0px_0px_black]'}"
            >
              ${d.day} (${(d.anime_list || []).length})
            </button>
          `).join('')}
        </div>
      </div>
    `;

    const animeCardsContainer = document.createElement('div');
    animeCardsContainer.className = 'col-span-full grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-6';

    const mappedAnime = (activeSchedule.anime_list || []).map(item => ({
      title_short: item.title,
      image: item.poster,
      episode: 'Rilis Hari Ini',
      type: 'TV',
      slug: item.slug || (item.url ? item.url.replace('/anime/anime/', '').replace(/^\/+|\/+$/g, '') : '')
    }));

    renderAnimeList(mappedAnime, animeCardsContainer);
    grid.appendChild(animeCardsContainer);
  } catch (err) {
    console.error('Schedule error:', err);
    showError(grid, "Gagal memuat jadwal rilis anime.");
  }
};

window.searchByGenre = function(genre) {
  if (!genre) return;
  const slug = genre.toLowerCase().trim().replace(/\s+/g, '-');
  navigateTo('genre', slug, { title: genre });
};

async function loadDetail(slug) {
  const container = document.getElementById('detail-content');
  showLoading(container);
  
  try {
    const data = await fetchWithCache(`/api/anime/${slug}`);
    
    if (data.error) {
       showError(container, data.error);
       return;
    }
    
    const { detail, episodes: rawEpisodes } = data;
    const episodes = Array.isArray(rawEpisodes) ? rawEpisodes : [];
    
    if (!detail) {
      showError(container, "Data detail tidak lengkap.");
      return;
    }

    toggleFooter(true);
    container.innerHTML = `
      <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <!-- Header Section -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="md:col-span-1">
            <div class="bg-white sketch-border overflow-hidden border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <img src="${detail.thumbnail}" alt="${detail.title}" class="w-full object-cover" referrerpolicy="no-referrer" />
            </div>
          </div>
          
          <div class="md:col-span-2 space-y-4">
            <h1 class="text-4xl font-extrabold leading-tight">${detail.title || 'Unknown Title'}</h1>
            <p class="text-gray-500 font-bold italic">${detail.alter_title || ''}</p>
            
            <div class="flex flex-wrap gap-2 py-2">
              ${(detail.genres || []).map(g => {
                const genreName = typeof g === 'string' ? g : (g.name || g.title);
                return `
                  <button 
                    onclick="searchByGenre('${genreName}')"
                    class="px-3 py-1 bg-yellow-300 border-2 border-black rounded-lg font-bold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-400 active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
                  >
                    ${genreName}
                  </button>
                `;
              }).join('')}
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm font-bold">
              <div class="p-3 bg-white border-2 border-black rounded-xl">
                <span class="text-gray-400 block pb-1">Status</span>
                <span class="text-[#3b82f6]">${detail.status || 'Ongoing'}</span>
              </div>
              <div class="p-3 bg-white border-2 border-black rounded-xl">
                <span class="text-gray-400 block pb-1">Rating</span>
                <span class="text-orange-500">${detail.rating || 'N/A'}</span>
              </div>
              <div class="p-3 bg-white border-2 border-black rounded-xl">
                <span class="text-gray-400 block pb-1">Tipe</span>
                <span>${detail.type || 'TV'}</span>
              </div>
              <div class="p-3 bg-white border-2 border-black rounded-xl overflow-hidden">
                <span class="text-gray-400 block pb-1">Studio</span>
                <span class="truncate block">${detail.studio || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Synopsis -->
        <div class="bg-white border-4 border-black p-6 sketch-border shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h3 class="text-xl font-bold mb-4 border-b-2 border-black pb-2">Synopsis</h3>
          <p class="leading-relaxed text-gray-700 whitespace-pre-line">${detail.synopsis || 'Tidak ada sinopsis tersedia.'}</p>
        </div>

        <!-- Episodes -->
        <div class="bg-white border-4 border-black p-6 sketch-border">
          <h3 class="text-xl font-bold mb-4 border-b-2 border-black pb-2">Daftar Episode</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            ${episodes.length > 0 ? episodes.map(ep => `
              <div onclick="navigateTo('streaming', null, '${ep.slug}')" class="p-3 border-2 border-black rounded-xl font-bold text-sm bg-gray-50 hover:bg-[#3b82f6] hover:text-white cursor-pointer transition-colors flex justify-between items-center group">
                <span class="line-clamp-1">${ep.title}</span>
                <div class="w-6 h-6 flex items-center justify-center bg-white border-2 border-black rounded-md group-hover:bg-yellow-400 transition-colors">
                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="black" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
              </div>
            `).join('') : '<p class="col-span-full italic text-gray-400 font-bold">Belum ada episode tersedia.</p>'}
          </div>
        </div>
        
        <div class="flex justify-center pb-8">
           <button onclick="goBack()" class="px-6 py-2 bg-[#ec4899] text-white border-4 border-black rounded-xl font-bold uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] text-xs">
             Kembali
           </button>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Fetch detail error:', error);
    showError(container, "Gagal memuat detail anime.");
  }
}

window.toggleServerQuality = function(qualityKey) {
  const listEl = document.getElementById(`server-list-${qualityKey}`);
  const iconEl = document.getElementById(`server-icon-${qualityKey}`);
  const btnEl = document.getElementById(`server-tab-btn-${qualityKey}`);
  if (!listEl) return;

  const isHidden = listEl.classList.contains('hidden');

  // Close all other quality lists for accordion behavior
  document.querySelectorAll('.server-quality-list').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.server-quality-icon').forEach(el => {
    el.classList.remove('rotate-180');
  });
  document.querySelectorAll('.server-tab-btn').forEach(el => {
    el.classList.remove('bg-yellow-400', 'shadow-[3px_3px_0px_0px_black]');
    el.classList.add('bg-white', 'shadow-[2px_2px_0px_0px_black]');
  });

  if (isHidden) {
    listEl.classList.remove('hidden');
    if (iconEl) iconEl.classList.add('rotate-180');
    if (btnEl) {
      btnEl.classList.remove('bg-white', 'shadow-[2px_2px_0px_0px_black]');
      btnEl.classList.add('bg-yellow-400', 'shadow-[3px_3px_0px_0px_black]');
    }
  }
};

window.toggleDownloadQuality = function(dlKey) {
  const listEl = document.getElementById(`dl-list-${dlKey}`);
  const iconEl = document.getElementById(`dl-icon-${dlKey}`);
  const btnEl = document.getElementById(`dl-tab-btn-${dlKey}`);
  if (!listEl) return;

  const isHidden = listEl.classList.contains('hidden');

  document.querySelectorAll('.dl-quality-list').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.dl-quality-icon').forEach(el => el.classList.remove('rotate-180'));
  document.querySelectorAll('.dl-tab-btn').forEach(el => {
    el.classList.remove('bg-blue-400', 'text-white', 'shadow-[3px_3px_0px_0px_black]');
    el.classList.add('bg-white', 'text-black', 'shadow-[2px_2px_0px_0px_black]');
  });

  if (isHidden) {
    listEl.classList.remove('hidden');
    if (iconEl) iconEl.classList.add('rotate-180');
    if (btnEl) {
      btnEl.classList.remove('bg-white', 'text-black', 'shadow-[2px_2px_0px_0px_black]');
      btnEl.classList.add('bg-blue-400', 'text-white', 'shadow-[3px_3px_0px_0px_black]');
    }
  }
};

window.changeServer = async function(serverId, btnEl) {
  if (!serverId) return;
  document.querySelectorAll('.server-btn').forEach(b => {
    b.classList.remove('bg-yellow-400', 'text-black', 'border-black');
    b.classList.add('bg-gray-100', 'text-gray-800');
  });
  if (btnEl) {
    btnEl.classList.remove('bg-gray-100');
    btnEl.classList.add('bg-yellow-400', 'text-black');
  }

  try {
    const res = await fetch(`/api/server/${serverId}`);
    const data = await res.json();
    const url = data.url || data.data?.url;
    if (url) {
      const iframe = document.getElementById('streaming-iframe');
      if (iframe) iframe.src = url;
    }
  } catch (err) {
    console.error('Change server error:', err);
  }
};

async function loadStreaming(slug) {
  const container = document.getElementById('streaming-content');
  if (!slug) {
    showError(container, "Slug streaming tidak tersedia.");
    return;
  }
  
  showLoading(container);

  try {
    const data = await fetchWithCache(`/api/watch/${slug}`);
    
    if (data.error) {
       showError(container, data.error);
       return;
    }
    
    const { detail, episodes, streaming, servers, downloadUrls, navigation } = data;
    
    if (!streaming || !streaming.iframe) {
       showError(container, "Video belum tersedia untuk episode ini.");
       return;
    }
    
    // Add to history
    const activeEpisode = episodes.find(ep => ep.selected);
    let episodeDisplay = '';
    if (activeEpisode) {
      const info = activeEpisode.episode_info || '';
      const title = activeEpisode.title || '';
      episodeDisplay = (info && title && !title.includes(info)) ? `${info}: ${title}` : (info || title);
    }
    
    addToHistory({
      title: detail.series_title,
      slug: detail.slug || slug.split('-episode-')[0], // Fallback slug
      thumbnail: detail.thumbnail,
      episodeSlug: slug,
      episodeTitle: episodeDisplay
    });
    
    toggleFooter(true);
    container.innerHTML = `
      <div class="space-y-6 animate-in fade-in duration-500">
        <!-- Breadcrumb / Back Navigation -->
        <div class="flex items-center gap-3">
          <button onclick="goBack()" class="p-2 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div class="overflow-hidden flex-1">
             <h2 class="text-xl md:text-2xl font-bold truncate">${detail.series_title}</h2>
             ${episodeDisplay ? `<p class="text-base text-[#ec4899] font-bold italic truncate drop-shadow-sm flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-[#ec4899] rounded-full animate-pulse"></span>
                ${episodeDisplay}
             </p>` : `<p class="text-xs text-gray-400 font-bold italic truncate font-sans">${detail.alter_title}</p>`}
          </div>
        </div>

        <!-- Video Player Section -->
        <div class="bg-black sketch-border overflow-hidden border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative aspect-video">
          <iframe 
            id="streaming-iframe"
            src="${streaming.iframe}" 
            class="absolute inset-0 w-full h-full border-0" 
            allowfullscreen 
            referrerpolicy="no-referrer"
          ></iframe>
        </div>

        <!-- Episode Navigation Buttons -->
        <div class="flex justify-between items-center gap-3">
          ${navigation?.hasPrevEpisode && navigation?.prevEpisode?.episodeId ? `
            <button onclick="navigateTo('streaming', null, '${navigation.prevEpisode.episodeId}')" class="px-4 py-2 bg-white hover:bg-gray-100 border-2 border-black rounded-xl font-bold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              <span>Eps Sebelumnya</span>
            </button>
          ` : '<div></div>'}

          ${navigation?.hasNextEpisode && navigation?.nextEpisode?.episodeId ? `
            <button onclick="navigateTo('streaming', null, '${navigation.nextEpisode.episodeId}')" class="px-4 py-2 bg-[#3b82f6] text-white hover:bg-blue-600 border-2 border-black rounded-xl font-bold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center gap-1.5">
              <span>Eps Selanjutnya</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          ` : '<div></div>'}
        </div>

        <!-- Server & Quality Switcher (Buka Tutup per Kualitas) -->
        ${servers && servers.length > 0 ? `
          <div class="bg-white border-2 border-black rounded-xl p-4 sketch-border space-y-3">
            <div class="flex items-center justify-between">
              <span class="font-bold text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
                Pilih Server Streaming:
              </span>
              <span class="text-[10px] text-gray-400 font-bold italic">Klik resolusi untuk memilih server</span>
            </div>

            <!-- Tombol Pilihan Resolusi [360p] [480p] [720p] -->
            <div class="flex flex-wrap gap-2.5">
              ${servers.map((q, idx) => {
                const count = (q.serverList || []).length;
                const safeKey = (q.title || `q_${idx}`).replace(/[^a-zA-Z0-9]/g, '_');
                return `
                  <button 
                    id="server-tab-btn-${safeKey}"
                    onclick="toggleServerQuality('${safeKey}')"
                    class="server-tab-btn px-4 py-2 bg-white hover:bg-yellow-50 border-2 border-black rounded-xl text-xs font-bold transition-all shadow-[2px_2px_0px_0px_black] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1.5"
                  >
                    <span>${q.title}</span>
                    <span class="text-[10px] px-1.5 py-0.2 bg-gray-100 rounded border border-black/30 text-gray-600">${count}</span>
                    <svg id="server-icon-${safeKey}" class="server-quality-icon w-3.5 h-3.5 transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </button>
                `;
              }).join('')}
            </div>

            <!-- Kontainer Pilihan Server yang Terbuka/Tertutup saat Tombol Resolusi Diklik -->
            <div class="space-y-2 pt-1">
              ${servers.map((q, idx) => {
                const safeKey = (q.title || `q_${idx}`).replace(/[^a-zA-Z0-9]/g, '_');
                const serverList = q.serverList || [];
                return `
                  <div id="server-list-${safeKey}" class="server-quality-list hidden p-3 bg-gray-50 border-2 border-dashed border-black/40 rounded-xl space-y-2 animate-in fade-in duration-200">
                    <div class="flex items-center justify-between text-[11px] font-bold text-gray-600">
                      <span>Server Tersedia (${q.title}):</span>
                      <span class="text-[10px] text-gray-400">Klik server untuk memutar</span>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      ${serverList.length > 0 ? serverList.map(s => `
                        <button 
                          onclick="changeServer('${s.serverId}', this)"
                          class="server-btn px-3 py-1.5 bg-gray-100 hover:bg-yellow-300 border-2 border-black rounded-lg text-xs font-bold transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1.5 capitalize"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          <span>${s.title}</span>
                        </button>
                      `).join('') : '<p class="text-xs italic text-gray-400 font-bold py-1">Tidak ada server streaming pada resolusi ini.</p>'}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Pilihan Link Download Episode (Jika ada) -->
        ${downloadUrls && downloadUrls.length > 0 ? `
          <div class="bg-white border-2 border-black rounded-xl p-4 sketch-border space-y-3">
            <div class="flex items-center justify-between">
              <span class="font-bold text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                Download Episode:
              </span>
              <span class="text-[10px] text-gray-400 font-bold italic">Simpan video untuk offline</span>
            </div>

            <!-- Tombol Pilihan Resolusi Download -->
            <div class="flex flex-wrap gap-2.5">
              ${downloadUrls.map((dl, idx) => {
                const count = (dl.urls || []).length;
                const safeKey = (dl.title || `dl_${idx}`).replace(/[^a-zA-Z0-9]/g, '_');
                return `
                  <button 
                    id="dl-tab-btn-${safeKey}"
                    onclick="toggleDownloadQuality('${safeKey}')"
                    class="dl-tab-btn px-4 py-2 bg-white hover:bg-blue-50 border-2 border-black rounded-xl text-xs font-bold transition-all shadow-[2px_2px_0px_0px_black] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1.5"
                  >
                    <span>${dl.title}</span>
                    ${dl.size ? `<span class="text-[10px] text-gray-500 font-normal">(${dl.size})</span>` : ''}
                    <svg id="dl-icon-${safeKey}" class="dl-quality-icon w-3.5 h-3.5 transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </button>
                `;
              }).join('')}
            </div>

            <!-- Kontainer Pilihan Link Download -->
            <div class="space-y-2 pt-1">
              ${downloadUrls.map((dl, idx) => {
                const safeKey = (dl.title || `dl_${idx}`).replace(/[^a-zA-Z0-9]/g, '_');
                const urls = dl.urls || [];
                return `
                  <div id="dl-list-${safeKey}" class="dl-quality-list hidden p-3 bg-gray-50 border-2 border-dashed border-black/40 rounded-xl space-y-2 animate-in fade-in duration-200">
                    <div class="flex items-center justify-between text-[11px] font-bold text-gray-600">
                      <span>Link Unduhan (${dl.title}${dl.size ? ` - ${dl.size}` : ''}):</span>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      ${urls.length > 0 ? urls.map(u => `
                        <a 
                          href="${u.url}" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          class="px-3 py-1.5 bg-white hover:bg-emerald-300 border-2 border-black rounded-lg text-xs font-bold transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1.5"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                          <span>${u.title}</span>
                        </a>
                      `).join('') : '<p class="text-xs italic text-gray-400 font-bold py-1">Tidak ada link unduhan tersedia.</p>'}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Main Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Info Column -->
          <div class="lg:col-span-2 space-y-6">
            <div class="bg-white border-4 border-black p-6 sketch-border">
              <div class="flex flex-col md:flex-row gap-6">
                 <div class="w-32 h-44 shrink-0 border-2 border-black rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                   <img src="${detail.thumbnail}" class="w-full h-full object-cover" referrerpolicy="no-referrer">
                 </div>
                 <div class="flex-1 space-y-3">
                   <div class="flex flex-wrap gap-2">
                     ${(detail.genres || []).map(g => `<span class="px-2 py-1 bg-gray-100 border-2 border-black rounded-lg text-[10px] font-bold">${typeof g === 'string' ? g : (g.name || g.title)}</span>`).join('')}
                   </div>
                   
                   <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] font-bold">
                     <p><span class="text-gray-400 uppercase">Status:</span> ${detail.status}</p>
                     <p><span class="text-gray-400 uppercase">Type:</span> ${detail.type}</p>
                     <p><span class="text-gray-400 uppercase">Studio:</span> ${detail.studio}</p>
                     <p><span class="text-gray-400 uppercase">Season:</span> ${detail.season}</p>
                     <p><span class="text-gray-400 uppercase">Rating:</span> <span class="text-orange-500">⭐ ${detail.rating}</span></p>
                   </div>
                 </div>
              </div>
              <div class="mt-6 pt-6 border-t-2 border-dashed border-black">
                <h4 class="font-bold mb-2">Sinopsis</h4>
                <p class="text-sm text-gray-700 leading-relaxed whitespace-pre-line">${detail.description}</p>
              </div>
            </div>
          </div>

          <!-- Episode Selection Column -->
          <div class="space-y-4">
            <h3 class="text-lg font-bold p-2 bg-yellow-400 border-2 border-black rounded-lg inline-block rotate-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              Episode Lainnya
            </h3>
            <div class="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              ${episodes.map(ep => `
                <div 
                  onclick="navigateTo('streaming', null, '${ep.slug}')" 
                  class="flex items-center gap-3 p-3 bg-white border-2 border-black rounded-xl cursor-pointer transition-all hover:translate-x-1 ${ep.selected ? 'bg-[#3b82f6] text-white' : 'hover:bg-gray-50'}"
                  style="${ep.selected ? 'box-shadow: 4px 4px 0px 0px black;' : 'box-shadow: 2px 2px 0px 0px black;'}"
                >
                  <div class="w-12 h-12 shrink-0 border-2 border-black rounded-lg overflow-hidden flex-none">
                    <img src="${ep.image}" class="w-full h-full object-cover">
                  </div>
                  <div class="text-left overflow-hidden">
                    <p class="font-bold text-xs truncate">${ep.title}</p>
                    <p class="text-[10px] opacity-70">${ep.episode_info}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Fetch watch error:', error);
    showError(container, "Gagal memuat player video.");
  }
}

// --- List Logic ---
window.loadSearch = async function(query, page = 1, isRestore = false) {
  if (!query) return;
  const cleanQuery = query.trim();
  if (cleanQuery === '') return;

  // Save state for back button
  lastListState = { type: null, title: null, page, query: cleanQuery };

  if (!isRestore) {
    navigateTo('list', null, { query: cleanQuery, page });
    return; // navigateTo will call navigateToInternal which will call loadSearch with isRestore = true
  }

  const titleEl = document.getElementById('list-title');
  const heartEl = document.getElementById('list-header-heart');
  const container = document.getElementById('list-grid');
  const pagContainer = document.getElementById('list-pagination');
  
  if (titleEl) titleEl.innerText = `Hasil Pencarian: ${cleanQuery}`;
  if (heartEl) heartEl.classList.remove('hidden');

  showLoading(container);
  if (pagContainer) pagContainer.innerHTML = '';

  try {
    const data = await fetchWithCache(`/api/search/${page}/${encodeURIComponent(cleanQuery)}`);

    if (data.error) {
      showError(container, data.error);
      return;
    }

    if (data.results && data.results.length > 0) {
      renderAnimeList(data.results, container);
      renderPagination(data.pagination, 'list-pagination', (p) => window.loadSearch(cleanQuery, p));
    } else {
      toggleFooter(true);
      container.innerHTML = `
        <div class="col-span-full text-center py-20">
          <p class="text-xl font-bold text-gray-400 italic">Anime "${cleanQuery}" tidak ditemukan.</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Search error:', error);
    showError(container, "Gagal melakukan pencarian.");
  }
};

window.fetchListPage = async function(type, title, page = 1, isRestore = false) {
  // Save state for back button
  lastListState = { type, title, page, query: null };

  if (!isRestore) {
    navigateTo('list', null, { type, title, page });
    return;
  }

  const titleEl = document.getElementById('list-title');
  const heartEl = document.getElementById('list-header-heart');
  const grid = document.getElementById('list-grid');
  const pagContainer = document.getElementById('list-pagination');
  
  if (titleEl) titleEl.innerText = title;

  // Always show heart for all categories on page header
  if (heartEl) {
    heartEl.classList.remove('hidden');
  }

  showLoading(grid);
  if (pagContainer) pagContainer.innerHTML = '';

  try {
    let endpoint = '';
    if (type === 'popular') {
      endpoint = `/api/popular/${page}`;
    } else if (type === 'movies') {
      endpoint = `/api/movies/${page}`;
    } else if (type === 'ongoing') {
      endpoint = `/api/ongoing/${page}`;
    } else if (type === 'completed') {
      endpoint = `/api/completed/${page}`;
    } else {
      grid.innerHTML = `<div class="col-span-full text-center py-10 font-bold text-gray-300 italic">Kategori ${title} sedang dalam pengembangan.</div>`;
      return;
    }

    const data = await fetchWithCache(endpoint);

    if (data.error) {
      showError(grid, data.error);
      return;
    }

    if (data.results && data.results.length > 0) {
      renderAnimeList(data.results, grid);
      renderPagination(data.pagination, 'list-pagination', (p) => window.fetchListPage(type, title, p));
    } else {
      toggleFooter(true);
      grid.innerHTML = `<div class="col-span-full text-center py-20 font-bold text-gray-400 italic">Tidak ada anime ditemukan dalam kategori ini.</div>`;
    }
  } catch (error) {
    console.error('Fetch list error:', error);
    showError(grid, "Gagal memuat daftar anime.");
  }
};

// --- Sidebar & Accordion Logic ---
window.toggleAccordion = (id) => {
  const content = document.getElementById(id);
  const icon = document.getElementById(`${id}-icon`);
  
  if (!content) return;

  // Close other accordions first (optional, for accordion effect)
  const allContents = document.querySelectorAll('[id^="acc-"]:not([id$="-icon"])');
  allContents.forEach(acc => {
    if (acc.id !== id) {
      acc.style.maxHeight = null;
      const otherIcon = document.getElementById(`${acc.id}-icon`);
      if (otherIcon) otherIcon.style.transform = 'rotate(0deg)';
    }
  });

  if (content.style.maxHeight) {
    content.style.maxHeight = null;
    if (icon) icon.style.transform = 'rotate(0deg)';
  } else {
    content.style.maxHeight = content.scrollHeight + "px";
    if (icon) icon.style.transform = 'rotate(180deg)';
  }
};

window.openQrModal = () => {
  const modal = document.getElementById('qr-modal');
  const content = document.getElementById('qr-modal-content');
  if (modal) modal.classList.remove('hidden');
  if (content) content.classList.add('modal-animate');
};

window.closeQrModal = () => {
  const modal = document.getElementById('qr-modal');
  const content = document.getElementById('qr-modal-content');
  if (modal) modal.classList.add('hidden');
  if (content) content.classList.remove('modal-animate');
};

// --- History Logic ---
const HISTORY_KEY = 'henveronime_history';

function addToHistory(item) {
  let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  // Remove if already exists (to move to top)
  history = history.filter(h => h.slug !== item.slug);
  // Add new item to top
  history.unshift({
    ...item,
    timestamp: new Date().getTime()
  });
  // Limit to 20 items
  history = history.slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
}

window.clearHistory = () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
};

function renderHistory() {
  const container = document.getElementById('history-container');
  if (!container) return;

  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

  if (history.length === 0) {
    container.innerHTML = `<p class="text-xs text-gray-400 italic font-bold text-center py-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">Belum ada riwayat...</p>`;
    return;
  }

  container.innerHTML = history.map(item => `
    <div class="group relative flex gap-3 p-2 border-2 border-black rounded-xl bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]">
      <div class="relative w-16 h-20 shrink-0 border-2 border-black rounded-lg overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <img src="${item.thumbnail}" class="w-full h-full object-cover" referrerpolicy="no-referrer">
      </div>
      <div class="flex-1 overflow-hidden flex flex-col justify-center">
        <h4 class="text-xs font-extrabold truncate mb-1" title="${item.title}">${item.title}</h4>
        <p class="text-[10px] text-[#ec4899] font-bold italic truncate flex items-center gap-1">
           <span class="w-1.5 h-1.5 bg-[#ec4899] rounded-full"></span>
           ${item.episodeTitle || 'Baru Saja'}
        </p>
      </div>
    </div>
  `).join('');
}

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
  renderHistory();
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');

  const executeSearch = () => {
    if (searchInput && searchInput.value.trim() !== '') {
      window.loadSearch(searchInput.value.trim());
    }
  };

  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') executeSearch();
    });
  }

  if (searchButton) {
    searchButton.addEventListener('click', executeSearch);
  }

  // Set initial state
  history.replaceState({ pageId: 'home' }, "", "");
  navigateToInternal('home');

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
});
