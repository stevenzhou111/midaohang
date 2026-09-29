/* js/config.js —— 配置校验与归一化（无 DOM 依赖）
   ------------------------------------------------------------------
   从 app.js 原样抽出。职责有两条：
     1. validateConfig：把 data.js 的"能救的"条目救下来、"救不了的"列成问题清单，
        绝不因为一条脏数据让整页白屏；
     2. normalizeSettings：settings 的数值夹逼与类型收敛（脏值会让 slice/排序出意外结果）。
   抽成模块是为了能脱离浏览器跑断言，也为了让 tests.html 的规则有一份"实现侧"参照。 */

/** 只放行 http(s) 链接。javascript: / data: 一律拒绝。
    data.js 里的条目在 validateConfig 里过这关；「常用站点」是从 localStorage 读出来的，
    没有这道校验，所以渲染前还要再兜一次。 */
const SAFE_URL = /^(https?:\/\/)/i;

export function safeUrl(u) {
  const s = String(u == null ? "" : u).trim();
  return SAFE_URL.test(s) ? s : "";
}

/**
 * 校验 SITE 配置。
 * @param {object} site        window.SITE（data.js 的产物）
 * @param {object|null} bootError  index.html 里那个内联脚本抓到的 data.js 语法错误
 * @returns {{fatal: string[], issues: string[], categories: object[]}}
 *   fatal   —— 致命错误，页面只能显示错误面板
 *   issues  —— 非致命问题，坏条目已跳过，页面照常可用
 */
export function validateConfig(site, bootError) {
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
      if (!safeUrl(link.url)) {
        issues.push("链接「" + link.name + "」的 url 必须以 http:// 或 https:// 开头，已跳过");
        return;
      }
      links.push(link);
    });

    categories.push(Object.assign({}, cat, { name: name, links: links }));
  });

  return { fatal: fatal, issues: issues, categories: categories };
}

/**
 * settings 也要防脏值：recentCount 传 -1 / 1.5 / "8" 都会让 slice() 出乎意料，
 * faviconProxy 传非字符串会在后面拼接时炸掉。
 * 这里是就地修改（Object.assign 的结果本来就是新对象），返回同一个引用方便链式用。
 */
export function normalizeSettings(settings) {
  const n = +settings.recentCount;
  settings.recentCount = Number.isFinite(n) ? Math.max(0, Math.min(50, Math.floor(n))) : 8;
  settings.showRecent = settings.showRecent !== false;
  settings.linkOrder = settings.linkOrder === "name" ? "name" : "config";
  settings.faviconProxy = typeof settings.faviconProxy === "string" ? settings.faviconProxy.trim() : "";
  return settings;
}
