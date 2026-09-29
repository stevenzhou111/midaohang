# 个人导航站

纯静态 HTML/CSS/JS 实现，零依赖、零构建，直接部署到 Cloudflare Pages。

**线上地址：<https://midaohang.pages.dev/>**（仓库 `stevenzhou111/midaohang`，push 到 `main` 自动部署）

所有内容由 `data.js` 配置文件驱动 —— 改配置即改网站。
（图标优先用本地 `icons.js`，完全离线；只有没覆盖的站点才需要可选的 `favicon-worker/`。）

## 界面与布局

```
┌──────────────────────────────────────────────┐
│              Hero：Logo / 标题 / 副标题          │
│          搜索框（引擎切换）+ 统计徽章            │
├────────────┬─────────────────────────────────┤
│  侧边导航    │  分类面板（毛玻璃卡片）            │
│  ⏱ 常用站点  │  标题 —————— 数量 ⌄              │
│  ⭐ 常用     │  ┌─────┐ ┌─────┐ ┌─────┐       │
│  🤖 AI 工具  │  │图标 │ │图标 │ │图标 │  …     │
│  🛠 开发工具  │  │名称 │ │名称 │ │名称 │       │
│  …（吸附定位）│  └─────┘ └─────┘ └─────┘       │
└────────────┴─────────────────────────────────┘
```

- **左侧吸附侧边栏**：滚动时自动高亮当前分类，点击平滑滚动定位
- **≤1000px 自动切换**：侧边栏变成顶部横向胶囊导航（吸顶）
- **链接网格**：面板内链接按自适应列数排列（宽屏 3–4 列），不再是一长条竖列
- **Hero 光晕 + 毛玻璃卡片 + 内高光**：渐变光斑背景、悬浮阴影
- **右上角工具组**：深浅色切换、5 套配色、网格 / 列表视图，三个圆钮 + 配色弹层

## 功能

- **21 个分类 / 199 个链接**：常用、AI 工具、开发工具、文档与教程、设计灵感、资讯社区、影音娱乐、效率办公、云服务与账户、编程刷题、在线课程、学术与阅读、旅行出行、购物比价、在线工具、游戏娱乐、社交通讯、财经行情、科技前沿、AI 模型与开发、运动健康
- **本地图标库**：`icons.js`（98 个站点的品牌 logo，单色 SVG）+ `icons-img.js`（82 个站点的真实 favicon 位图），全部**内联在页面里 —— 零请求、离线可用、国内可用、跟随主题变色**（合计覆盖 199 条链接里的 181 条）；两库都没有的才走 代理 → Google → DuckDuckGo → 首字母
- **搜索**：
  - **拼音首字母**：输 `wy` 找「网易云音乐」，输 `baidu` 找「百度」（靠链接的 `py` / `pyFull` 字段）
  - **模糊匹配**：`gb` 能中 GitHub（按顺序命中即可，越靠前得分越高）
  - **建议下拉**：边输边出候选，`↑ ↓` / `Tab` 选择，`Enter` 打开，最后一行永远是"用 X 搜索网页"
  - **分类也能搜**：搜「设计」/「sheji」/「design」能直接搜出**整个"设计灵感"分类**，
    别名写在 `data.js` 的 `categoryAlias` 里
  - 命中字符高亮；`/` 或 `Ctrl / ⌘ + K` 聚焦、`Esc` 第一次收起下拉 / 第二次清空
- **多搜索引擎**：Google / Bing / 百度 / GitHub；无结果时 `Enter` 直接转网页搜索
- **配置容错**：`data.js` 写错不再白屏 —— 语法错误给出**文件名 + 行号 + 列号**，结构问题（缺 `name` / `url` 不是 http）自动跳过并列出清单
- **分类折叠**：点击分类标题收起 / 展开，状态记住；搜索时自动展开
- **常用站点**：自动记录点击频次，置顶展示
- **滚动定位**：侧栏高亮跟随滚动；点最后一个分类也能正确选中（滚到底的边界已处理）；分类多到放不下时高亮项自动滚进可视区
- **回到顶部**：下滑超过一屏出现右下角悬浮按钮
- **深色模式**：跟随系统，可手动切换并记住
- **5 套配色主题**：靛蓝 / 翡翠 / 玫红 / 琥珀 / 天蓝，右上角调色盘按钮切换，
  浅色深色各有一套变量，选择记在 localStorage
