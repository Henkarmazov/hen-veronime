export default function handler(req: any, res: any) {
  res.status(200).json({
    message: 'Debug endpoint works!',
    env: {
      NODE_ENV: process.env.NODE_ENV,
      HAS_API_URL: !!process.env.ANIME_API_URL
    },
    url: req.url,
    headers: req.headers
  });
}
