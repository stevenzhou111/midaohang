/**
 * nav-favicon —— 导航站图标代理 Worker
 *
 * 为什么需要它：国内直接访问 Google / DuckDuckGo 的 Favicon 服务基本不通，
 * 结果 90 个站点全是字母块。这个 Worker 跑在 Cloudflare 边缘节点上，
 * 由它去抓图标并缓存 30 天，浏览器只需请求你自己的域名即可。
 *
 * 用法：  GET /?domain=github.com
 * 也支持：GET /github.com
 *
 * 部署：  cd favicon-worker && npx wrangler deploy
 * 详见 README《图标在国内全挂怎么办》。
 */

const CACHE_SECONDS = 60 * 60 * 24 * 30; // 30 天

const UPSTREAMS = (domain) => [
  `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(domain)}`,
  `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  `https://favicon.im/${domain}`,
];

function corsHeaders(type) {
  return {
    "content-type": type,
    "access-control-allow-origin": "*",
    "cross-origin-resource-policy": "cross-origin",
    "cache-control": `public, max-age=${CACHE_SECONDS}, stale-while-revalidate=86400`,
  };
}

async function grab(domain) {
  for (const url of UPSTREAMS(domain)) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      const type = (res.headers.get("content-type") || "").toLowerCase();
      const okType = type.startsWith("image/") || type.includes("icon");
      if (res.ok && okType) {
        return new Response(res.body, {
          status: 200,
          headers: corsHeaders(type),
        });
      }
    } catch (err) {
      /* 换下一个源 */
    }
  }
  return new Response("no icon", {
    status: 404,
    headers: corsHeaders("text/plain; charset=utf-8"),
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, HEAD, OPTIONS",
          "access-control-max-age": "86400",
        },
      });
    }

    const raw =
      url.searchParams.get("domain") || decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    const domain = String(raw || "").trim().toLowerCase();

    if (!domain) {
      return new Response("missing ?domain=", { status: 400, headers: corsHeaders("text/plain; charset=utf-8") });
    }
    if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(domain) || domain.includes("..")) {
      return new Response("bad domain", { status: 400, headers: corsHeaders("text/plain; charset=utf-8") });
    }

    const cacheKey = new Request(`${url.origin}/?domain=${domain}`, { method: "GET" });
    const hit = await caches.default.match(cacheKey);
    if (hit) return hit;

    const result = await grab(domain);

    if (result.status === 200) {
      // 缓存成功的图标；404 不进缓存，方便上游恢复后自动生效
      ctx.waitUntil(caches.default.put(cacheKey, result.clone()));
    }
    return result;
  },
};