- **网格 / 列表双视图**：右上角按钮一键切换 —— 网格适合扫一眼，列表是单列大行、描述与跳转箭头常驻
- **拖拽排序**：
  - 拖**分类标题**调整分类顺序，侧边栏同步跟着变
  - 拖**卡片**调整某个分类内的链接顺序
  - 结果只存本机（localStorage），**完全不碰 `data.js`**；配置里新加的分类 / 链接
    自动补在末尾，不会被旧排序吞掉；顶部有「重置排序」一键恢复原样
- **PWA**：有 `manifest` + Service Worker，可**安装到桌面 / 主屏**，断网也能打开
  （缓存策略是「网络优先」，改 `data.js` 刷新仍然是最新内容）
- **死链检测**：`check-links.ps1` 扫描全部 199 条链接的 HTTP 状态，
  死链 / 反爬 / 5xx 分类报告（见下文）

## 文件结构

| 文件 | 作用 |
| --- | --- |
| `index.html` | 页面骨架（Hero / 侧边栏 / 内容区），含配置错误捕获脚本 |
| `styles.css` | 全部样式、主题与配色变量、视图切换、拖拽状态、响应式断点 |
| `app.js` | 渲染、搜索与建议下拉、折叠、滚动定位、记录、主题与配色、视图切换、拖拽排序、图标加载、Service Worker 注册 |
| `data.js` | **你的内容配置**（改这个就行） |
| `icons.js` | **本地图标库（SVG）**：域名 → 品牌 logo（新增站点想带图标就加一行） |
| `icons-img.js` | **本地图标库（位图）**：域名 → 抓取的真实 favicon data URI。**异步加载**（150KB，不挡首屏，见《性能》一节） |
| `get-icons.ps1` | 一键补图标脚本：抓 data.js 里缺图标的站点（PowerShell，零依赖） |
| `check-links.ps1` | 死链检测脚本：并发扫全部链接的 HTTP 状态，分类报告 |
| `tests.html` | **自检页**：校验 data.js / 图标库 / PWA / HTML 引用是否自洽（改完配置打开看一眼） |
| `manifest.webmanifest` | PWA 清单：安装到桌面 / 主屏时的名字、图标、窗口样式 |
| `sw.js` | Service Worker：离线兜底（网络优先，改配置立刻生效） |
| `icon-192.png` `icon-512.png` `icon-maskable-512.png` `apple-touch-icon.png` | PWA / 主屏图标（渐变底 + 白色字标，与 favicon 同款） |
| `robots.txt` | 搜索引擎爬取规则（Cloudflare Pages 自动识别） |
| `_headers` | 线上安全头 + 缓存策略（`nosniff`、`data.js` 永远回源，改完即生效） |
| `404.html` | Cloudflare Pages 自动使用的错误页 |
| `favicon-worker/` | 图标代理 Worker（可选，本地图标没覆盖的站点才用得上） |

## 修改内容

编辑 `data.js`：

```js
window.SITE = {
  siteName: "我的导航",
  subtitle: "常用站点，一键直达",
  footer: "由 Cloudflare Pages 托管",

  settings: {
    defaultEngine: "google",   // google | bing | baidu | github
    linkOrder: "config",       // config = 按你写的顺序；name = 按名称排序
    showRecent: true,          // 是否显示"常用站点"
    recentCount: 8,            // 常用最多几条
    faviconProxy: "",           // 图标代理，"" = 直连 Google/DDG（默认）；部署 favicon-worker 后填它的地址（详见下文）
  },

  // 分类搜索别名（可选）：分类名 → "拼音首字母 完整拼音 英文"
  // 加一行就能让 "sheji" / "design" 搜出整个分类
  categoryAlias: {
    "设计灵感": "sheji design ui ux",
    "效率办公": "xiaolv office productivity",
  },

  // 图标别名（可选）：链接换了新域名、但图标库还挂在老域名上时接一下
  // 图标按域名索引，不接就会掉回首字母
  iconAlias: {
    "kimi.com": "kimi.moonshot.cn",
    "claude.com": "claude.ai",
  },

  categories: [
    {
      name: "常用",
      icon: "⭐",              // 分类 emoji
      collapsed: false,        // 初始是否收起
      order: "config",         // 可选：单独覆盖排序方式
      links: [
        { name: "GitHub", url: "https://github.com", desc: "代码托管" },
        // 中文站建议补两个拼音字段，才能用拼音搜到：
        { name: "网易云音乐", url: "https://music.163.com", desc: "音乐", py: "wyyy", pyFull: "wangyiyunyinyue" },
        // 自定义图标（填了就不走自动 Favicon）：
        { name: "某个站", url: "https://example.com", icon: "https://.../logo.png" },
      ],
    },
  ],
};
```

