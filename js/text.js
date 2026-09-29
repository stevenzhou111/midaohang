/* js/text.js —— 搜索的纯文本处理（无 DOM、无全局状态，可直接单元测试）
   ------------------------------------------------------------------
   从 app.js 原样抽出来的四个函数，行为一字未改。
   抽出来的理由：搜索打分是整个站最容易写错、又最难靠肉眼验证的部分
   （分值权重、拼音别名、分类命中、子序列回退全在里面），
   拆成独立模块后就能在 Node 里 import 出来跑断言，不必开浏览器。

   ⚠️ 改这个文件时注意：查询和被检索文本必须走同一套归一化（foldText），
   否则全角字符搜不到、py / pyFull 别名对不上。
   ⚠️ 改完记得让 app.js 的 import 保持一致；本文件不能依赖任何 DOM。 */

/** NFKC 归一化 + 小写：全角字母数字（ＡＢＣ、１２３）、部分输入法打出的兼容字符都能被归一化成半角 */
export function foldText(s) {
  try {
    return String(s == null ? "" : s).normalize("NFKC").toLowerCase();
  } catch (e) {
    return String(s == null ? "" : s).toLowerCase();
  }
}

/** 查询分词：按空白切分，丢弃空片段 */
export function tokenize(query) {
  return foldText(query).trim().split(/\s+/).filter(Boolean);
}

/** 子序列匹配：返回惩罚值（越小越好），-1 表示不匹配 */
export function subseqPenalty(hay, token) {
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

/**
 * 单个 token 对一条链接的打分，-1 表示不匹配。
 * hay 由 buildHay() 组装，字段全是 foldText 之后的值：
 *   name / py / pyFull / desc / url            —— 链接自身
 *   cat / catPy / catPyFull                    —— 所属分类（含 categoryAlias 别名）
 * 分值梯度（前缀命中 > 字段靠前命中 > 描述命中 > 子序列回退 > 分类命中），
 * 改权重时保持这个顺序关系，否则搜索结果排序会突然变样。
 */
export function scoreToken(hay, token) {
  if (!token) return -1;
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
