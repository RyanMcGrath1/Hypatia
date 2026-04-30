// @ts-check
/**
 * Proxies GET /__hypatia_news_proxy/* → http://127.0.0.1:5001/* so Expo Web can call the local news API
 * without browser CORS (same origin as the dev server). Must match `constants/newsDevProxy.ts`.
 */
const { getDefaultConfig } = require('expo/metro-config');

const NEWS_PROXY_PREFIX = '/__hypatia_news_proxy';

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const previousEnhance = config.server?.enhanceMiddleware;

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    const chain = previousEnhance
      ? previousEnhance.length >= 2
        ? previousEnhance(middleware, server)
        : previousEnhance(middleware)
      : middleware;
    return (req, res, next) => {
      const url = req.url ?? '';
      if (!url.startsWith(NEWS_PROXY_PREFIX)) {
        return chain(req, res, next);
      }

      const method = req.method ?? 'GET';
      if (method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Accept, Cache-Control, Pragma',
        });
        res.end();
        return;
      }

      if (method !== 'GET' && method !== 'HEAD') {
        return chain(req, res, next);
      }

      let targetPath = url.slice(NEWS_PROXY_PREFIX.length);
      if (!targetPath.startsWith('/')) {
        targetPath = `/${targetPath}`;
      }

      const http = require('http');
      const targetUrl = `http://127.0.0.1:5001${targetPath}`;

      http
        .get(targetUrl, { headers: { Accept: req.headers.accept ?? '*/*' } }, (proxyRes) => {
          const headers = { ...proxyRes.headers };
          delete headers['transfer-encoding'];
          res.writeHead(proxyRes.statusCode ?? 500, headers);
          proxyRes.pipe(res);
        })
        .on('error', (err) => {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(
            `News API proxy: cannot reach 127.0.0.1:5001 (${err.message}). Start the news server or set EXPO_PUBLIC_NEWS_API_BASE_URL.`,
          );
        });
    };
  },
};

module.exports = config;
