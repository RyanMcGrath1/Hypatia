/**
 * Metro dev-server proxy path for the news API on **web** (see root `metro.config.js`).
 * Browser requests stay same-origin → no CORS to a different port.
 * Must stay in sync with `NEWS_PROXY_PREFIX` in `metro.config.js`.
 */
export const WEB_NEWS_DEV_PROXY_PREFIX = '/__hypatia_news_proxy';