> `py` = 拼音首字母（`wy`），`pyFull` = 完整拼音（`baidu`）。两者都可选，
> 但**不填就只能用中文名或英文名搜索**。已给现有中文链接配好，新增时记得补。

> 提示：分类收起状态、主题、搜索引擎选择、常用记录都存在访问者浏览器的
> localStorage 里，不会写回配置文件；清空浏览器数据即恢复默认。

保存后本地双击 `index.html` 即可预览。

## 性能

**首屏传输量（线上实测 brotli）**

| 文件 | br | 说明 |
|---|---|---|
| `icons-img.js` | 153.7 KB | **异步加载，不进首屏关键路径** |
| `icons.js` | 40.7 KB | 98 个品牌 SVG |
| `app.js` | 22.9 KB | |
| `styles.css` | 9.1 KB | |
| `data.js` | 9.0 KB | |
| `index.html` | 6.4 KB | |
| `sw.js` + manifest | 2.4 KB | |
| **首屏关键路径合计** | **约 88 KB** | 加上异步的 153.7 KB 图标库在后面自己补齐 |

- **位图图标库异步加载**：它占全站 65%，但只是 `window.ICONS_IMG = {...}` 一句赋值，
  得等卡片建好才有意义。所以用 `<link rel=preload>` 让它和 CSS **并行下载**，
  脚本本身打 `async` **不挡首屏渲染**；`app.js` 的 `watchBitmapLibrary()` 监听它执行完，
  重建图标索引并给还停在首字母的图标补位（`refreshLocalIcons()`）。
  顺带的好处：这期间**不去试远程兜底**，省掉几十个"我们本来就有"的图标请求。
  实测：首屏 0–300ms 内 99 个 SVG 图标已就位、0 个远程请求；位图库执行后位图补齐到 85 个，
  只剩 15 个真·没有本地图标的境外站。
- **不要把 base64 换成二进制**：br 对 base64 的压缩率约 42%，而 PNG 本身已压缩，
  换裸二进制后 br 几乎压不动（~196KB）——**现在的 base64 + br 是最优解**。
- **首屏 0 个外部图片请求**：命中的图标全部内联，离线也秒出
- **远程图标先探测**：启动时用 1.5 秒超时探测 Google 图标服务，连不上就**整页不发**远程请求
  （连得上也只放行前 24 个图标），不会出现几十个 favicon 同时挂起；结果记 6 小时，下次秒开
- **离线兜底**：SW 对配置文件网络优先（改完刷新即生效），图标库 stale-while-revalidate
  （先给缓存秒开，后台悄悄更新），断网才回退缓存
- **移动端降级**：≤640px 减弱模糊层、关闭入场动画，长列表不掉帧
- 图标懒加载（`loading="lazy"`）、滚动监听节流（`requestAnimationFrame`）
- **线上安全与缓存**：`_headers` 加 `nosniff` / `Referrer-Policy` / `Permissions-Policy`，
  并让 `data.js`、`app.js` 每次回源校验 —— 改完配置部署后**立即生效**，不会被浏览器缓存拖住
- **离线可用**：Service Worker 预热核心资源，断网时退回缓存；
  策略是网络优先，联网刷新永远是最新配置，不会出现"改了配置却看到旧页面"

## 部署到 Cloudflare

### 方式 A：Git 集成（推荐，可随时在线改 `data.js`）—— 当前用的就是这条

1. 推送本目录到 GitHub / GitLab 仓库（本项目：`stevenzhou111/midaohang`，`main` 分支）；
2. Cloudflare 控制台 → **Workers 和 Pages** → **创建** → **Pages** → **连接到 Git**；
   首次需安装 Cloudflare 的 GitHub App，**记得在授权列表里勾上这个仓库**（新建的仓库默认不在）；
3. 框架预设选 **None**，构建命令**留空**，输出目录填 `/`，根目录留空 → **保存并部署**；
4. 之后每次 `git push` 自动部署，也能直接在 GitHub 网页编辑 `data.js`，几十秒后线上生效。

