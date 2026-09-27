import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { 
  getHomeData, 
  getAnimeDetail, 
  getWatchData, 
  getSearchData, 
  getPopularData, 
  getMovieData, 
  getOngoingData, 
  getCompletedData,
  getFilterData,
  getServerUrl,
  getScheduleData,
  getGenresList,
  getUnlimitedData,
  getBatchData
} from './_controllers/animeController.js';

// Debug logging for initialization
console.log('[INIT] API Module started loading...');
console.log('[INIT] Environment:', process.env.NODE_ENV);
console.log('[INIT] API URL Configured:', !!process.env.ANIME_API_URL);

const app = express();
const router = express.Router();

app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[API REQUEST] ${req.method} ${req.url}`);
  next();
});

try {
  // API Routes
  router.get('/home', async (req, res, next) => {
    try { await getHomeData(req, res); } catch (e) { next(e); }
  });
  
  router.get('/anime/:slug', async (req, res, next) => {
    try { await getAnimeDetail(req, res); } catch (e) { next(e); }
  });
  
  router.get('/watch/:slug', async (req, res, next) => {
    try { await getWatchData(req, res); } catch (e) { next(e); }
  });
  
  router.get('/search/:page/:query', async (req, res, next) => {
    try { await getSearchData(req, res); } catch (e) { next(e); }
  });
  
  router.get('/popular/:page', async (req, res, next) => {
    try { await getPopularData(req, res); } catch (e) { next(e); }
  });
  
  router.get('/movies/:page', async (req, res, next) => {
    try { await getMovieData(req, res); } catch (e) { next(e); }
  });
  
  router.get('/ongoing/:page', async (req, res, next) => {
    try { await getOngoingData(req, res); } catch (e) { next(e); }
  });
  
  router.get('/completed/:page', async (req, res, next) => {
    try { await getCompletedData(req, res); } catch (e) { next(e); }
  });

  router.get('/filter', async (req, res, next) => {
    try { await getFilterData(req, res); } catch (e) { next(e); }
  });

  router.get('/genre', async (req, res, next) => {
    try { await getGenresList(req, res); } catch (e) { next(e); }
  });

  router.get('/genre/:slug', async (req, res, next) => {
    try { await getFilterData(req, res); } catch (e) { next(e); }
  });

  router.get('/schedule', async (req, res, next) => {
    try { await getScheduleData(req, res); } catch (e) { next(e); }
  });

  router.get('/server/:serverId', async (req, res, next) => {
    try { await getServerUrl(req, res); } catch (e) { next(e); }
  });

  router.get('/batch/:slug', async (req, res, next) => {
    try { await getBatchData(req, res); } catch (e) { next(e); }
  });

  router.get('/unlimited', async (req, res, next) => {
    try { await getUnlimitedData(req, res); } catch (e) { next(e); }
  });

  router.get('/search/:query', async (req, res, next) => {
    try { await getSearchData(req, res); } catch (e) { next(e); }
  });

  router.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      environment: process.env.NODE_ENV || 'serverless',
      timestamp: new Date().toISOString(),
      api_url: process.env.ANIME_API_URL ? 'Configured' : 'Fallback'
    });
  });

  router.get('/quotes', (req, res) => {
    try {
      const filePath = path.join(process.cwd(), 'api', 'quotes.json');
      const data = fs.readFileSync(filePath, 'utf8');
      res.json(JSON.parse(data));
    } catch (err) {
      console.error('[API] Error reading quotes.json:', err);
      // Fallback in case file is missing
      res.json([{ nama: "System", quot: "Tetap semangat menonton anime! (API Fallback)" }]);
    }
  });
} catch (err) {
  console.error('[CRITICAL] Error setting up routes:', err);
}

// Mount router
app.use('/api', router);
app.use('/', router);

// Final fallback
app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.url}`);
  res.status(404).json({ error: 'API endpoint not found', path: req.url });
});

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('[API ERROR HANDLER]', err);
  res.status(500).json({ 
    error: 'Internal Server Error', 
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

console.log('[INIT] API Module finished loading.');
export default app;
