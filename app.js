(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  /* ───────────────────────── DOM 引用 ───────────────────────── */

  const content = $("content");
  const empty = $("empty");
  const sideNav = $("side-nav");
  const input = $("search-input");
  const form = $("search-form");
  const hint = $("search-hint");
  const enginesBox = $("engines");
  const suggestions = $("suggestions");
  const recentPanel = $("panel-recent");
  const recentGrid = $("recent-grid");
  const recentCount = $("recent-count");
  const themeBtn = $("theme-toggle");

  const bootError = window.__CONFIG_ERROR__ || null;

  /* ───────────────────────── 存储工具 ───────────────────────── */

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        /* 无痕模式下忽略 */
      }
    },
  };

  /* ───────────────────────── 主题（与配置无关，先初始化） ───────────────────────── */

  const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

  function resolveTheme() {
    const saved = store.get("nav:theme", null);
    if (saved === "light" || saved === "dark") return saved;
    return systemDark.matches ? "dark" : "light";
  }

  const SUN_ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const MOON_ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>';

  function applyTheme() {
    const theme = resolveTheme();
    document.documentElement.setAttribute("data-theme", theme);
    themeBtn.innerHTML = theme === "dark" ? SUN_ICON : MOON_ICON;
    themeBtn.title = theme === "dark" ? "切换到浅色" : "切换到深色";
  }

  themeBtn.addEventListener("click", () => {
    store.set("nav:theme", resolveTheme() === "dark" ? "light" : "dark");
    applyTheme();
  });
  systemDark.addEventListener("change", () => {
    if (store.get("nav:theme", null) === null) applyTheme();
  });
  applyTheme();

  /* ───────────────────── 配色主题 & 视图切换（与配置无关） ───────────────────── */

  const paletteBtn = $("palette-toggle");
  const palettePop = $("palette-pop");
  const viewBtn = $("view-toggle");

  /* id + 圆点用的两个色标（浅色主色 → 辅色），名字用于提示与无障碍标签 */
  const ACCENTS = [
    { id: "indigo", name: "靛蓝", from: "#4f46e5", to: "#db2777" },
    { id: "emerald", name: "翡翠", from: "#059669", to: "#0891b2" },
    { id: "amber", name: "琥珀", from: "#d97706", to: "#dc2626" },
    { id: "rose", name: "玫红", from: "#e11d48", to: "#f97316" },
    { id: "sky", name: "天蓝", from: "#0284c7", to: "#6366f1" },
  ];

  const PALETTE_ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 000 18c1 0 1.5-.7 1.5-1.5 0-.8-.5-1.2-.5-2 0-.8.7-1.5 1.5-1.5H16a5 5 0 005-5c0-4.1-4-8-9-8z"/><circle cx="7.5" cy="10.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="7.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="16.5" cy="10.5" r="1.1" fill="currentColor" stroke="none"/></svg>';
  const GRID_ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/></svg>';
  const LIST_ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';

  function currentAccent() {
    const saved = store.get("nav:accent", "indigo");
    return ACCENTS.some((a) => a.id === saved) ? saved : "indigo";
  }

  function applyAccent() {
    const id = currentAccent();
    document.documentElement.setAttribute("data-accent", id);
    const dots = palettePop.querySelectorAll(".swatch");
    for (let i = 0; i < dots.length; i++) {
      const on = dots[i].dataset.accent === id;
      dots[i].classList.toggle("is-active", on);
      dots[i].setAttribute("aria-pressed", on ? "true" : "false");
    }
    const cur = ACCENTS.filter((a) => a.id === id)[0] || ACCENTS[0];
    paletteBtn.title = "配色主题：" + cur.name;
  }

  function buildPalette() {
    paletteBtn.innerHTML = PALETTE_ICON;
    palettePop.innerHTML = "";
    ACCENTS.forEach((a) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "swatch";
      dot.dataset.accent = a.id;
      dot.title = a.name;
      dot.setAttribute("aria-label", "配色：" + a.name);
      dot.style.background = "linear-gradient(135deg, " + a.from + ", " + a.to + ")";
      dot.addEventListener("click", () => {
        store.set("nav:accent", a.id);
        applyAccent();
      });
      palettePop.appendChild(dot);
    });
    applyAccent();
  }

  function closePalette() {
    if (palettePop.hidden) return;
    palettePop.hidden = true;
    paletteBtn.setAttribute("aria-expanded", "false");
  }

  paletteBtn.addEventListener("click", () => {
    const willOpen = palettePop.hidden;
    palettePop.hidden = !willOpen;
    paletteBtn.setAttribute("aria-expanded", willOpen ? "true" : "false");
  });

  document.addEventListener("click", (ev) => {
    if (palettePop.hidden) return;
    if (palettePop.contains(ev.target) || paletteBtn.contains(ev.target)) return;
    closePalette();
  });

  /* 视图：grid（网格，默认）| list（单列大行），存 localStorage */
  function resolveView() {
    return store.get("nav:view", null) === "list" ? "list" : "grid";
  }

  function applyView() {
    const view = resolveView();
    document.documentElement.setAttribute("data-view", view);
    /* 按钮显示"点一下会切过去"的那个视图的图标 */
    viewBtn.innerHTML = view === "grid" ? LIST_ICON : GRID_ICON;
    viewBtn.title = view === "grid" ? "切换到列表视图" : "切换到网格视图";
  }

  viewBtn.addEventListener("click", () => {
    store.set("nav:view", resolveView() === "grid" ? "list" : "grid");
    applyView();
  });

  buildPalette();
  applyView();

  /* PWA：注册 Service Worker（只在 http/https 下，双击本地文件时跳过） */
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.protocol === "http:")) {
    window.addEventListener("load", () => {
      try {
        navigator.serviceWorker.register("sw.js").catch(() => undefined);
      } catch (e) {}
    });
  }

  /* ───────────────────────── 配置校验与容错 ───────────────────────── */

  function buildErrorPanel(title, lines, tone) {
    content.innerHTML = "";
    window.__APP_READY__ = true; // 后续错误不再当作配置错误上报

    const panel = document.createElement("section");
    panel.className = "panel panel-msg " + (tone === "warn" ? "is-warn" : "is-error");

    const head = document.createElement("div");
    head.className = "panel-head panel-head-static";
    const emoji = document.createElement("span");
    emoji.className = "cat-emoji";
    emoji.textContent = tone === "warn" ? "⚠️" : "💥";
    const t = document.createElement("span");
    t.className = "panel-title";
    t.textContent = title;
    const rule = document.createElement("span");
    rule.className = "rule";
    rule.setAttribute("aria-hidden", "true");
    head.appendChild(emoji);
    head.appendChild(t);
    head.appendChild(rule);

    const body = document.createElement("div");
    body.className = "panel-body";

    const pre = document.createElement("pre");
    pre.className = "msg-detail";
    pre.textContent = lines.join("\n");
    body.appendChild(pre);

    const tip = document.createElement("p");
    tip.className = "msg-tip";
    tip.textContent =
      tone === "warn"
        ? "以上问题已被自动跳过，页面仍可正常使用。"
        : "修改 data.js 修复后，刷新页面（Ctrl / Cmd + R）即可恢复。";
    body.appendChild(tip);

    panel.appendChild(head);
    panel.appendChild(body);
    content.appendChild(panel);
  }

  function validateConfig(site) {
    const fatal = [];
    const issues = [];

    if (bootError) {
      fatal.push(
        (bootError.file || "data.js") +
          " 第 " +
          bootError.line +
          " 行第 " +
          bootError.col +
          " 列\n" +
          bootError.message
      );
      return { fatal, issues, categories: [] };
    }

    if (!site || typeof site !== "object") {
      fatal.push("data.js 没有定义 window.SITE 对象");
      return { fatal, issues, categories: [] };
    }
    if (!Array.isArray(site.categories)) {
      fatal.push("window.SITE.categories 必须是一个数组，当前是 " + typeof site.categories);
      return { fatal, issues, categories: [] };
    }

    const categories = [];
    site.categories.forEach((cat, ci) => {
      if (!cat || typeof cat !== "object") {
        issues.push("第 " + (ci + 1) + " 个分类不是对象，已跳过");
        return;
      }
      const name = cat.name || "未命名分类 " + (ci + 1);
      if (!cat.name) issues.push("第 " + (ci + 1) + " 个分类缺少 name，已用默认名代替");

      const rawLinks = Array.isArray(cat.links) ? cat.links : [];
      if (!Array.isArray(cat.links)) issues.push("分类「" + name + "」的 links 不是数组");

      const links = [];
      rawLinks.forEach((link, li) => {
        if (!link || typeof link !== "object") {
          issues.push("分类「" + name + "」第 " + (li + 1) + " 个链接不是对象，已跳过");
          return;
        }
        if (!link.name) {
          issues.push("分类「" + name + "」第 " + (li + 1) + " 个链接缺少 name，已跳过");
          return;
        }
        if (!link.url) {
          issues.push("链接「" + link.name + "」缺少 url，已跳过");
          return;
        }
        if (!/^https?:\/\//i.test(String(link.url))) {
          issues.push("链接「" + link.name + "」的 url 必须以 http:// 或 https:// 开头，已跳过");
          return;
        }
        links.push(link);
      });

      categories.push(Object.assign({}, cat, { name: name, links: links }));
    });

    return { fatal: fatal, issues: issues, categories: categories };
  }

  const SITE = window.SITE;
  const validation = validateConfig(SITE);

  if (validation.fatal.length) {
    buildErrorPanel("配置文件出错了", validation.fatal, "error");
    return;
  }

  const SETTINGS = Object.assign(
    {
      defaultEngine: "google",
      linkOrder: "config",
      showRecent: true,
      recentCount: 8,
      faviconProxy: "", // 默认直连；同域代理需在 data.js 里显式配置（避免无代理时发一个必然 404 的探测）
    },
    SITE.settings || {}
  );
  const CATEGORIES = validation.categories;

  /* ───────────────────────── 页头 ───────────────────────── */

  const siteName = SITE.siteName || "我的导航";
  document.title = siteName;
  $("site-name").textContent = siteName;
  $("brand-mark").textContent = siteName.trim().charAt(0) || "导";

  const subtitle = $("site-subtitle");
  subtitle.textContent = SITE.subtitle || "";
  subtitle.hidden = !SITE.subtitle;

  const footerText = $("footer-text");
  footerText.textContent = SITE.footer || "";
  footerText.hidden = !SITE.footer;

  const totalLinks = CATEGORIES.reduce((sum, c) => sum + c.links.length, 0);
  $("stats").textContent = CATEGORIES.length + " 个分类 · " + totalLinks + " 个链接";

  [CATEGORIES.length + " 个分类", totalLinks + " 个链接", "拼音 / 模糊搜索"].forEach((text) => {
    const chip = document.createElement("span");
    chip.className = "stat-chip";
    chip.textContent = text;
    $("hero-stats").appendChild(chip);
  });

  /* ───────────────────────── 搜索引擎 ───────────────────────── */

  const ENGINES = [
    { id: "google", name: "Google", base: "https://www.google.com/search?q=" },
    { id: "bing", name: "Bing", base: "https://www.bing.com/search?q=" },
    { id: "baidu", name: "百度", base: "https://www.baidu.com/s?wd=" },
    { id: "github", name: "GitHub", base: "https://github.com/search?q=" },
  ];

  let engineId = store.get("nav:engine", SETTINGS.defaultEngine);
  if (!ENGINES.some((e) => e.id === engineId)) engineId = ENGINES[0].id;

  function currentEngine() {
    return ENGINES.find((e) => e.id === engineId) || ENGINES[0];
  }

  ENGINES.forEach((engine) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "engine";
    btn.dataset.engine = engine.id;
    btn.textContent = engine.name;
    btn.setAttribute("role", "tab");
    btn.addEventListener("click", () => setEngine(engine.id));
    enginesBox.appendChild(btn);
  });

  function setEngine(id) {
    engineId = id;
    store.set("nav:engine", id);
    enginesBox.querySelectorAll(".engine").forEach((btn) => {
      const active = btn.dataset.engine === id;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    if (input.value.trim()) refreshSearch();
  }
  setEngine(engineId);

  function searchWeb(query) {
    window.open(currentEngine().base + encodeURIComponent(query), "_blank", "noopener");
  }

  function engineButton(label, query) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "hint-engine";
    btn.textContent = label;
    btn.addEventListener("click", () => searchWeb(query));
    return btn;
  }

  /* ───────────────────────── 网站图标：代理 + 本地缓存 + 多源兜底 ───────────────────────── */

  const ICON_CACHE_NAME = "nav-icons-v1";
  let proxyState = null; // null=探测中 | "ok" | "off"
  let remoteState = null; // 远程图标服务探测结果：null=探测中 | "ok" | "off"
  const iconQueue = [];
  /* 远程兜底预算：只有探测到"能连上"才放行，且整页最多 N 个图标去试 */
  const REMOTE_ICON_BUDGET = 24;
  let remoteAttempts = 0; // 已放行的数量（取源时计数，不是失败时）

  /* 本地图标库：icons.js（品牌 SVG）+ icons-img.js（抓取的真实 favicon data URI）
     建索引时兼容有无 www. 两种写法，SVG 与位图共用同一套查询 */
  const LOCAL_ICONS = (function () {
    const idx = Object.create(null);
    [window.ICONS || {}, window.ICONS_IMG || {}].forEach((src) => {
      Object.keys(src).forEach((key) => {
        const bare = key.replace(/^www\./, "");
        idx[key] = src[key];
        if (!idx[bare]) idx[bare] = src[key];
        if (!idx["www." + bare]) idx["www." + bare] = src[key];
      });
    });
    return idx;
  })();

  function localIconFor(host) {
    if (!host) return "";
    return LOCAL_ICONS[host] || LOCAL_ICONS[host.replace(/^www\./, "")] || LOCAL_ICONS["www." + host] || "";
  }

  function hostOf(url) {
    try {
      return new URL(url).hostname;
    } catch (e) {
      return "";
    }
  }

  function proxyBase() {
    return String(SETTINGS.faviconProxy || "").trim();
  }

  function proxyUrl(host) {
    const base = proxyBase();
    if (!base) return "";
    const sep = base.indexOf("?") >= 0 ? "&" : "?";
    return base + sep + "domain=" + encodeURIComponent(host);
  }

  /** 探测同域图标代理是否可用；失败则 6 小时内不再请求，避免刷 404 */
  function detectProxy() {
    const base = proxyBase();
    if (!base) {
      proxyState = "off";
      return Promise.resolve();
    }
    const until = store.get("nav:proxy-off-until", 0);
    if (typeof until === "number" && until > Date.now()) {
      proxyState = "off";
      return Promise.resolve();
    }
    return fetch(proxyUrl("example.com"), { cache: "no-store" })
      .then((res) => {
        const type = ((res.headers.get("content-type") || "") + "").toLowerCase();
        proxyState = res.ok && type.indexOf("image/") === 0 ? "ok" : "off";
        if (proxyState === "off") store.set("nav:proxy-off-until", Date.now() + 6 * 60 * 60 * 1000);
      })
      .catch(() => {
        proxyState = "off";
        store.set("nav:proxy-off-until", Date.now() + 6 * 60 * 60 * 1000);
      });
  }

  /** 探测 Google 图标服务是否可达（1.5 秒超时，失败记 6 小时）。
      国内基本不通；不通就整页放弃远程兜底，几十个 favicon 请求不会再吊死 */
  function detectRemoteIcons() {
    const until = store.get("nav:remote-off-until", 0);
    if (typeof until === "number" && until > Date.now()) {
      remoteState = "off";
      return Promise.resolve();
    }

    const ctrl = typeof AbortController === "function" ? new AbortController() : null;
    const timer = setTimeout(() => {
      if (ctrl) ctrl.abort();
    }, 1500);

    return fetch("https://www.google.com/s2/favicons?sz=64&domain=example.com", {
      mode: "no-cors",
      cache: "no-store",
      signal: ctrl ? ctrl.signal : undefined,
    })
      .then(() => {
        remoteState = "ok";
      })
      .catch(() => {
        remoteState = "off";
        store.set("nav:remote-off-until", Date.now() + 6 * 60 * 60 * 1000);
      })
      .then(() => {
        clearTimeout(timer);
        if (remoteState === null) remoteState = "off";
      });
  }

  function scheduleIcon(wrap, link) {
    iconQueue.push({ wrap: wrap, link: link });
    if (proxyState !== null) flushIcons();
  }

  function flushIcons() {
    while (iconQueue.length) {
      const item = iconQueue.shift();
      loadIcon(item.wrap, item.link);
    }
  }

  function fallbackLetter(name) {
    const span = document.createElement("span");
    span.className = "fav-letter";
    span.textContent = (name || "?").trim().charAt(0).toUpperCase();
    return span;
  }

  /** 图标 = 字母底纹（永远可见）+ 顶层图标（成功后渐显） */
  function createIcon(link) {
    const wrap = document.createElement("span");
    wrap.className = "fav";
    wrap.appendChild(fallbackLetter(link.name));
    scheduleIcon(wrap, link);
    return wrap;
  }

  function cachedIcon(url) {
    const useCache = window.caches && location.protocol.indexOf("http") === 0;
    let chain;

    if (useCache) {
      chain = caches
        .open(ICON_CACHE_NAME)
        .then((cache) =>
          cache.match(url).then((hit) => {
            if (hit) return hit;
            return fetch(url, { credentials: "omit" }).then((res) => {
              if (!res.ok) throw new Error("bad status");
              const type = ((res.headers.get("content-type") || "") + "").toLowerCase();
              if (type.indexOf("image/") !== 0) throw new Error("not an image");
              cache.put(url, res.clone()).catch(() => {});
              return res;
            });
          })
        )
        .then((res) => res.blob())
        .then((blob) => {
          if (!blob.type || blob.type.indexOf("image/") !== 0) return null;
          return URL.createObjectURL(blob);
        })
        .catch(() => null);
    } else {
      chain = fetch(url)
        .then((res) => (res.ok ? res.blob() : null))
        .then((blob) => (blob && blob.type.indexOf("image/") === 0 ? URL.createObjectURL(blob) : null))
        .catch(() => null);
    }
    return chain;
  }

  function mountIcon(wrap, src, revoke) {
    const img = document.createElement("img");
    img.className = "fav-img";
    img.alt = "";
    img.addEventListener("load", () => {
      wrap.classList.add("has-img");
      if (revoke) setTimeout(() => URL.revokeObjectURL(src), 1000);
    });
    img.addEventListener("error", () => img.remove());
    img.src = src;
    wrap.appendChild(img);
    return img;
  }

  function tryImgIcon(wrap, url) {
    return new Promise((resolve) => {
      if (!wrap.isConnected) return resolve(false);
      const img = document.createElement("img");
      img.className = "fav-img";
      img.alt = "";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.addEventListener("load", () => {
        wrap.classList.add("has-img");
        resolve(true);
      });
      img.addEventListener("error", () => {
        img.remove();
        resolve(false);
      });
      img.src = url;
      wrap.appendChild(img);
    });
  }

  /** 内联本地图标库里的 SVG：零请求、离线可用、跟随主题变色 */
  function mountSvg(wrap, svg) {
    const holder = document.createElement("span");
    holder.className = "fav-svg";
    holder.innerHTML = svg;
    /* icons.js 里的字符串带 role="img" 却没有可访问名，读屏会念出一堆"图片"。
       图标旁边本来就有文字名称，属于装饰性图形 → 去掉 role、标记 aria-hidden */
    const node = holder.firstElementChild;
    if (node && node.tagName.toLowerCase() === "svg") {
      node.removeAttribute("role");
      node.setAttribute("aria-hidden", "true");
    }
    wrap.appendChild(holder);
    /* 同步加类：后台标签页 rAF 会被节流，图标不能依赖它才显示 */
    wrap.classList.add("has-svg");
  }

  function loadIcon(wrap, link) {
    if (!wrap.isConnected) return Promise.resolve();
    const host = hostOf(link.url);
    const sources = [];

    /* 1) 本地图标库（首选）：SVG 走内联，data URI（icons-img.js 抓的真实 favicon）走 <img> */
    const local = localIconFor(host);
    if (local && /^<svg[\s>]/i.test(String(local).trim())) {
      mountSvg(wrap, String(local).trim());
      return Promise.resolve();
    }
    /* data URI（icons-img.js 抓的真实 favicon）走 <img>。
       兼容手滑写成 data:png / data:svg 的情况，自动补成 data:image/… */
    if (local && /^data:/i.test(local)) {
      let uri = local.replace(/^data:(?!image\/)/i, "data:image/");
      uri = uri.replace(/^data:image\/svg(?=;)/i, "data:image/svg+xml");
      mountIcon(wrap, uri, false);
      return Promise.resolve();
    }

    /* 2) 自定义图标 / 同域代理 / 远程源兜底 */
    if (link.icon) sources.push({ mode: "img", url: link.icon });
    else if (host) {
      if (proxyState === "ok") {
        /* 代理可用：Worker 内部已经试过 Google / DDG / favicon.im，
           浏览器就不用再各发一次了（省 2 个请求 × 几十个图标） */
        sources.push({ mode: "cache", url: proxyUrl(host) });
      } else if (remoteState === "ok" && remoteAttempts < REMOTE_ICON_BUDGET) {
        /* 远程兜底：先探测"能不能连上"，连得上才放行，且整页限流。
           注意必须在“取源时”计数 —— flushIcons 是同步循环，
           等失败回调再计数的话，所有图标早就一起发出去了 */
        remoteAttempts++;
        sources.push({
          mode: "img",
          url: "https://www.google.com/s2/favicons?sz=64&domain=" + encodeURIComponent(host),
        });
        sources.push({ mode: "img", url: "https://icons.duckduckgo.com/ip3/" + host + ".ico" });
      }
    }

    let chain = Promise.resolve();
    sources.forEach((source) => {
      chain = chain.then((done) => {
        if (done || !wrap.isConnected) return done;
        if (source.mode === "cache") {
          return cachedIcon(source.url).then((objUrl) => {
            if (!objUrl) return false;
            mountIcon(wrap, objUrl, true);
            return true;
          });
        }
        return tryImgIcon(wrap, source.url);
      });
    });
    return chain;
  }

  /* ───────────────────────── 点击记录与常用站点 ───────────────────────── */

  function recordClick(link) {
    if (!SETTINGS.showRecent) return;
    const list = store.get("nav:recent", []);
    const prev = list.find((item) => item.url === link.url);
    const next = list.filter((item) => item.url !== link.url);
    next.unshift({
      url: link.url,
      name: link.name,
      desc: link.desc || "",
      icon: link.icon || "",
      py: link.py || "",
      count: (prev ? prev.count : 0) + 1,
      ts: Date.now(),
    });
    store.set("nav:recent", next.slice(0, 30));
    renderRecent();
  }

  function openLink(link) {
    recordClick(link);
    window.open(link.url, "_blank", "noopener");
  }

  /* ───────────────────────── 链接块 ───────────────────────── */

  let dragEndAt = 0; // 拖拽结束时间：防止 drop 后误触发链接跳转 / 折叠

  function buildPill(link) {
    const a = document.createElement("a");
    a.className = "pill";
    a.href = link.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.title = (link.name || "") + (link.desc ? " — " + link.desc : "");
    a.dataset.name = link.name || "";

    a.appendChild(createIcon(link));

    const body = document.createElement("span");
    body.className = "pill-body";

    const name = document.createElement("span");
    name.className = "pill-name";
    name.textContent = link.name;
    body.appendChild(name);

    if (link.desc) {
      const desc = document.createElement("span");
      desc.className = "pill-desc";
      desc.textContent = link.desc;
      body.appendChild(desc);
    }

    a.appendChild(body);

    const arrow = document.createElement("span");
    arrow.className = "pill-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "↗";
    a.appendChild(arrow);

    a.addEventListener("click", (ev) => {
      if (Date.now() - dragEndAt < 300) {
        ev.preventDefault(); // 刚拖完，别把 drop 当成点击
        return;
      }
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey) return; // 保留浏览器多标签行为
      ev.preventDefault();
      openLink(link);
    });

    return a;
  }

  /* ───────────────────────── 分类面板 + 侧边栏 ───────────────────────── */

  const CHEVRON =
    '<svg class="chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';

  const entries = []; // { link, pill, panel, panelName, nameEl, hay, marked }
  const panels = []; // { panel, sideItem, name }

  function buildSideItem(id, icon, name, count) {
    const a = document.createElement("a");
    a.className = "side-item";
    a.href = "#" + id;
    a.dataset.target = id;
    a.innerHTML =
      '<span class="side-emoji"></span><span class="side-name"></span><span class="side-count"></span>';
    a.querySelector(".side-emoji").textContent = icon;
    a.querySelector(".side-name").textContent = name;
    a.querySelector(".side-count").textContent = count;
    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      const target = document.getElementById(id);
      if (!target) return;
      clearSearch();
      const top = target.getBoundingClientRect().top + window.scrollY - offsetForScroll();
      window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
      setActiveSide(id);
      try {
        history.replaceState(null, "", "#" + id);
      } catch (e) {
        /* file:// 下部分浏览器禁止改 hash */
      }
    });
    return a;
  }

  function offsetForScroll() {
    return window.innerWidth <= 1000 ? 92 : 24;
  }

  function buildHay(link, category) {
    const l = (s) => String(s == null ? "" : s).toLowerCase();
    const cat = category || {};
    const aliasMap = (window.SITE && window.SITE.categoryAlias) || {};
    return {
      name: l(link.name),
      desc: l(link.desc),
      url: l(link.url),
      py: l(link.py),
      pyFull: l(link.pyFull),
      /* 分类名 / 分类拼音 / categoryAlias 别名 都可被搜到 */
      cat: l(cat.name),
      catPy: l(cat.py),
      catPyFull: l(aliasMap[cat.name] || cat.pyFull),
    };
  }

  /* ───────── 自定义排序（拖拽产生，存 localStorage） ─────────
     只调整"已记录的项"的先后，配置里新增的分类 / 链接（记录里没有）
     一律按 data.js 的原顺序补在后面 —— 改配置永远不会被排序覆盖丢掉。 */

  const panelOrder = store.get("nav:panel-order", null);
  let categoryList = CATEGORIES;
  if (Array.isArray(panelOrder) && panelOrder.length > 0) {
    const rank = (name) => {
      const i = panelOrder.indexOf(name);
      return i < 0 ? Number.MAX_SAFE_INTEGER : i;
    };
    categoryList = CATEGORIES.slice().sort((a, b) => rank(a.name) - rank(b.name));
  }

  categoryList.forEach((category) => {
    const index = CATEGORIES.indexOf(category);
    const id = "panel-" + index;
    const links = category.links.slice();
    const order = category.order || SETTINGS.linkOrder;
    if (order === "name") links.sort((a, b) => String(a.name).localeCompare(String(b.name), "zh-Hans-CN"));

    const savedLinkOrder = store.get("nav:link-order:" + category.name, null);
    if (Array.isArray(savedLinkOrder) && savedLinkOrder.length > 0) {
      const pos = (name) => {
        const i = savedLinkOrder.indexOf(name);
        return i < 0 ? Number.MAX_SAFE_INTEGER : i;
      };
      links.sort((a, b) => pos(a.name) - pos(b.name));
    }

    const panel = document.createElement("section");
    panel.className = "panel";
    panel.id = id;

    const head = document.createElement("button");
    head.type = "button";
    head.className = "panel-head";
    head.setAttribute("aria-expanded", "true");
    head.innerHTML =
      '<span class="cat-emoji"></span>' +
      '<span class="panel-title"></span>' +
      '<span class="rule" aria-hidden="true"></span>' +
      '<span class="count">' + links.length + "</span>" +
      CHEVRON;
    head.querySelector(".cat-emoji").textContent = category.icon || "📁";
    head.querySelector(".panel-title").textContent = category.name;

    const body = document.createElement("div");
    body.className = "panel-body";
    const grid = document.createElement("div");
    grid.className = "link-grid";
    body.appendChild(grid);

    links.forEach((link) => {
      const pill = buildPill(link);
      grid.appendChild(pill);
      entries.push({
        link: link,
        pill: pill,
        panel: panel,
        panelName: category.name,
        nameEl: pill.querySelector(".pill-name"),
        hay: buildHay(link, category),
        marked: false,
      });
    });

    const stored = store.get("nav:collapse:" + category.name, null);
    const collapsed = stored === null ? !!category.collapsed : !!stored;
    setCollapsed(panel, head, collapsed);

    head.addEventListener("click", () => {
      if (Date.now() - dragEndAt < 300) return; // 刚拖完，别顺手折叠了
      const next = !panel.classList.contains("is-collapsed");
      setCollapsed(panel, head, next);
      store.set("nav:collapse:" + category.name, next);
    });

    panel.appendChild(head);
    panel.appendChild(body);
    content.insertBefore(panel, empty);

    const sideItem = buildSideItem(id, category.icon || "📁", category.name, links.length);
    sideNav.appendChild(sideItem);

    panels.push({ panel: panel, sideItem: sideItem, name: category.name });
  });

  initSorting();

  function setCollapsed(panel, head, collapsed) {
    panel.classList.toggle("is-collapsed", collapsed);
    head.setAttribute("aria-expanded", collapsed ? "false" : "true");
  }

  function renderRecent() {
    let items = [];
    if (SETTINGS.showRecent) {
      items = store
        .get("nav:recent", [])
        .slice()
        .sort((a, b) => b.count - a.count || b.ts - a.ts)
        .slice(0, SETTINGS.recentCount);
    }

    const show = !!SETTINGS.showRecent && items.length > 0;
    recentPanel.hidden = !show;

    const navItem = sideNav.querySelector('[data-target="panel-recent"]');
    if (show) {
      recentCount.textContent = items.length;
      recentGrid.innerHTML = "";
      items.forEach((item) => recentGrid.appendChild(buildPill(item)));
      if (navItem) navItem.hidden = false;
    } else {
      recentGrid.innerHTML = "";
      if (navItem) navItem.hidden = true;
    }
  }

  if (SETTINGS.showRecent) {
    const recentNav = buildSideItem("panel-recent", "⏱", "常用站点", "♥");
    sideNav.insertBefore(recentNav, sideNav.firstChild);
  }

  /* ───────────────── 拖拽排序（分类标题 / 分类内卡片） ─────────────────
     排序只写进 localStorage，不动 data.js —— 属于"本机偏好"，
     和折叠状态、主题、搜索历史放在一起，清浏览器数据即恢复。 */

  const sortTip = document.createElement("div");
  sortTip.className = "sort-tip";
  sortTip.innerHTML = '<span></span><button type="button">重置排序</button>';
  sortTip.querySelector("span").textContent =
    "自定义排序已启用：拖动分类标题可换分类顺序，拖动卡片可换链接顺序；改动只存在本机浏览器里，配置文件不受影响。";
  content.insertBefore(sortTip, content.firstChild);

  function hasCustomOrder() {
    try {
      if (Array.isArray(store.get("nav:panel-order", null)) && store.get("nav:panel-order", null).length) return true;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.indexOf("nav:link-order:") === 0) return true;
      }
    } catch (e) {}
    return false;
  }

  if (hasCustomOrder()) sortTip.classList.add("is-on");

  sortTip.querySelector("button").addEventListener("click", () => {
    try {
      const doomed = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key === "nav:panel-order" || key.indexOf("nav:link-order:") === 0) doomed.push(key);
      }
      for (let i = 0; i < doomed.length; i++) localStorage.removeItem(doomed[i]);
    } catch (e) {}
    location.reload();
  });

  let dragState = null; // { type: 'pill'|'panel', el, ... , moved }

  function initSorting() {
    const clearTargets = () => {
      const list = document.querySelectorAll(".is-drop-target");
      for (let i = 0; i < list.length; i++) list[i].classList.remove("is-drop-target");
    };

    function savePillOrder(grid, catName) {
      const arr = [];
      const kids = grid.children;
      for (let i = 0; i < kids.length; i++) {
        if (kids[i].dataset && kids[i].dataset.name) arr.push(kids[i].dataset.name);
      }
      store.set("nav:link-order:" + catName, arr);
    }

    function savePanelOrder() {
      const names = {};
      panels.forEach((p) => {
        names[p.panel.id] = p.name;
      });
      const order = [];
      const kids = content.querySelectorAll(".panel");
      for (let i = 0; i < kids.length; i++) {
        if (names[kids[i].id]) order.push(names[kids[i].id]);
      }
      store.set("nav:panel-order", order);
    }

    function endDrag() {
      const state = dragState;
      if (!state) return;
      dragState = null;
      state.el.classList.remove("is-dragging");
      clearTargets();
      dragEndAt = Date.now();
      if (!state.moved) return;
      if (state.type === "pill") savePillOrder(state.grid, state.name);
      else savePanelOrder();
      sortTip.classList.add("is-on");
    }

    panels.forEach((entry) => {
      const grid = entry.panel.querySelector(".link-grid");
      const head = entry.panel.querySelector(".panel-head");

      /* ── 分类内：卡片换位置 ── */
      if (grid) {
        const pills = grid.querySelectorAll(".pill");
        for (let i = 0; i < pills.length; i++) pills[i].draggable = true;

        grid.addEventListener("dragstart", (ev) => {
          const pill = ev.target.closest ? ev.target.closest(".pill") : null;
          if (!pill || pill.parentNode !== grid) return;
          dragState = { type: "pill", el: pill, grid: grid, name: entry.name, moved: false };
          pill.classList.add("is-dragging");
          try {
            ev.dataTransfer.setData("text/plain", pill.dataset.name || "");
            ev.dataTransfer.effectAllowed = "move";
          } catch (e) {}
        });

        grid.addEventListener("dragover", (ev) => {
          const st = dragState;
          if (!st || st.type !== "pill" || st.grid !== grid) return;
          if (!grid.firstElementChild) return;
          ev.preventDefault();
          try {
            ev.dataTransfer.dropEffect = "move";
          } catch (e) {}
          const over = ev.target.closest ? ev.target.closest(".pill") : null;
          if (!over || over === st.el || over.parentNode !== grid) return;

          const rect = over.getBoundingClientRect();
          const firstRect = grid.firstElementChild.getBoundingClientRect();
          /* 同一行且卡片比容器窄 → 多列网格，按左右分；否则按上下分 */
          const rowLayout = Math.abs(rect.top - firstRect.top) < 4 && rect.width < grid.clientWidth - 40;
          const after = rowLayout
            ? ev.clientX > rect.left + rect.width / 2
            : ev.clientY > rect.top + rect.height / 2;
          const ref = after ? over.nextSibling : over;
          if (ref === st.el) return; // 位置没变
          grid.insertBefore(st.el, ref);
          st.moved = true;
        });

        grid.addEventListener("dragend", endDrag);
      }

      /* ── 分类间：拖标题栏换分类顺序 ── */
      if (head) {
        head.draggable = true;
        head.addEventListener("dragstart", (ev) => {
          if (dragState) return;
          dragState = { type: "panel", el: entry.panel, moved: false };
          entry.panel.classList.add("is-dragging");
          try {
            ev.dataTransfer.setData("text/plain", entry.name);
            ev.dataTransfer.effectAllowed = "move";
          } catch (e) {}
        });
        head.addEventListener("dragend", endDrag);
      }
    });

    content.addEventListener("dragover", (ev) => {
      const st = dragState;
      if (!st || st.type !== "panel") return;
      const target = ev.target.closest ? ev.target.closest(".panel") : null;
      if (!target || target === st.el) return;
      const tgt = panels.filter((p) => p.panel === target)[0];
      if (!tgt) return; // 常用站点固定在最前，不参与排序
      ev.preventDefault();
      try {
        ev.dataTransfer.dropEffect = "move";
      } catch (e) {}
      clearTargets();
      target.classList.add("is-drop-target");

      const rect = target.getBoundingClientRect();
      const after = ev.clientY > rect.top + rect.height / 2;
      content.insertBefore(st.el, after ? target.nextSibling : target);

      const src = panels.filter((p) => p.panel === st.el)[0];
      if (src) sideNav.insertBefore(src.sideItem, after ? tgt.sideItem.nextSibling : tgt.sideItem);
      st.moved = true;
    });

    content.addEventListener("drop", (ev) => {
      ev.preventDefault();
    });
    document.addEventListener("dragend", endDrag);
  }

  /* ───────────────────────── 搜索：分词 / 打分 / 高亮 ───────────────────────── */

  function tokenize(query) {
    return String(query).toLowerCase().trim().split(/\s+/).filter(Boolean);
  }

  /** 子序列匹配：返回惩罚值（越小越好），-1 表示不匹配 */
  function subseqPenalty(hay, token) {
    let cursor = 0;
    let first = -1;
    let last = -1;
    for (let i = 0; i < token.length; i++) {
      const idx = hay.indexOf(token[i], cursor);
      if (idx < 0) return -1;
      if (first < 0) first = idx;
      last = idx;
      cursor = idx + 1;
    }
    return first * 2 + (last - first + 1 - token.length) * 2;
  }

  function scoreToken(hay, token) {
    let best = -1;
    const substr = (h, base, startBonus) => {
      if (!h) return -1;
      const i = h.indexOf(token);
      if (i < 0) return -1;
      return base + (i === 0 ? startBonus : 0) - i * 3;
    };

    best = Math.max(best, substr(hay.name, 1000, 300));
    best = Math.max(best, substr(hay.py, 960, 280));
    best = Math.max(best, substr(hay.pyFull, 940, 260));
    best = Math.max(best, substr(hay.desc, 700, 120));
    best = Math.max(best, substr(hay.url, 640, 100));

    /* 命中分类名 / 分类拼音：整类的链接都能被搜出来，但分值低于直接命中站点 */
    best = Math.max(best, substr(hay.cat, 340, 80));
    best = Math.max(best, substr(hay.catPy, 320, 70));
    best = Math.max(best, substr(hay.catPyFull, 300, 60));

    const penalty = subseqPenalty(hay.name, token);
    if (penalty >= 0) best = Math.max(best, 420 - penalty);
    const catPenalty = subseqPenalty(hay.catPyFull, token);
    if (catPenalty >= 0) best = Math.max(best, 260 - catPenalty);

    return best;
  }

  function scoreEntry(entry, tokens) {
    let total = 0;
    for (let i = 0; i < tokens.length; i++) {
      const s = scoreToken(entry.hay, tokens[i]);
      if (s < 0) return -1;
      total += s;
    }
    return total;
  }

  function rank(query) {
    const tokens = tokenize(query);
    if (!tokens.length) return [];
    const out = [];
    for (let i = 0; i < entries.length; i++) {
      const score = scoreEntry(entries[i], tokens);
      if (score >= 0) out.push({ entry: entries[i], score: score });
    }
    out.sort((a, b) => b.score - a.score || a.entry.hay.name.localeCompare(b.entry.hay.name));
    return out;
  }

  function highlightFragment(text, tokens) {
    const lower = text.toLowerCase();
    const ranges = [];
    tokens.forEach((t) => {
      if (!t) return;
      let i = lower.indexOf(t);
      while (i >= 0) {
        ranges.push([i, i + t.length]);
        i = lower.indexOf(t, i + t.length);
      }
    });
    if (!ranges.length) return document.createTextNode(text);

    ranges.sort((a, b) => a[0] - b[0]);
    const merged = [ranges[0]];
    for (let i = 1; i < ranges.length; i++) {
      const last = merged[merged.length - 1];
      if (ranges[i][0] <= last[1]) last[1] = Math.max(last[1], ranges[i][1]);
      else merged.push(ranges[i]);
    }

    const frag = document.createDocumentFragment();
    let cursor = 0;
    merged.forEach(([start, end]) => {
      if (start > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, start)));
      const mark = document.createElement("mark");
      mark.textContent = text.slice(start, end);
      frag.appendChild(mark);
      cursor = end;
    });
    if (cursor < text.length) frag.appendChild(document.createTextNode(text.slice(cursor)));
    return frag;
  }

  function setHighlight(entry, tokens) {
    if (!tokens) {
      if (entry.marked) {
        entry.nameEl.textContent = entry.link.name;
        entry.marked = false;
      }
      return;
    }
    entry.nameEl.textContent = "";
    entry.nameEl.appendChild(highlightFragment(entry.link.name, tokens));
    entry.marked = true;
  }

  /* ───────────────────────── 搜索建议下拉 ───────────────────────── */

  let suggestionRows = [];
  let activeIndex = -1;

  function hideSuggestions() {
    suggestions.hidden = true;
    suggestions.innerHTML = "";
    input.setAttribute("aria-expanded", "false");
    suggestionRows = [];
    activeIndex = -1;
  }

  function setActive(index) {
    const rows = suggestions.querySelectorAll(".suggestion");
    if (!rows.length) return;
    const next = ((index % rows.length) + rows.length) % rows.length;
    rows.forEach((row, i) => {
      const on = i === next;
      row.classList.toggle("is-active", on);
      row.setAttribute("aria-selected", on ? "true" : "false");
      if (on) row.scrollIntoView({ block: "nearest" });
    });
    activeIndex = next;
  }

  function buildSuggestionRow(entry, index) {
    const row = document.createElement("div");
    row.className = "suggestion";
    row.setAttribute("role", "option");
    row.dataset.index = String(index);

    row.appendChild(createIcon(entry.link));

    const body = document.createElement("span");
    body.className = "suggestion-body";
    const name = document.createElement("span");
    name.className = "suggestion-name";
    name.textContent = entry.link.name;
    body.appendChild(name);
    if (entry.link.desc) {
      const desc = document.createElement("span");
      desc.className = "suggestion-desc";
      desc.textContent = entry.link.desc;
      body.appendChild(desc);
    }
    row.appendChild(body);

    const cat = document.createElement("span");
    cat.className = "suggestion-cat";
    cat.textContent = entry.panelName;
    row.appendChild(cat);
    return row;
  }

  function buildSearchRow(query) {
    const row = document.createElement("div");
    row.className = "suggestion suggestion-action";
    row.setAttribute("role", "option");
    row.dataset.index = String(suggestionRows.length - 1);

    const mag = document.createElement("span");
    mag.className = "suggestion-glyph";
    mag.textContent = "🔍";
    row.appendChild(mag);

    const body = document.createElement("span");
    body.className = "suggestion-body";
    const name = document.createElement("span");
    name.className = "suggestion-name";
    name.textContent = "用 " + currentEngine().name + " 搜索网页";
    body.appendChild(name);
    row.appendChild(body);

    const kbd = document.createElement("kbd");
    kbd.className = "kbd";
    kbd.textContent = "Enter";
    row.appendChild(kbd);
    return row;
  }

  function renderSuggestions(query, ranked) {
    suggestionRows = ranked.map((r) => ({ type: "link", entry: r.entry }));
    suggestionRows.push({ type: "search" });

    suggestions.innerHTML = "";
    ranked.forEach((r, i) => suggestions.appendChild(buildSuggestionRow(r.entry, i)));
    suggestions.appendChild(buildSearchRow(query));

    suggestions.hidden = false;
    input.setAttribute("aria-expanded", "true");
    setActive(0);
  }

  function activateSuggestion(index) {
    const row = suggestionRows[index];
    if (!row) return;
    hideSuggestions();
    if (row.type === "link") openLink(row.entry.link);
    else searchWeb(input.value.trim());
  }

  suggestions.addEventListener("mousedown", (ev) => ev.preventDefault()); // 保持输入框焦点
  suggestions.addEventListener("click", (ev) => {
    const row = ev.target.closest(".suggestion");
    if (!row) return;
    activateSuggestion(Number(row.dataset.index));
  });

  input.addEventListener("blur", () => {
    setTimeout(() => {
      if (document.activeElement !== input) hideSuggestions();
    }, 150);
  });

  /* ───────────────────────── 过滤：面板 + 高亮 + 建议 ───────────────────────── */

  let lastRanked = [];

  function renderHint(query, count) {
    hint.innerHTML = "";
    hint.hidden = false;
    if (count > 0) {
      hint.appendChild(
        document.createTextNode("找到 " + count + " 个结果 · ↑↓ 选择 · Enter 打开 · Esc 清除")
      );
    } else {
      hint.appendChild(document.createTextNode("没有匹配的链接 · 按 Enter 用 "));
      hint.appendChild(engineButton(currentEngine().name, query));
      hint.appendChild(document.createTextNode(" 搜索网页"));
    }
  }

  function renderEmpty(query) {
    empty.innerHTML = "";
    empty.hidden = false;
    empty.appendChild(document.createTextNode("没有找到匹配的链接 · "));
    empty.appendChild(engineButton('用 ' + currentEngine().name + ' 搜索 “' + query + '”', query));
  }

  function applyFilter() {
    const query = input.value.trim();
    const tokens = tokenize(query);

    if (!tokens.length) {
      content.classList.remove("is-searching");
      entries.forEach((entry) => {
        entry.pill.classList.remove("is-hidden");
        setHighlight(entry, null);
      });
      panels.forEach((p) => {
        p.panel.classList.remove("is-hidden");
        p.sideItem.classList.remove("is-dimmed");
      });
      hint.hidden = true;
      empty.hidden = true;
      lastRanked = [];
      hideSuggestions();
      renderRecent();
      updateSpy();
      return;
    }

    content.classList.add("is-searching");
    recentPanel.hidden = true;
    hint.hidden = true;
    empty.hidden = true;

    const counts = new Map();
    let count = 0;

    entries.forEach((entry) => {
      const hit = scoreEntry(entry, tokens) >= 0;
      entry.pill.classList.toggle("is-hidden", !hit);
      setHighlight(entry, hit ? tokens : null);
      if (hit) {
        count++;
        counts.set(entry.panel, (counts.get(entry.panel) || 0) + 1);
      }
    });

    panels.forEach((p) => {
      const hidden = !counts.get(p.panel);
      p.panel.classList.toggle("is-hidden", hidden);
      p.sideItem.classList.toggle("is-dimmed", hidden);
    });

    lastRanked = rank(query);
    renderHint(query, count);

    if (count > 0) empty.hidden = true;
    else renderEmpty(query);

    if (document.activeElement === input) renderSuggestions(query, lastRanked.slice(0, 7));
    else hideSuggestions();
  }

  function refreshSearch() {
    applyFilter();
  }

  function clearSearch() {
    if (!input.value) return;
    input.value = "";
    applyFilter();
  }

  /* ───────────────────────── 侧边栏高亮（滚动定位） ───────────────────────── */

  let activeId = null;

  function setActiveSide(id) {
    if (activeId === id) return;
    activeId = id;
    let activeItem = null;
    sideNav.querySelectorAll(".side-item").forEach((item) => {
      const on = item.dataset.target === id;
      item.classList.toggle("is-active", on);
      if (on) activeItem = item;
    });
    ensureSideItemVisible(activeItem);
  }

  /** 分类变多后侧栏可能放不下：把高亮项滚进可视区（竖排 / 横排都兼容） */
  function ensureSideItemVisible(item) {
    if (!item) return;
    const navRect = sideNav.getBoundingClientRect();
    const rect = item.getBoundingClientRect();

    if (sideNav.scrollHeight > sideNav.clientHeight + 1) {
      if (rect.top < navRect.top) sideNav.scrollTop -= navRect.top - rect.top + 6;
      else if (rect.bottom > navRect.bottom) sideNav.scrollTop += rect.bottom - navRect.bottom + 6;
    }
    if (sideNav.scrollWidth > sideNav.clientWidth + 1) {
      if (rect.left < navRect.left) sideNav.scrollLeft -= navRect.left - rect.left + 8;
      else if (rect.right > navRect.right) sideNav.scrollLeft += rect.right - navRect.right + 8;
    }
  }

  function updateSpy() {
    if (content.classList.contains("is-searching")) return;
    const line = window.scrollY + 140;
    const candidates = [];

    if (!recentPanel.hidden) candidates.push(recentPanel);
    panels.forEach((p) => {
      if (!p.panel.classList.contains("is-hidden")) candidates.push(p.panel);
    });

    let current = null;
    candidates.forEach((el) => {
      if (el.getBoundingClientRect().top + window.scrollY <= line) current = el.id;
    });

    /* 已经滚到页面底部时，最后一个可见面板就是当前项 —— 否则最后几个分类永远选不中 */
    const atBottom =
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8;
    if (atBottom && candidates.length) {
      current = candidates[candidates.length - 1].id;
    } else if (!current && candidates.length) {
      current = candidates[0].id;
    }
    if (current) setActiveSide(current);
  }

  let spyTicking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (spyTicking) return;
      spyTicking = true;
      requestAnimationFrame(() => {
        spyTicking = false;
        updateSpy();
      });
    },
    { passive: true }
  );

  /* ───────────────────────── 交互 ───────────────────────── */

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const query = input.value.trim();
    if (!query) return;
    if (!suggestions.hidden && activeIndex >= 0) {
      activateSuggestion(activeIndex);
      return;
    }
    if (lastRanked.length) {
      openLink(lastRanked[0].entry.link);
      input.select();
      return;
    }
    searchWeb(query);
  });

  input.addEventListener("input", applyFilter);

  /* 用 “/” 聚焦时，若框里已有内容，重新展示建议 */
  input.addEventListener("focus", () => {
    if (input.value.trim()) applyFilter();
  });

  input.addEventListener("keydown", (ev) => {
    const open = !suggestions.hidden;

    if (ev.key === "ArrowDown" || (ev.key === "Tab" && open)) {
      if (!open) return;
      ev.preventDefault();
      setActive(activeIndex + (ev.key === "Tab" && ev.shiftKey ? -1 : 1));
      return;
    }
    if (ev.key === "ArrowUp") {
      if (!open) return;
      ev.preventDefault();
      setActive(activeIndex - 1);
      return;
    }
    if (ev.key === "Enter") {
      if (open) {
        ev.preventDefault();
        activateSuggestion(activeIndex);
      }
      return;
    }
    if (ev.key === "Escape") {
      ev.preventDefault();
      if (open) {
        hideSuggestions();
        input.blur();
      } else {
        input.value = "";
        applyFilter();
        input.blur();
      }
    }
  });

  /* ───────────────────────── 回到顶部 ───────────────────────── */

  const toTop = $("to-top");

  function syncToTop() {
    toTop.hidden = window.scrollY < 520;
  }
  window.addEventListener("scroll", syncToTop, { passive: true });
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  syncToTop();

  function focusSearch() {
    input.focus();
    input.select();
    /* 兜底：窗口未获得焦点时 focus 事件可能不触发，这里主动刷新一次建议 */
    if (input.value.trim()) applyFilter();
  }

  document.addEventListener("keydown", (ev) => {
    const el = document.activeElement;
    const typing =
      el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);

    /* Ctrl / ⌘ + K：通用"聚焦搜索"快捷键 */
    if ((ev.ctrlKey || ev.metaKey) && (ev.key === "k" || ev.key === "K")) {
      ev.preventDefault();
      focusSearch();
      return;
    }
    /* Esc：先关配色弹层，再收下拉，再清空 */
    if (ev.key === "Escape" && !palettePop.hidden) {
      closePalette();
      return;
    }
    if (ev.key === "/" && !typing) {
      ev.preventDefault();
      focusSearch();
      return;
    } else if (ev.key === "Escape" && !suggestions.hidden) {
      hideSuggestions();
    }
  });

  /* ───────────────────────── 启动 ───────────────────────── */

  try {
    if (validation.issues.length) {
      buildErrorPanel("配置有 " + validation.issues.length + " 处问题", validation.issues, "warn");
    }

    renderRecent();
    applyFilter();
    updateSpy();

    /* 两个探测并行：代理状态 + 远程图标可达性，都定了再统一刷图标队列 */
    Promise.all([detectProxy(), detectRemoteIcons()]).then(flushIcons);
    window.__APP_READY__ = true;

    if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target)
        setTimeout(() => {
          target.scrollIntoView({ block: "start" });
          syncToTop(); // hash 直达也会改变滚动位置
        }, 60);
    }
  } catch (err) {
    buildErrorPanel("页面渲染出错了", [String(err && err.stack ? err.stack : err)], "error");
  }
})();