### 方式 B：直接上传（回退方案）

Cloudflare 控制台 → **Workers 和 Pages** → **创建** → **Pages** → **直接上传**，
拖入 `deploy.ps1` 打包出来的 `_site\`，再到 **自定义域** 绑定域名。

> CLI 等价做法：`powershell -ExecutionPolicy Bypass -File .\deploy.ps1`
> （先 `cmd /c "npx --yes wrangler@latest login"` 授权一次；`-PackOnly` 只打包不上传）。
> 不建议 `wrangler pages deploy .`——那会把 README、`*.ps1`、`favicon-worker/` 一起发到公网。

> **注意**：方式 A 的输出目录是 `/`，等于把仓库里的 README、`LICENSE`、`*.ps1`、
> `favicon-worker/` 也发布出去（都是明文、无密钥，属无害但多余）。
> 只想发运行期文件的话，在 Pages 构建设置里填：
> **构建命令** `mkdir -p _site && cp index.html styles.css app.js data.js icons.js icons-img.js manifest.webmanifest sw.js icon-192.png icon-512.png icon-maskable-512.png apple-touch-icon.png _headers 404.html robots.txt _site/`
> **输出目录** `_site`（Linux 构建环境，和 `deploy.ps1` 打包的是同一批 15 个文件）。

## 自己加了链接，图标自动来（get-icons.ps1）

新增链接后只要跑一次脚本，它会**自动扫出还没有图标的域名 → 抓站点 favicon →
缩到 64px → 转成 data URI 写进 `icons-img.js`**，刷新页面就有图标了：

```powershell
powershell -ExecutionPolicy Bypass -File .\get-icons.ps1
```

- 脚本会先读页面里的 `<link rel="icon">`，找不到再试 `/favicon.ico`；
- 下载结果会做**魔数校验**，HTML 错误页、超大图标一律跳过（不会污染文件）；
- 写入前自动备份 `icons-img.js.bak`，写完用 `node --check` 校验，出错自动回滚；
- 重复跑是安全的：已有图标的站点会自动跳过（要强制重抓加 `-Force`）；
- **零依赖**：只用 Windows 自带的 PowerShell + curl + .NET System.Drawing。
- 个别站点因图标太大被跳过时，放宽上限重跑即可：
  `.\get-icons.ps1 -MaxBase64 12000`
- 境外站（Steam / Discord / Hugging Face 之类）直连超时属正常，**挂上代理再跑一次**
  基本都能抓到；`oeasy.org.cn` 这种域名本身已失效的会永久跳过。

> 如果你部署了 `favicon-worker`（见下节），其实**不用跑脚本** ——
> 页面会实时向 Worker 要图标，新链接自动生效。脚本是"零部署"的替代方案。

## 图标：优先本地图标库

图标加载顺序（`app.js` 里的 `loadIcon`）：

```
icons.js / icons-img.js  →  你自己部署的 favicon-worker  →  Google  →  DuckDuckGo  →  首字母
     （本地，零请求，首选）          （同域，带缓存）            （国内基本不通）       （兜底）
```

- **`icons.js`**：98 个站点的品牌 logo（simple-icons，单色 SVG），内联进页面 ——
  **不发任何网络请求、离线也能显示、自动跟随深浅色主题**；
- **`icons-img.js`**：85 个站点抓来的真实 favicon（data URI），覆盖品牌库没有的国内外站点
  （京东 / 天猫 / 拼多多 / 12306 / 高德 / 微信 / 雪球 …），同样零请求；
- **当前覆盖**：21 个分类 199 条链接里，**183 条有本地图标（92%）**，剩 16 条是
  抓不到的境外站（超时 / WAF / 返回 HTML 错误页），显示字母兜底；挂代理时跑一次 `get-icons.ps1` 多半能补上。
- `get-icons.ps1` 也认站点把图标**内联成 `data:` URI** 的情况（SteamDB、部分文档站），
  直接收下而不是丢给 curl（curl 不支持 `data:` 协议）。

### 给新站点加图标

在 `icons.js` 的 `Object.assign(...)` 里加一行即可（key 是链接的域名）：

```js
  "example.com": '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="..."/></svg>',
```

SVG 从哪来：`https://cdn.jsdelivr.net/npm/simple-icons@15/icons/<品牌名>.svg`，
或任何你自己保存的 logo SVG。注意：**用单引号包裹、不要带 `<title>`**，否则会破坏文件语法。

