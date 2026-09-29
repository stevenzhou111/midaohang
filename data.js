/**
 * 导航站配置文件 —— 改这个文件就能更新整站内容。
 * 保存并 push 到 Git，Cloudflare Pages 会自动重新部署。
 *
 * ── 顶层字段 ─────────────────────────────────────────
 *   siteName   站点标题
 *   subtitle   标题下的说明（可空）
 *   footer     底部文字（可空）
 *   settings   行为设置
 *   categoryAlias  分类搜索别名（可空）：给分类名配拼音 / 英文，
 *                  这样输 "sheji"、"design" 也能搜出"设计灵感"整类
 *
 * ── settings ────────────────────────────────────────
 *   defaultEngine  默认搜索引擎："google" | "bing" | "baidu" | "github"
 *   linkOrder      链接排序："config"（按你写的顺序）| "name"（按名称排序）
 *   showRecent     是否显示"常用站点"卡片（自动记录点击）
 *   recentCount    常用卡片最多显示几条
 *   faviconProxy   图标代理地址，留空 "" 则只走 Google / DuckDuckGo 直连。
 *                  国内建议部署 favicon-worker 后保持默认 "/favicon"，
 *                  详见 README《图标在国内全挂怎么办》。
 *
 * ── categories ──────────────────────────────────────
 *   name     分类名（必填）
 *   icon     分类 emoji，如 "🚀"（可选）
 *   collapsed  初始是否收起 true/false（可选）
 *   order    覆盖全局排序："config" | "name"（可选）
 *   links[]  链接
 *       name    名称（必填）
 *       url     地址，必须 http:// 开头（必填）
 *       desc    描述（可选，建议 8 字以内）
 *       icon    自定义图标地址，填了就不走自动 Favicon（可选）
 *       py      中文名的拼音首字母，如 网易云音乐 → "wyyy"（可选但强烈建议）
 *       pyFull  中文名的完整拼音，如 百度 → "baidu"（可选）
 *               只有填了这两个字段，"wy"、"baidu" 才能搜到中文站点。
 *
 * ── 图标 ────────────────────────────────────────────
 *   品牌 logo 存在 icons.js（域名 → SVG），优先于一切远程 Favicon。
 *   新增站点想要图标：往 icons.js 的 Object.assign 里加一行即可，详见 README。
 */
