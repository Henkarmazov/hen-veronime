import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
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
} from './api/_controllers/animeController.js';

async function createServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(cors());
  app.use(express.json());

  // API Routes
  const router = express.Router();
  router.get('/home', getHomeData);
  router.get('/anime/:slug', getAnimeDetail);
  router.get('/watch/:slug', getWatchData);
  router.get('/search/:page/:query', getSearchData);
  router.get('/popular/:page', getPopularData);
  router.get('/movies/:page', getMovieData);
  router.get('/ongoing/:page', getOngoingData);
  router.get('/completed/:page', getCompletedData);
  router.get('/filter', getFilterData);
  router.get('/genre', getGenresList);
  router.get('/genre/:slug', getFilterData);
  router.get('/schedule', getScheduleData);
  router.get('/server/:serverId', getServerUrl);
  router.get('/batch/:slug', getBatchData);
  router.get('/unlimited', getUnlimitedData);
  router.get('/search/:query', getSearchData);
  router.get('/health', (req, res) => res.json({ status: 'ok' }));
  
  router.get('/quotes', (req, res) => {
    try {
      const filePath = path.join(process.cwd(), 'api', 'quotes.json');
      const data = fs.readFileSync(filePath, 'utf8');
      res.json(JSON.parse(data));
    } catch (err) {
      console.error('[SERVER] Error reading quotes.json:', err);
      res.json([{ nama: "System", quot: "Tetap semangat menonton anime! (Dev Fallback)" }]);
    }
  });

  app.use('/api', router);
  app.use('/', router);

  // Fallback for non-existent API routes (return JSON, not HTML)
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: Serve static files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

// Initializing the server
const serverPromise = createServer();

// For Standard Node (like in this preview environment)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  serverPromise.then(app => {
    const PORT = 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }).catch((err) => {
    console.error('Failed to start server:', err);
  });
}

// Export for Vercel
export default async (req: any, res: any) => {
  const app = await serverPromise;
  return app(req, res);
};