有 `www.` 前缀的域名会自动兼容（`www.a.com` 与 `a.com` 互相命中），写一个就够。

### 没有本地图标时：部署 favicon-worker（可选）

国内访问 Google / DuckDuckGo 的 Favicon 服务基本不通，这些站点就只能显示字母。
`favicon-worker/` 是一个 30 行的 Cloudflare Worker，由边缘节点去抓图标并缓存 30 天，
你的浏览器只需要请求**你自己的域名**，同源 + 免 CORS + 带本地缓存。

```bash
cd favicon-worker
npx wrangler login        # 首次
npx wrangler deploy       # 输出 https://nav-favicon.<你的账号>.workers.dev
```

然后把地址填进 `data.js`：

```js
settings: {
  faviconProxy: "https://nav-favicon.<你的账号>.workers.dev/",
}
```

想挂到自己域名（更美观、且同源），改 `favicon-worker/wrangler.toml`：

```toml
routes = [{ pattern = "favicon.yourdomain.com/*", zone_name = "yourdomain.com" }]
```

重新 `wrangler deploy`，把 `faviconProxy` 改成 `"https://favicon.yourdomain.com/"` 即可。

几点说明：

- 免费额度 **10 万次/天**，个人导航站根本用不完；
- Worker 会自动探测（只发一次请求），不可用时 **6 小时内不再请求**，
  想立即重试可在控制台执行 `localStorage.removeItem("nav:proxy-off-until")` 后刷新；
- **远程图标先探测**：启动时 1.5 秒超时探测 Google 图标服务，不通就整页跳过远程兜底
  （通了也只放行前 24 个），避免几十个 favicon 请求吊死拖慢页面；状态记 6 小时；
  代理可用时更是**一个远程请求都不发**（Google/DDG/favicons 由 Worker 代劳）；
- 图标成功后缓存在浏览器 `Cache Storage` 的 `nav-icons-v1`；
- 不想部署 Worker：把 `faviconProxy` 设成 `""`（走直连，海外访问正常），
  或者给个别链接加 `icon` 字段指定图片。

## 自定义排序与视图（拖拽 + 网格 / 列表）

右上角三个按钮：**深浅色**、**配色**、**视图**。

**拖拽排序**

- 按住**分类标题**左右拖 → 分类换顺序，侧边栏同步跟着变；
- 按住**卡片**拖 → 该分类内的链接换顺序（多列网格按左右分，列表视图按上下分）；
- 排序结果存 localStorage（`nav:panel-order` / `nav:link-order:<分类名>`），
  **不写 `data.js`**，换台电脑 / 清浏览器数据即恢复默认；
- 会动到配置的场景都处理好了：`data.js` 里新加的分类和链接，记录里没有 →
  **自动排在末尾**，不会被旧排序吞掉；
- 第一次拖动会出现提示条，点「重置排序」一键回到 `data.js` 的原始顺序。

> **键盘也能排**：焦点在分类标题上按 `Alt + ↑/↓` 移动整个分类，在卡片上按 `Alt + ↑/↓`
> 移动卡片位置。HTML5 拖拽对键盘和触摸都没有等价路径，所以专门留了这条通道
> （WCAG 2.1.1）。触摸设备上会自动关掉拖拽（本来就不触发，只会让人以为坏了）。

> 手机 / 平板用不了 HTML5 拖拽（浏览器限制），排序请在电脑上完成 ——
> 排序存在**这台设备的浏览器**里，换设备要重新排。

**网格 / 列表**

- 网格（默认）：自适应列数，适合扫一眼；
- 列表：单列大行，描述和 ↗ 常驻，适合链接多、带说明的场景；
- 记在 `nav:view`，刷新保持。

> 排序 / 视图 / 配色 / 折叠 / 主题都在 localStorage：**它们是"本机偏好"，
> 会和"只改 data.js"共存** —— 配置决定有什么，本机偏好决定怎么摆。

## 配色主题

点右上角调色盘按钮，5 套主色随切随生效，**浅色 / 深色各有一套变量**：

| id | 名称 | 浅色主色 | 深色主色 |
| --- | --- | --- | --- |
| `indigo` | 靛蓝（默认） | `#4f46e5` | `#818cf8` |
| `emerald` | 翡翠 | `#059669` | `#34d399` |
| `amber` | 琥珀 | `#d97706` | `#fbbf24` |
| `rose` | 玫红 | `#e11d48` | `#fb7185` |
| `sky` | 天蓝 | `#0284c7` | `#38bdf8` |

