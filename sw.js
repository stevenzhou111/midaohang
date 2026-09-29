/* sw.js —— PWA Service Worker
   ------------------------------------------------------------------
   两种策略混用，按资源性质分开：

   1) 配置类（HTML / app.js / data.js / styles.css）→ 网络优先。
      这个站的核心玩法是随时改 data.js 就上线，缓存优先会让你改完刷新还看到旧配置。
      断网时退到缓存兜底。

   2) 图标库（icons.js + icons-img.js，合计约 360KB）→ stale-while-revalidate。
      这两个文件每次打开都重新下载的话，_headers 里给的 1 小时缓存会被完全废掉，
      首屏白白多传 360KB。这里先给缓存里的（秒开），同时后台悄悄更新，
      下次打开就是新的。改图标最多延迟一次访问生效，可以接受。

   注意：修改本文件后，浏览器要等 service worker 更新（Ctrl+F5 或关掉标签页重开）
   才生效；改了 sw.js 本身请把下面 CACHE 的版本号 +1，旧缓存会被自动清掉。 */

const CACHE = "nav-cache-v3";

/* app.js 自己也会写缓存（远程 favicon 抓下来的位图），activate 时必须留着它，
   否则每次 SW 升版都会连带清空，用户要重新抓一遍图标 */
const OWN_CACHES = [CACHE, "nav-icons-v1"];

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
  "icon-512.png",
  "icon-maskable-512.png",
  "apple-touch-icon.png"
];

/* 图标库：体积大、变动少，走 stale-while-revalidate。
   用 SW 脚本位置解析成绝对路径：写死 "/icons.js" 只在根路径部署下能匹配，
   部署到子路径（如 GitHub Pages 项目站 /repo/）时 pathname 带前缀，永远命中不了。 */
const REVALIDATE = ["icons.js", "icons-img.js"].map(
  (file) => new URL(file, self.location).pathname
);

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

/* 激活：清掉旧版本缓存（但保留 app.js 自己的图标缓存） */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => OWN_CACHES.indexOf(key) < 0).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function putInCache(req, res) {
  if (res && res.ok && res.type === "basic") {
    const copy = res.clone();
    caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => undefined);
  }
  return res;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  /* 跨域的（远程 favicon、搜索引擎跳转）一律不碰 */
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  /* 同域的 favicon 代理响应也别塞进 HTML 缓存 */
  if (url.pathname === "/favicon") return;

  /* 图标库：先给缓存，后台更新 */
  if (REVALIDATE.indexOf(url.pathname) >= 0) {
    event.respondWith(
      caches.match(req, { ignoreVary: true }).then((hit) => {
        const fromNet = fetch(req)
          .then((res) => putInCache(req, res))
          .catch(() => null);
        if (hit) {
          event.waitUntil(fromNet);
          return hit;
        }
        return fromNet.then(
          (res) => res || Response.error(),
          () => Response.error()
        );
      })
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => putInCache(req, res))
      .catch(() =>
        caches.match(req, { ignoreVary: true }).then((hit) => {
          if (hit) return hit;
          /* 断网时刷新页面 → 退回首页骨架，脚本仍由缓存提供。
             必须返回合法 Response：返回 undefined 会让 respondWith 抛 TypeError。 */
          if (req.mode === "navigate") {
            return caches
              .match("index.html", { ignoreVary: true })
              .then((page) => page || Response.error());
          }
          return Response.error();
        })
      )
  );
});