window.SITE = {
  siteName: "我的导航",
  subtitle: "常用站点，一键直达",
  footer: "由 Cloudflare Pages 托管",

  settings: {
    defaultEngine: "google",
    linkOrder: "config",
    showRecent: true,
    recentCount: 8,
    faviconProxy: "", // 图标代理地址；"" = 直连 Google/DDG。只有部署了 favicon-worker 才填它的地址
  },

  /* 分类搜索别名：分类名 → "拼音首字母 完整拼音 英文"（可选）
     加了它，搜 "design" / "sheji" / "sjlg" 都能命中"设计灵感"整类 */
  categoryAlias: {
    "常用": "changyong common favorites",
    "AI 工具": "ai artificial intelligence",
    "开发工具": "kaifagongju dev development tools",
    "文档与教程": "wendang docs tutorial learn",
    "设计灵感": "sheji design ui ux",
    "资讯社区": "zixun news community",
    "影音娱乐": "yingyin entertainment music video",
    "效率办公": "xiaolv office productivity",
    "云服务与账户": "yun cloud server",
    "编程刷题": "biancheng shuati leetcode algorithm",
    "在线课程": "zaixian kecheng course mooc",
    "学术与阅读": "xueshu paper academic reading",
    "旅行出行": "lvxing travel trip map",
    "购物比价": "gouwu shopping price",
    "在线工具": "gongju tools utility",
    "游戏娱乐": "youxi games entertainment",
    "社交通讯": "shejiao chat social im",
    "财经行情": "caijing finance stock market",
    "科技前沿": "keji tech news frontier",
    "AI 模型与开发": "aimoxing llm open source ai",
    "运动健康": "yundong health fitness sport",
  },

  categories: [
    /* ───────── 常用 ───────── */
    {
      name: "常用",
      icon: "⭐",
      links: [
        { name: "GitHub", url: "https://github.com", desc: "代码托管与协作" },
        { name: "Google", url: "https://www.google.com", desc: "搜索" },
        { name: "Cloudflare 控制台", url: "https://dash.cloudflare.com", desc: "DNS / Pages / Workers", py: "kzt" },
        { name: "Gmail", url: "https://mail.google.com", desc: "邮箱" },
        { name: "YouTube", url: "https://www.youtube.com", desc: "视频" },
        { name: "百度", url: "https://www.baidu.com", desc: "搜索", py: "bd", pyFull: "baidu" },
        { name: "淘宝", url: "https://www.taobao.com", desc: "购物", py: "tb", pyFull: "taobao" },
        { name: "Bilibili", url: "https://www.bilibili.com", desc: "弹幕视频", py: "blbl", pyFull: "bilibili" },
      ],
    },

    /* ───────── AI ───────── */
    {
      name: "AI 工具",
      icon: "🤖",
      links: [
        { name: "ChatGPT", url: "https://chatgpt.com", desc: "OpenAI 对话" },
        { name: "Claude", url: "https://claude.ai", desc: "Anthropic 对话" },
        { name: "Gemini", url: "https://gemini.google.com", desc: "Google 对话" },
        { name: "DeepSeek", url: "https://chat.deepseek.com", desc: "深度求索", py: "sdqs" },
        { name: "Kimi", url: "https://kimi.moonshot.cn", desc: "长文本助手" },
        { name: "通义千问", url: "https://tongyi.aliyun.com", desc: "阿里 AI", py: "tyqw", pyFull: "tongyiqianwen" },
        { name: "硅基流动", url: "https://siliconflow.cn", desc: "开源模型托管", py: "gjld", pyFull: "guijiliudong" },
        { name: "秘塔搜索", url: "https://metaso.cn", desc: "无广告 AI 搜索", py: "mtss", pyFull: "mitasousuo" },
        { name: "Midjourney", url: "https://www.midjourney.com", desc: "AI 绘图" },
        { name: "Poe", url: "https://poe.com", desc: "多模型聚合" },
      ],
    },

    /* ───────── 开发 ───────── */
    {
      name: "开发工具",
      icon: "🛠️",
      links: [
        { name: "MDN Web Docs", url: "https://developer.mozilla.org", desc: "Web 权威文档" },
        { name: "Stack Overflow", url: "https://stackoverflow.com", desc: "问答社区" },
        { name: "Can I Use", url: "https://caniuse.com", desc: "兼容性查询" },
        { name: "CodePen", url: "https://codepen.io", desc: "在线 Demo" },
        { name: "VS Code Web", url: "https://vscode.dev", desc: "浏览器版编辑器" },
        { name: "RegEx101", url: "https://regex101.com", desc: "正则调试" },
        { name: "JSON 格式化", url: "https://jsonformatter.org", desc: "校验与美化", py: "gsh" },
        { name: "Crontab Guru", url: "https://crontab.guru", desc: "定时表达式" },
        { name: "Postman", url: "https://www.postman.com", desc: "接口调试" },
        { name: "npm", url: "https://www.npmjs.com", desc: "包 registry" },
        { name: "Excalidraw", url: "https://excalidraw.com", desc: "手绘风白板" },
        { name: "DevDocs", url: "https://devdocs.io", desc: "离线文档聚合" },
      ],
    },

    /* ───────── 文档 ───────── */
    {
      name: "文档与教程",
      icon: "📚",
      links: [
        { name: "React 官方文档", url: "https://react.dev", desc: "中文版", py: "gfwz" },
        { name: "Vue 官方文档", url: "https://vuejs.org", desc: "渐进式框架", py: "gfwz" },
        { name: "TypeScript 手册", url: "https://www.typescriptlang.org/docs", desc: "类型系统", py: "sc" },
        { name: "Node.js 文档", url: "https://nodejs.org/docs/latest/api", desc: "API 参考", py: "wd" },
        { name: "Python 文档", url: "https://docs.python.org/3", desc: "官方文档", py: "wd" },
        { name: "Cloudflare 文档", url: "https://developers.cloudflare.com", desc: "边缘计算", py: "wd" },
        { name: "GitHub 文档", url: "https://docs.github.com", desc: "使用指南", py: "wd" },
        { name: "阮一峰的网络日志", url: "https://www.ruanyifeng.com/blog", desc: "科技爱好者周刊", py: "ryfdwlrz", pyFull: "ruanyifeng" },
        { name: "廖雪峰教程", url: "https://liaoxuefeng.com", desc: "Java / Python / JS", py: "lxftc", pyFull: "liaoxuefeng" },
        { name: "freeCodeCamp", url: "https://www.freecodecamp.org", desc: "免费编程课程" },
        { name: "W3School", url: "https://www.w3school.com.cn", desc: "入门速查" },
        { name: "掘金", url: "https://juejin.cn", desc: "技术社区", py: "jj", pyFull: "juejin" },
      ],
    },

    /* ───────── 设计 ───────── */
    {
      name: "设计灵感",
      icon: "🎨",
      links: [
        { name: "Dribbble", url: "https://dribbble.com", desc: "作品灵感" },
        { name: "Behance", url: "https://www.behance.net", desc: "Adobe 作品集" },
        { name: "Figma Community", url: "https://www.figma.com/community", desc: "免费模板" },
        { name: "站酷 ZCOOL", url: "https://www.zcool.com.cn", desc: "中国设计师社区", py: "zk", pyFull: "zhanku" },
        { name: "花瓣", url: "https://huaban.com", desc: "素材采集", py: "hb", pyFull: "huaban" },
        { name: "Unsplash", url: "https://unsplash.com", desc: "高清免费图库" },
        { name: "Pexels", url: "https://www.pexels.com", desc: "免费图片视频" },
        { name: "Iconfont", url: "https://www.iconfont.cn", desc: "阿里图标库" },
        { name: "Google Fonts", url: "https://fonts.google.com", desc: "免费字体" },
        { name: "Coolors", url: "https://coolors.co", desc: "配色生成器" },
      ],
    },

    /* ───────── 资讯 ───────── */
    {
      name: "资讯社区",
      icon: "📰",
      links: [
        { name: "知乎", url: "https://www.zhihu.com", desc: "问答社区", py: "zh", pyFull: "zhihu" },
        { name: "微博", url: "https://weibo.com", desc: "热搜广场", py: "wb", pyFull: "weibo" },
        { name: "少数派", url: "https://sspai.com", desc: "效率与工具", py: "ssp", pyFull: "shaoshupai" },
        { name: "36氪", url: "https://36kr.com", desc: "创投资讯", py: "36k", pyFull: "36kr" },
        { name: "IT之家", url: "https://www.ithome.com", desc: "科技新闻", py: "zj", pyFull: "ithome" },
        { name: "V2EX", url: "https://www.v2ex.com", desc: "创意工作者社区" },
        { name: "Hacker News", url: "https://news.ycombinator.com", desc: "硅谷技术圈" },
        { name: "Reddit", url: "https://www.reddit.com", desc: "全球论坛" },
        { name: "X / Twitter", url: "https://x.com", desc: "实时动态" },
        { name: "Product Hunt", url: "https://www.producthunt.com", desc: "新品发布" },
      ],
    },

    /* ───────── 影音 ───────── */
    {
      name: "影音娱乐",
      icon: "🎬",
      links: [
        { name: "网易云音乐", url: "https://music.163.com", desc: "音乐播放", py: "wyyy", pyFull: "wangyiyunyinyue" },
        { name: "QQ 音乐", url: "https://y.qq.com", desc: "音乐播放", py: "yy", pyFull: "yinyue" },
        { name: "Spotify", url: "https://open.spotify.com", desc: "全球曲库" },
        { name: "豆瓣", url: "https://www.douban.com", desc: "影评书评", py: "db", pyFull: "douban" },
        { name: "Netflix", url: "https://www.netflix.com", desc: "美剧电影" },
        { name: "爱奇艺", url: "https://www.iqiyi.com", desc: "国产剧综", py: "aqy", pyFull: "aiqiyi" },
        { name: "优酷", url: "https://www.youku.com", desc: "影视综艺", py: "yk", pyFull: "youku" },
        { name: "抖音", url: "https://www.douyin.com", desc: "短视频", py: "dy", pyFull: "douyin" },
        { name: "喜马拉雅", url: "https://www.ximalaya.com", desc: "有声内容", py: "xmly", pyFull: "ximalaya" },
        { name: "Twitch", url: "https://www.twitch.tv", desc: "游戏直播" },
      ],
    },

    /* ───────── 效率 ───────── */
    {
      name: "效率办公",
      icon: "🧰",
      links: [
        { name: "Notion", url: "https://www.notion.so", desc: "全能笔记" },
        { name: "语雀", url: "https://www.yuque.com", desc: "知识库", py: "yq", pyFull: "yuque" },
        { name: "腾讯文档", url: "https://docs.qq.com", desc: "在线协作", py: "txwd", pyFull: "tengxunwendang" },
        { name: "石墨文档", url: "https://shimo.im", desc: "多人编辑", py: "smwd", pyFull: "shimowendang" },
        { name: "滴答清单", url: "https://dida365.com", desc: "待办事项", py: "ddqd", pyFull: "didaqingdan" },
        { name: "Trello", url: "https://trello.com", desc: "看板管理" },
        { name: "Google Drive", url: "https://drive.google.com", desc: "云端硬盘" },
        { name: "Zoom", url: "https://zoom.us", desc: "视频会议" },
        { name: "印象笔记", url: "https://www.yinxiang.com", desc: "资料收集", py: "yxbj", pyFull: "yinxiangbiji" },
        { name: "1Password", url: "https://1password.com", desc: "密码管理" },
      ],
    },

    /* ───────── 云服务 ───────── */
    {
      name: "云服务与账户",
      icon: "☁️",
      links: [
        { name: "AWS 控制台", url: "https://aws.amazon.com/console", desc: "亚马逊云", py: "kzt" },
        { name: "阿里云", url: "https://www.aliyun.com", desc: "阿里云计算", py: "aly", pyFull: "aliyun" },
        { name: "腾讯云", url: "https://cloud.tencent.com", desc: "腾讯云计算", py: "txy", pyFull: "tengxunyun" },
        { name: "Google Cloud", url: "https://console.cloud.google.com", desc: "谷歌云" },
        { name: "Vercel", url: "https://vercel.com", desc: "前端托管部署" },
        { name: "Netlify", url: "https://www.netlify.com", desc: "静态站点托管" },
        { name: "Docker Hub", url: "https://hub.docker.com", desc: "镜像仓库" },
        { name: "Namecheap", url: "https://www.namecheap.com", desc: "域名注册" },
      ],
    },

    /* ───────── 刷题 ───────── */
    {
      name: "编程刷题",
      icon: "🧮",
      links: [
        { name: "LeetCode 力扣", url: "https://leetcode.cn", desc: "面试刷题", py: "lk", pyFull: "likou" },
        { name: "牛客网", url: "https://www.nowcoder.com", desc: "笔试面试", py: "wk", pyFull: "niuke" },
        { name: "洛谷", url: "https://www.luogu.com.cn", desc: "OI 题库", py: "lg", pyFull: "luogu" },
        { name: "Codeforces", url: "https://codeforces.com", desc: "算法竞赛" },
        { name: "AtCoder", url: "https://atcoder.jp", desc: "日本算法赛" },
        { name: "AcWing", url: "https://www.acwing.com", desc: "算法刷题课" },
        { name: "LintCode", url: "https://www.lintcode.com", desc: "面试题库" },
        { name: "Codewars", url: "https://www.codewars.com", desc: "编程挑战" },
        { name: "GeeksforGeeks", url: "https://www.geeksforgeeks.org", desc: "算法教程" },
      ],
    },

    /* ───────── 课程 ───────── */
    {
      name: "在线课程",
      icon: "🎓",
      links: [
        { name: "中国大学MOOC", url: "https://www.icourse163.org", desc: "高校公开课", py: "zgdx", pyFull: "zhongguodaxuemooc" },
        { name: "网易公开课", url: "https://open.163.com", desc: "名校课程", py: "wygk", pyFull: "wangyigongkaike" },
        { name: "极客时间", url: "https://time.geekbang.org", desc: "技术专栏", py: "jksj", pyFull: "jikeshijian" },
        { name: "Coursera", url: "https://www.coursera.org", desc: "全球高校课" },
        { name: "edX", url: "https://www.edx.org", desc: "哈佛 MIT 平台" },
        { name: "Khan Academy", url: "https://www.khanacademy.org", desc: "免费公开课" },
        { name: "Udemy", url: "https://www.udemy.com", desc: "实战课程" },
        { name: "MIT OCW", url: "https://ocw.mit.edu", desc: "MIT 全套课" },
        { name: "oeasy", url: "https://www.oeasy.org.cn", desc: "免费入门教程" },
      ],
    },

    /* ───────── 学术 ───────── */
    {
      name: "学术与阅读",
      icon: "📖",
      links: [
        { name: "Google Scholar", url: "https://scholar.google.com", desc: "学术搜索" },
        { name: "arXiv", url: "https://arxiv.org", desc: "论文预印本" },
        { name: "知网 CNKI", url: "https://www.cnki.net", desc: "中文文献", py: "zw", pyFull: "zhiwang" },
        { name: "豆瓣读书", url: "https://book.douban.com", desc: "书评书单", py: "dbs", pyFull: "doubandushu" },
        { name: "微信读书", url: "https://weread.qq.com", desc: "手机看书", py: "wxd", pyFull: "weixindushu" },
        { name: "Semantic Scholar", url: "https://www.semanticscholar.org", desc: "AI 论文检索" },
        { name: "ResearchGate", url: "https://www.researchgate.net", desc: "学者社交" },
        { name: "PubMed", url: "https://pubmed.ncbi.nlm.nih.gov", desc: "生物医学文献" },
        { name: "Kaggle", url: "https://www.kaggle.com", desc: "数据集与竞赛" },
      ],
    },

    /* ───────── 出行 ───────── */
    {
      name: "旅行出行",
      icon: "✈️",
      links: [
        { name: "高德地图", url: "https://www.amap.com", desc: "导航路况", py: "gdt", pyFull: "gaodeditu" },
        { name: "百度地图", url: "https://map.baidu.com", desc: "导航路况", py: "bd", pyFull: "baiduditu" },
        { name: "Google Maps", url: "https://maps.google.com", desc: "海外导航" },
        { name: "铁路 12306", url: "https://www.12306.cn", desc: "火车票购票", py: "12306" },
        { name: "携程旅行", url: "https://www.ctrip.com", desc: "机酒预订", py: "xclx", pyFull: "xiechenglvxing" },
        { name: "去哪儿网", url: "https://www.qunar.com", desc: "比价订票", py: "qew", pyFull: "qunaer" },
        { name: "飞猪", url: "https://www.fliggy.com", desc: "机票酒店", py: "fz", pyFull: "feizhu" },
        { name: "同程旅行", url: "https://www.ly.com", desc: "机票门票", py: "tclx", pyFull: "tongcheng" },
        { name: "Airbnb", url: "https://www.airbnb.com", desc: "民宿预订" },
        { name: "Booking", url: "https://www.booking.com", desc: "海外酒店" },
      ],
    },

    /* ───────── 购物 ───────── */
    {
      name: "购物比价",
      icon: "🛒",
      links: [
        { name: "京东", url: "https://www.jd.com", desc: "自营快递快", py: "jd", pyFull: "jingdong" },
        { name: "天猫", url: "https://www.tmall.com", desc: "品牌旗舰", py: "tm", pyFull: "tianmao" },
        { name: "拼多多", url: "https://www.pinduoduo.com", desc: "低价拼团", py: "pdd", pyFull: "pinduoduo" },
        { name: "苏宁易购", url: "https://www.suning.com", desc: "家电 3C", py: "snyg", pyFull: "suningyigou" },
        { name: "什么值得买", url: "https://www.smzdm.com", desc: "优惠爆料", py: "smzdm", pyFull: "shenmezhidemai" },
        { name: "大众点评", url: "https://www.dianping.com", desc: "吃喝榜单", py: "dzdp", pyFull: "dazhongdianping" },
        { name: "识货", url: "https://www.shihuo.cn", desc: "球鞋比价", py: "sh", pyFull: "shihuo" },
        { name: "慢慢买", url: "https://www.manmanbuy.com", desc: "历史低价", py: "mmm", pyFull: "manmanmai" },
        { name: "Costco", url: "https://www.costco.com", desc: "海外仓储" },
      ],
    },

    /* ───────── 工具 ───────── */
    {
      name: "在线工具",
      icon: "🧪",
      links: [
        { name: "TinyPNG", url: "https://tinypng.com", desc: "图片压缩" },
        { name: "remove.bg", url: "https://www.remove.bg", desc: "一键抠图" },
        { name: "iLovePDF", url: "https://www.ilovepdf.com", desc: "PDF 工具箱" },
        { name: "Convertio", url: "https://convertio.co", desc: "格式转换" },
        { name: "草料二维码", url: "https://www.cli.im", desc: "二维码生成", py: "clem", pyFull: "caoliaoerweima" },
        { name: "站长工具", url: "https://tool.chinaz.com", desc: "SEO / 备案查询", py: "zzgj", pyFull: "zhanzhanggongju" },
        { name: "Photopea", url: "https://www.photopea.com", desc: "网页版 PS" },
        { name: "Carbon", url: "https://carbon.now.sh", desc: "代码截图" },
        { name: "UptimeRobot", url: "https://uptimerobot.com", desc: "站点可用监控" },
      ],
    },

    /* ───────── 游戏 ───────── */
    {
      name: "游戏娱乐",
      icon: "🎮",
      links: [
        { name: "Steam", url: "https://store.steampowered.com", desc: "游戏平台" },
        { name: "Epic Games", url: "https://store.epicgames.com", desc: "每周限免" },
        { name: "itch.io", url: "https://itch.io", desc: "独立游戏" },
        { name: "SteamDB", url: "https://steamdb.info", desc: "价格 / 史低" },
        { name: "Nexus Mods", url: "https://www.nexusmods.com", desc: "游戏模组" },
        { name: "TapTap", url: "https://www.taptap.cn", desc: "手游发现", py: "tpt" },
        { name: "游民星空", url: "https://www.gamersky.com", desc: "游戏资讯", py: "ymxk", pyFull: "youminxingkong" },
        { name: "3DM", url: "https://www.3dmgame.com", desc: "游戏攻略", py: "3dm" },
        { name: "WeGame", url: "https://wegame.com.cn", desc: "腾讯游戏平台" },
      ],
    },

    /* ───────── 社交 ───────── */
    {
      name: "社交通讯",
      icon: "💬",
      links: [
        { name: "微信网页版", url: "https://wx.qq.com", desc: "电脑收消息", py: "wx", pyFull: "weixin" },
        { name: "企业微信", url: "https://work.weixin.qq.com", desc: "工作沟通", py: "qywx", pyFull: "qiye weixin" },
        { name: "钉钉", url: "https://www.dingtalk.com", desc: "考勤协作", py: "dd", pyFull: "dingding" },
        { name: "飞书", url: "https://www.feishu.cn", desc: "文档协作", py: "fs", pyFull: "feishu" },
        { name: "QQ", url: "https://im.qq.com", desc: "经典聊天" },
        { name: "Telegram", url: "https://web.telegram.org", desc: "纸飞机" },
        { name: "Discord", url: "https://discord.com", desc: "社群语音" },
        { name: "Slack", url: "https://slack.com", desc: "团队协作" },
        { name: "WhatsApp", url: "https://web.whatsapp.com", desc: "海外聊天" },
      ],
    },

    /* ───────── 财经 ───────── */
    {
      name: "财经行情",
      icon: "💰",
      links: [
        { name: "雪球", url: "https://xueqiu.com", desc: "投资社区", py: "xq", pyFull: "xueqiu" },
        { name: "东方财富", url: "https://www.eastmoney.com", desc: "行情数据", py: "dfcq", pyFull: "dongfangcaifu" },
        { name: "同花顺", url: "https://www.10jqka.com.cn", desc: "看盘软件", py: "ths", pyFull: "tonghuashun" },
        { name: "新浪财经", url: "https://finance.sina.com.cn", desc: "财经快讯", py: "xlcj", pyFull: "xinlangcaijing" },
        { name: "富途牛牛", url: "https://www.futunn.com", desc: "港美股", py: "ftnn", pyFull: "futuniuniu" },
        { name: "英为财情", url: "https://cn.investing.com", desc: "外盘行情", py: "ywcq", pyFull: "yingweicaiqing" },
        { name: "TradingView", url: "https://www.tradingview.com", desc: "图表分析" },
        { name: "Yahoo Finance", url: "https://finance.yahoo.com", desc: "美股数据" },
        { name: "Google Finance", url: "https://www.google.com/finance", desc: "全球行情" },
      ],
    },

    /* ───────── 科技媒体 ───────── */
    {
      name: "科技前沿",
      icon: "📡",
      links: [
        { name: "机器之心", url: "https://www.jiqizhixin.com", desc: "AI 媒体", py: "jqzx", pyFull: "jiqizhixin" },
        { name: "量子位", url: "https://www.qbitai.com", desc: "AI 快讯", py: "lzw", pyFull: "liangziwei" },
        { name: "InfoQ", url: "https://www.infoq.cn", desc: "技术大会" },
        { name: "The Verge", url: "https://www.theverge.com", desc: "科技媒体" },
        { name: "TechCrunch", url: "https://techcrunch.com", desc: "创投资讯" },
        { name: "Ars Technica", url: "https://arstechnica.com", desc: "深度技术" },
        { name: "WIRED", url: "https://www.wired.com", desc: "科技文化" },
        { name: "Engadget", url: "https://www.engadget.com", desc: "硬件评测" },
        { name: "MIT Tech Review", url: "https://www.technologyreview.com", desc: "MIT 科技评论" },
      ],
    },

    /* ───────── AI 模型 ───────── */
    {
      name: "AI 模型与开发",
      icon: "🧠",
      links: [
        { name: "Hugging Face", url: "https://huggingface.co", desc: "模型社区" },
        { name: "Ollama", url: "https://ollama.com", desc: "本地跑模型" },
        { name: "LM Studio", url: "https://lmstudio.ai", desc: "图形化本地 LLM" },
        { name: "Replicate", url: "https://replicate.com", desc: "API 调模型" },
        { name: "OpenRouter", url: "https://openrouter.ai", desc: "模型聚合路由" },
        { name: "v0", url: "https://v0.dev", desc: "AI 生成界面" },
        { name: "bolt.new", url: "https://bolt.new", desc: "AI 全栈生成" },
        { name: "Grok", url: "https://grok.com", desc: "xAI 对话" },
        { name: "Perplexity", url: "https://www.perplexity.ai", desc: "AI 搜索引擎" },
      ],
    },

    /* ───────── 运动 ───────── */
    {
      name: "运动健康",
      icon: "🏃",
      links: [
        { name: "Keep", url: "https://www.keep.com", desc: "健身课程" },
        { name: "Strava", url: "https://www.strava.com", desc: "跑步骑行" },
        { name: "咕咚", url: "https://www.codoon.com", desc: "运动记录", py: "gd", pyFull: "gudong" },
        { name: "薄荷健康", url: "https://www.boohee.com", desc: "饮食热量", py: "bhjk", pyFull: "bohejiankang" },
        { name: "丁香医生", url: "https://dxy.com", desc: "健康科普", py: "dxyy", pyFull: "dingxiangyisheng" },
        { name: "好大夫在线", url: "https://www.haodf.com", desc: "找医生", py: "hdf", pyFull: "haodaifu" },
        { name: "MyFitnessPal", url: "https://www.myfitnesspal.com", desc: "卡路里记录" },
        { name: "Cronometer", url: "https://cronometer.com", desc: "营养追踪" },
        { name: "Mayo Clinic", url: "https://www.mayoclinic.org", desc: "医学百科" },
      ],
    },
  ],
};