变量定义在 `styles.css` 里 `html[data-accent="..."]` 块，想再加一套：
复制一组改颜色，再到 `app.js` 的 `ACCENTS` 数组里加一行 `id / name / from / to`。

## 自检页（tests.html）

改完 `data.js`、加完链接和图标，**打开 `tests.html` 看一眼**（本地双击或线上
`https://midaohang.pages.dev/tests.html`）。它是一张零依赖的检查表，
**刻意不加载 `app.js`** —— 独立重新实现一遍规则，才能发现 `app.js` 自己的 bug。

检查项：

- **配置**：`siteName` 有值、分类数、链接总数、每条有 `name` / `https://` 的 `url`、
  同分类内不重名、**全局不重复 url**、**`py` 不撞车**
  （撞了搜一个拼音会同时命中两个完全不同的站点）、`pyFull` 合法
- **别名**：`categoryAlias` 的每个键都对应真实分类（分类改名后会变成孤儿键）、
  `iconAlias` 的每个目标都真实存在于图标库
- **图标库**：两个库的条目数、位图是否全部是 `data:image/…`（不是的话浏览器不认）、
  本地图标覆盖率与缺失清单、疑似多余条目
- **PWA**：`manifest.webmanifest` 能否解析、声明的图标能否取到、
  `sw.js` 预热清单里的文件是否都存在
- **HTML**：`index.html` 引用的本地文件是否都存在、有没有内联 `on*` 事件、
  `icons-img.js` 有没有 `id="icons-img-script"`（缺了异步加载补不上图标）、
  viewport 有没有 `viewport-fit=cover`

结果分三档：**F 失败**（必须修）、**W 提醒**（多为"抓不到图标"这类环境问题）、**P 通过**。
页面标题会写成 `SELFCHECK ok=12 fail=0 warn=1`，方便无头浏览器或 CI 抓标题做断言。

> 这个站没有构建步骤，所以校验只能自己加。`tests.html` 就是最轻的一层：
> 纯静态，Pages 上直接能开，不需要 Node、不需要装任何东西。

## PWA：安装到桌面 / 主屏

- `manifest.webmanifest`：名字、`standalone` 窗口、192/512/maskable 三张图标；
- `icon-*.png` / `apple-touch-icon.png`：和 favicon 同款的渐变底 + 白色字标；
- `sw.js`：Service Worker，只在 `http(s)` 下注册（双击本地文件打开时自动跳过）。

**缓存策略特意选了「网络优先」**：联网时永远拿服务器上最新的文件
（改 `data.js`、跑完 `get-icons.ps1`、改 `styles.css`，刷新就是最新），
只有**断网时**才退回缓存 —— 这样"改配置即生效"的玩法不会被 PWA 缓存破坏。

安装方法：Chrome / Edge 地址栏右侧出现"安装"图标，或菜单 →「将此站点作为应用安装」；
iOS Safari 用「分享 → 添加到主屏幕」。

> 离线包体积（可选，不装 PWA 就不会下载）：`sw.js` 2.5KB + `manifest` 748B
> + 4 张 PNG 45.6KB = **48.7KB**（gzip 后 37KB）；页面本身的首屏资源没有变化。

> `sw.js` 自身更新：浏览器最多 24 小时自动检查一次，改完想立刻生效
> 就 Ctrl+F5 或关掉全部标签页重开。

## 死链检测（check-links.ps1）

改了一堆链接，想知道哪些已经挂了：

```powershell
powershell -ExecutionPolicy Bypass -File .\check-links.ps1
```

- **16 路并发**，只读响应头不下载页面，199 条链接约 30~45 秒跑完；
- 判定分四类（**"连不上"会拆成两种，因为它们处理方式完全不同**）：
  - `DEAD` —— `404 / 410 / 451` 或**域名解析失败** → 真死链，删掉或换掉，退出码 1
  - `NET` —— 域名能解析但**超时 / TLS 握手失败 / 拒绝连接** → 多半是本地网络受限或需代理，**不是死链**，
    会自动重试 `-Retry` 轮（默认 1），重试后恢复的记为 `OK（重试后恢复）`
  - `WARN` —— `400/401/403/429`（反爬、要登录）、`5xx`（临时故障）→ 站点还活着，人工点开确认
  - `OK` —— 2xx、跟随跳转后的结果
