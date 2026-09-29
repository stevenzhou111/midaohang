/* js/icons-index.js —— 本地图标库索引（无 DOM 依赖）
   ------------------------------------------------------------------
   图标是按**域名**索引的，而 data.js 里的链接地址会变（kimi.moonshot.cn → www.kimi.com），
   地址一改图标就掉回首字母。这个模块负责三件事：
     1. 把 ICONS（品牌 SVG）+ ICONS_IMG（真实 favicon data URI）合成一张表；
     2. 兼容有无 www. 两种写法；
     3. 应用 data.js 里的 iconAlias，把新域名接回老 key。
   独立成模块是因为它有自己的输入（两个图标库 + 别名表）和明确的输出（一张查表），
   很容易在 Node 里用假数据断言。 */

/** 去掉 www. 前缀并小写，作为索引的统一 key 形式 */
export function bareHost(h) {
  return String(h == null ? "" : h)
    .replace(/^www\./, "")
    .toLowerCase();
}

/**
 * 建索引。
 * @param {object} svgLib   window.ICONS    —— key 为域名，值为 '<svg …>' 字符串
 * @param {object} imgLib   window.ICONS_IMG —— key 为域名，值为 'data:image/…;base64,…'
 * @param {object} alias    data.js 的 settings 之外的 iconAlias（可选）
 */
export function buildIconIndex(svgLib, imgLib, alias) {
  const idx = Object.create(null);

  [svgLib || {}, imgLib || {}].forEach((src) => {
    Object.keys(src).forEach((key) => {
      const bare = bareHost(key);
      idx[key] = src[key];
      if (!idx[bare]) idx[bare] = src[key];
      if (!idx["www." + bare]) idx["www." + bare] = src[key];
    });
  });

  /* iconAlias：把新域名接回图标库里已有的老域名 */
  const map = alias || {};
  Object.keys(map).forEach((host) => {
    const to = bareHost(host);
    const from = bareHost(map[host]);
    if (!to || !from || idx[to]) return; // 已经有自己的图标就别覆盖
    if (idx[from]) {
      idx[to] = idx[from];
      idx["www." + to] = idx[from];
    }
  });

  return idx;
}

/**
 * 生成查询函数：给定 host 返回图标字符串（'<svg…>' 或 'data:image/…'），没有则空串。
 * 闭包持有索引，位图库异步到货后用 buildIconIndex 重建再调一次即可（见 app.js 的 refreshLocalIcons）。
 */
export function createLocalIconLookup(index) {
  return function localIconFor(host) {
    if (!host) return "";
    const h = String(host).toLowerCase();
    return index[h] || index[h.replace(/^www\./, "")] || index["www." + h] || "";
  };
}
