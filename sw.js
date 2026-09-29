/* sw.js —— PWA Service Worker
   ------------------------------------------------------------------
   策略刻意选「网络优先」而不是常见的「缓存优先」：
   这个站的核心玩法是随时改 data.js 就上线，缓存优先会让你改完刷新
   还看到旧配置。这里只把网络拿不到的请求（断网 / 离线打开）退到缓存，
   联网时永远以服务器上的最新文件为准。

   注意：修改本文件或任何静态资源后，浏览器要等 service worker 更新
   （最多约 24 小时自动检查，或 Ctrl+F5 / 关掉标签页重开）才生效。 */

const CACHE = "nav-cache-v1";

const CORE = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "data.js",
  "icons.js",
  "icons-img.js",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png"
];

/* 安装：把核心资源预热进缓存；单个失败不影响安装 */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.all(
          CORE.map((url) =>
            cache
              .add(new Request(url, { cache: "reload" }))
              .catch(() => undefined)
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

/* 激活：清掉旧版本缓存 */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  /* 跨域的（远程 favicon、搜索引擎跳转）一律不碰 */
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches
            .open(CACHE)
            .then((cache) => cache.put(req, copy))
            .catch(() => undefined);
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => {
          if (hit) return hit;
          /* 断网时刷新页面 → 退回首页骨架，脚本仍由缓存提供 */
          if (req.mode === "navigate") return caches.match("index.html");
          return undefined;
        })
      )
  );
});