- 参数：`-Timeout 15`（放宽超时，境外站用）、`-Retry 2`（连不上的多试几轮）、
  `-Ignore "https://www.costco.com"`（风控站白名单，见下）、
  `-All`（连成功的也列出来）、`-OutFile report.txt`（额外导出 TSV 报告）；
- **退出码只有"有 DEAD"才是 1**（`NET` / `WARN` 都算通过），可以接 CI / 计划任务；
- **风控站要加白名单**：Costco、Steam 这类对脚本请求返 404/403、真人浏览器却是正常的，
  不排除掉的话每次都会误报、CI 常驻红灯。确认是这类之后再加进 `-Ignore`；
- **境外站超时**：国内直连时 Steam / Discord / WhatsApp 这类会耗满超时进 `NET`，
  挂上代理再跑一次复核；只有 `DEAD` 才是真死链；
- 和 `get-icons.ps1` 一样必须 **UTF-8 with BOM** 保存。

## 常见问题

- **页面出红框"配置文件出错了"**：`data.js` 有语法错误，面板里已经给出
  **文件名 / 行号 / 列号 / 错误信息**，修好刷新即可。
- **顶部出现黄框"配置有 N 处问题"**：缺 `name`、`url` 不是 `http(s)://` 之类的结构问题，
  这些条目已被自动跳过，其余内容照常显示，清单里写明了每一条。
- **图标显示为首字母**：`icons.js` 里没有这个域名，见上节《给新站点加图标》。
- **改了图标不生效**：浏览器有缓存，Ctrl/Cmd + F5 强刷。
- **拼音搜不到**：链接没填 `py` / `pyFull` 字段，见《修改内容》一节。
- **侧边栏没出现**：窗口宽度 ≤1000px 时会变成顶部横向胶囊导航，属预期。
- **点最后一个分类高亮不对**：已修复（滚到底时按最后一个面板判定），若仍异常请强刷。
- **搜索按 Enter 打开了网页**：有候选时 `Enter` 打开**高亮的那一行**，
  `↑ ↓` 可切换；最后一行固定是网页搜索，`Esc` 收起下拉，再按一次清空。
- **新加的链接没有图标**：跑一次 `powershell -ExecutionPolicy Bypass -File .\get-icons.ps1`
  即可自动抓取（详见《自己加了链接，图标自动来》）；部署了 favicon-worker 则不用管。
- **搜分类搜不到**：在 `data.js` 的 `categoryAlias` 里给分类加一行别名，
  如 `"设计灵感": "sheji design ui ux"`，之后 `sheji` / `design` 都能搜出整类。
- **`Ctrl / ⌘ + K` 没反应**：个别浏览器会把这个快捷键占给地址栏，用 `/` 聚焦一样。
- **改完 `get-icons.ps1` 后中文乱码 / 报语法错**：这个脚本必须保存成
  **UTF-8 with BOM**（Windows PowerShell 5.1 对无 BOM 文件按 GBK 读），或改用 `pwsh` 运行。
- **拖出来的顺序怎么恢复**：内容区顶部提示条里的「重置排序」，
  或在控制台执行
  `Object.keys(localStorage).filter(k => k.indexOf('nav:link-order') === 0 || k === 'nav:panel-order').forEach(k => localStorage.removeItem(k))` 后刷新。
- **我改了 `data.js`，新分类怎么排到最后去了**：你之前拖拽过，记录里没有这个新名字，
  按设计补在末尾（保证不会被旧排序挤掉）。想要它回到配置里的位置就点「重置排序」。
- **`check-links.ps1` 报一堆 403 / 429 是死链吗**：不是。那是反爬或限流，站点还活着，
  脚本把它们归到 `WARN`；只有 `404/410/451` 和连不上才算 `FAIL`。
- **PWA 装不上 / 安装后内容是旧的**：安装需要 **https 或 localhost**；
  要立刻让 `sw.js` 的改动生效就 Ctrl+F5 或关掉全部标签页重开
  （Service Worker 最多 24 小时才自动检查更新）。
- **换了电脑，排序和配色没了**：正常，这些都是**本机 localStorage**，不写进配置文件，
  也就不占用 `data.js`；想要"所有人看到同一套排序"，改 `data.js` 的顺序即可。
