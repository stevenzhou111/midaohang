<#
  get-icons.ps1 —— 自动补图标
  ------------------------------------------------------------------
  你往 data.js 加了新链接之后，运行这个脚本，它会：
    1. 扫出 data.js 里所有还没有图标的域名
    2. 去这些站点抓 favicon（先看页面里的 <link rel="icon">，没有再试 /favicon.ico）
    3. 必要时缩到 64px，转成 data URI 追加写入 icons-img.js
    4. 用 node --check 校验语法，出错自动回滚备份

  下次打开页面，新链接就有图标了。

  用法（在本项目目录打开 PowerShell）：
      powershell -ExecutionPolicy Bypass -File .\get-icons.ps1

  已经部署 favicon-worker 的话，其实不需要跑脚本 —— 页面会自己向
  Worker 要图标；这个脚本是"零部署"方案。
#>

param(
  [int]$MaxBase64 = 6000,   # 单个图标 base64 上限（字符），超过就缩小重试
  [int]$MaxEdge   = 64,     # 位图缩放的最大边（像素）
  [int]$Timeout   = 10,     # 每个请求超时（秒）
  [switch]$Force            # 已有图标的站点也重新抓
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
if (-not $root) { $root = Split-Path -Parent $MyInvocation.MyCommand.Path }
$tmp  = Join-Path $env:TEMP 'nav-icons'
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

# ------------------------------------------------------------------ 工具函数

function Read-Utf8([string]$path) { [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8) }
function Write-Utf8([string]$path, [string]$text) { [IO.File]::WriteAllText($path, $text, $utf8NoBom) }

function ConvertTo-DataUriMime([string]$m) {
  # data URI 必须用 image/png 这种完整 MIME，写成 data:png 浏览器不认
  switch ($m) {
    'svg'    { return 'image/svg+xml' }
    'x-icon' { return 'image/x-icon' }
    default  { return 'image/' + $m }
  }
}

function Test-JsSyntax([string]$path) {
  # node --check 校验；临时把 $ErrorActionPreference 降为 Continue，
  # 否则 node 的 stderr 会变成终止错误，脚本会在回滚之前就崩掉
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { return $true }
  $old = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $null = & node --check $path 2>&1
    return ($LASTEXITCODE -eq 0)
  } catch {
    return $false
  } finally {
    $ErrorActionPreference = $old
  }
}

function Repair-IconLib([string]$path) {
  # 修掉历史写坏的内容：
  #   1) "data:png;base64," -> "data:image/png;base64,"（svg/x-icon 同理）
  #   2) 最后一条目缺结尾逗号（追加新条目时会变成 Unexpected string）
  $orig = Read-Utf8 $path
  $t = $orig

  $t = $t.Replace('"data:png;base64,',    '"data:image/png;base64,')
  $t = $t.Replace('"data:svg;base64,',    '"data:image/svg+xml;base64,')
  $t = $t.Replace('"data:jpeg;base64,',   '"data:image/jpeg;base64,')
  $t = $t.Replace('"data:gif;base64,',    '"data:image/gif;base64,')
  $t = $t.Replace('"data:webp;base64,',   '"data:image/webp;base64,')
  $t = $t.Replace('"data:x-icon;base64,', '"data:image/x-icon;base64,')

  $idx = $t.LastIndexOf('});')
  if ($idx -ge 0) {
    $head = $t.Substring(0, $idx)
    $ws   = $head.Length - $head.TrimEnd().Length
    $core = $head.Substring(0, $head.Length - $ws)
    if ($core.EndsWith('"')) { $core += ',' }   # 只给条目行补逗号，别给 Object.assign({ 之类加
    $t = $core + $head.Substring($head.Length - $ws)
  }

  if ($t -ne $orig) { Write-Utf8 $path $t; return $true }
  return $false
}

function Invoke-CurlGet([string]$Url) {
  # 返回文本（HTML）；失败返回 $null
  $out = & curl.exe -sSL --max-time $Timeout -A $UA $Url 2>$null
  if ($LASTEXITCODE -eq 0 -and $out) { return ($out -join "`n") }
  return $null
}

function Invoke-CurlFile([string]$Url, [string]$OutFile) {
  if (Test-Path $OutFile) { Remove-Item $OutFile -Force }
  & curl.exe -sSL --max-time $Timeout -A $UA -o $OutFile $Url 2>$null
  if ($LASTEXITCODE -eq 0 -and (Test-Path $OutFile) -and ((Get-Item $OutFile).Length -gt 0)) { return $true }
  return $false
}

function Resolve-Url([string]$base, [string]$href) {
  if ([string]::IsNullOrWhiteSpace($href)) { return $null }
  # 内联图标（data:image/...）：原样返回。绝不能拿 base 去拼，
  # 否则会被当成相对路径解析成 "https://站点/data:image/..." 之类的畸形 URL
  if ($href -match '^\s*data:') { return $href.Trim() }
  if ($href.StartsWith('//')) { return 'https:' + $href }
  if ($href -match '^https?://') { return $href }
  try { return ([Uri]::new([Uri]$base, $href)).AbsoluteUri } catch { return $null }
}

function Find-IconUrl([string]$html, [string]$base) {
  if (-not $html) { return $null }
  # rel="icon" / "shortcut icon" / "apple-touch-icon"（rel 在前）
  # href 的正则必须"引号感知"：data: URI 里常有 xmlns='...' 这种单引号，
  # 用 [^"']+ 会把值在第一个单引号处截断，写进 icons-img.js 的就是一个残缺图标
  $pat1 = '(?is)<link[^>]*rel\s*=\s*["'']([^"'']*icon[^"'']*)["''][^>]*>'
  foreach ($m in [regex]::Matches($html, $pat1)) {
    $hm = [regex]::Match($m.Value, '(?is)href\s*=\s*(?:"([^"]+)"|''([^'']+)'')')
    if ($hm.Success) {
      $raw = if ($hm.Groups[1].Success) { $hm.Groups[1].Value } else { $hm.Groups[2].Value }
      $u = Resolve-Url $base $raw; if ($u) { return $u }
    }
  }
  # href 在前的写法
  $pat2 = '(?is)<link[^>]*href\s*=\s*["'']([^"'']+\.(?:ico|png|svg|jpe?g|webp|gif))["''][^>]*>'
  foreach ($m in [regex]::Matches($html, $pat2)) {
    $u = Resolve-Url $base $m.Groups[1].Value; if ($u) { return $u } }
  return $null
}

function Test-ImagePayload([string]$media, [string]$b64) {
  # 完整性闸门：宁可少收，也不能把截断/损坏的图片写进图标库
  try { $bytes = [Convert]::FromBase64String($b64) } catch { return $false }
  if ($bytes.Length -lt 16) { return $false }
  if ($media -match 'svg') {
    $txt = [Text.Encoding]::UTF8.GetString($bytes)
    return ($txt -match '(?is)<svg[\s>]' -and $txt -match '(?is)</svg>')
  }
  # 位图看魔数
  if ($bytes.Length -lt 4) { return $false }
  $b0 = $bytes[0]; $b1 = $bytes[1]; $b2 = $bytes[2]; $b3 = $bytes[3]
  if ($b0 -eq 0x89 -and $b1 -eq 0x50 -and $b2 -eq 0x4E -and $b3 -eq 0x47) { return $true }   # PNG
  if ($b0 -eq 0xFF -and $b1 -eq 0xD8) { return $true }                                        # JPEG
  if ($b0 -eq 0x47 -and $b1 -eq 0x49 -and $b2 -eq 0x46) { return $true }                     # GIF
  if ($b0 -eq 0x00 -and $b1 -eq 0x00 -and $b2 -eq 0x01 -and $b3 -eq 0x00) { return $true }   # ICO
  if ($b0 -eq 0x52 -and $b1 -eq 0x49 -and $b2 -eq 0x46 -and $b3 -eq 0x46) { return $true }   # RIFF/WEBP
  return $false
}

function Normalize-DataUri([string]$u) {
  # 有些站点把图标直接内联成 data: URI（SteamDB、部分文档站）。
  # 我们要的产物本身就是 data URI，所以直接归一化收下，别丢给 curl（curl 不认 data: 协议）
  $u = $u.Trim()
  if ($u -notmatch '^data:image/') { return $null }
  $parts = $u -split ',', 2
  if ($parts.Count -lt 2) { return $null }
  $head = $parts[0]; $body = $parts[1]
  $media = ($head -split ';')[0]
  if ($media -eq 'data:image/svg') { $media = 'data:image/svg+xml' }
  if ($head -match ';base64') {
    $b64 = ($body -replace '\s', '')
    if ($b64 -notmatch '^[A-Za-z0-9+/=]+$') { return $null }
    return "$media;base64,$b64"
  }
  # 非 base64（常见是 URL 编码的 SVG）：解开再转 base64
  try {
    $raw = [Uri]::UnescapeDataString($body)
    $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($raw))
  } catch { return $null }
  return "$media;base64,$b64"
}

function Get-Mime([string]$path) {
  # 按魔数判断真实类型，顺便挡掉 HTML 错误页
  $b = [IO.File]::ReadAllBytes($path)
  if ($b.Length -lt 8) { return $null }
  $ascii = [Text.Encoding]::ASCII.GetString($b, 0, [Math]::Min(500, $b.Length))
  if ($ascii -match '(?i)<!doctype\s+html|<html') { return $null }          # 不是图标，是网页
  if ($b[0] -eq 0x89 -and $b[1] -eq 0x50) { return 'png' }                  # \x89PNG
  if ($b[0] -eq 0x47 -and $b[1] -eq 0x49) { return 'gif' }                  # GIF8
  if ($b[0] -eq 0xFF -and $b[1] -eq 0xD8) { return 'jpeg' }                 # FFD8
  if ($b[0] -eq 0x52 -and $b[1] -eq 0x49 -and $b[8] -eq 0x57) { return 'webp' } # RIFF..WEBP
  if ($b[0] -eq 0x00 -and $b[1] -eq 0x00 -and $b[2] -eq 0x01 -and $b[3] -eq 0x00) { return 'x-icon' }
  if ($ascii -match '(?i)<svg') { return 'svg' }
  return $null
}

function Resize-Icon([string]$path, [string]$outPng) {
  # 用系统自带 System.Drawing 缩放，避免引入任何依赖
  try {
    Add-Type -AssemblyName System.Drawing -ErrorAction Stop
    $img = [System.Drawing.Image]::FromFile($path)
    try {
      $longest = [Math]::Max($img.Width, $img.Height)
      if ($longest -le 0) { return $false }
      $scale = [Math]::Min(1.0, $MaxEdge / [double]$longest)
      $w = [Math]::Max(1, [int]($img.Width * $scale))
      $h = [Math]::Max(1, [int]($img.Height * $scale))
      $bmp = New-Object System.Drawing.Bitmap $w, $h
      $g = [System.Drawing.Graphics]::FromImage($bmp)
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.DrawImage($img, 0, 0, $w, $h)
      $g.Dispose()
      $bmp.Save($outPng, [System.Drawing.Imaging.ImageFormat]::Png)
      $bmp.Dispose()
      return $true
    } finally { $img.Dispose() }
  } catch { return $false }
}

# ------------------------------------------------------------------ 1. 收集域名

Write-Host "== 1/4 扫描 data.js 中的链接..." -ForegroundColor Cyan

$dataPath = Join-Path $root 'data.js'
if (-not (Test-Path $dataPath)) { Write-Host "找不到 data.js" -ForegroundColor Red; exit 1 }
$dataText = Read-Utf8 $dataPath

$allUrls = [regex]::Matches($dataText, 'url\s*:\s*"(https?://[^"]+)"') | ForEach-Object { $_.Groups[1].Value }
$hostSet = New-Object 'System.Collections.Generic.HashSet[string]'
foreach ($u in $allUrls) {
  try { $h = ([Uri]$u).Host; if ($h) { [void]$hostSet.Add($h) } } catch { }
}
Write-Host ("   链接 {0} 条，去重后域名 {1} 个" -f $allUrls.Count, $hostSet.Count)

# ------------------------------------------------------------------ 2. 已有图标

$svgPath = Join-Path $root 'icons.js'
$imgPath = Join-Path $root 'icons-img.js'

# 自检：icons-img.js 必须先是合法 JS，否则先修复（修不动再回滚 .bak），
# 否则后面追加会把坏文件越写越坏
if ((Test-Path $imgPath) -and (Get-Command node -ErrorAction SilentlyContinue)) {
  if (-not (Test-JsSyntax $imgPath)) {
    Write-Host "   icons-img.js 语法有误，尝试修复..." -ForegroundColor Yellow
    [void](Repair-IconLib $imgPath)
    if (Test-JsSyntax $imgPath) {
      Write-Host "   已修复并通过 node --check" -ForegroundColor Green
    } elseif (Test-Path ($imgPath + '.bak')) {
      Copy-Item ($imgPath + '.bak') $imgPath -Force
      Write-Host "   修复失败，已回滚到 .bak" -ForegroundColor Yellow
      if (-not (Test-JsSyntax $imgPath)) { Write-Host "   .bak 也不是合法 JS，中止" -ForegroundColor Red; exit 1 }
    } else {
      Write-Host "   修复失败且没有 .bak 备份，中止" -ForegroundColor Red; exit 1
    }
  }
}

function Get-Keys([string]$path, [string]$pattern) {
  $set = New-Object 'System.Collections.Generic.HashSet[string]'
  if (Test-Path $path) {
    $t = Read-Utf8 $path
    foreach ($m in [regex]::Matches($t, $pattern)) { [void]$set.Add($m.Groups[1].Value) }
  }
  return $set
}

$svgKeys = Get-Keys $svgPath     '"([^"]+)"\s*:\s*'''
$bmpKeys = Get-Keys $imgPath     '"([^"]+)"\s*:\s*"data:image'

function Test-Covered([string]$h) {
  $bare = $h -replace '^www\.', ''
  foreach ($c in @($h, $bare, 'www.' + $bare)) {
    if ($svgKeys.Contains($c)) { return $true }
    if ($bmpKeys.Contains($c)) { return $true }
  }
  return $false
}

$todo = @()
foreach ($h in ($hostSet | Sort-Object)) {
  if ($Force -or -not (Test-Covered $h)) { $todo += $h }
}
Write-Host ("   已有图标 {0} 个，待抓取 {1} 个" -f ($hostSet.Count - $todo.Count), $todo.Count)
if ($todo.Count -eq 0) { Write-Host "全部站点都有图标了，无需处理。" -ForegroundColor Green; exit 0 }

# ------------------------------------------------------------------ 3. 逐个抓取

Write-Host "== 2/4 抓取 favicon..." -ForegroundColor Cyan

$found = @()      # 行数组
$skip  = @()      # 报告

foreach ($h in $todo) {
  $tmpFile = Join-Path $tmp ($h -replace '[^\w\.-]', '_')
  $ok = $false

  try {
    # a) 先看首页里的 <link rel="icon">
    $iconUrl = $null
    $html = Invoke-CurlGet ("https://" + $h + "/")
    if ($html) { $iconUrl = Find-IconUrl $html ("https://" + $h + "/") }

    # a2) 站点把图标内联成 data: URI → 直接收下（curl 不支持 data: 协议）
    $inline = $null
    if ($iconUrl -and $iconUrl -match '^\s*data:image/') {
      $inline = Normalize-DataUri $iconUrl
      $iconUrl = $null
    }

    # b) 退回 /favicon.ico
    if (-not $iconUrl -and -not $inline) { $iconUrl = "https://$h/favicon.ico" }

    if ($inline) {
      $b64 = $inline.Substring($inline.IndexOf('base64,') + 7)
      if ($b64.Length -le $MaxBase64 -and $b64 -match '^[A-Za-z0-9+/=]+$') {
        $media = $inline.Substring(0, $inline.IndexOf(';'))
        $found += ('  "' + $h + '": "' + $media + ';base64,' + $b64 + '",')
        Write-Host ("   OK   {0}  (内联 {1}, {2} KB)" -f $h, $media, [Math]::Round($b64.Length / 1024, 1))
        $ok = $true
      } else {
        $skip += "$h  —— 内联图标太大或格式异常（base64 $($b64.Length)）"
      }
    } elseif (Invoke-CurlFile $iconUrl $tmpFile) {
      $mime = Get-Mime $tmpFile
      if ($mime) {
        $b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($tmpFile))
        $useMime = $mime
        $useFile = $tmpFile

        # 超体积就缩一缩（SVG 不缩，直接看体积）
        if ($b64.Length -gt $MaxBase64 -and $mime -ne 'svg') {
          $png = $tmpFile + '.png'
          if ((Get-Item $tmpFile).Length -gt $MaxBase64 * 0.75 -and (Resize-Icon $tmpFile $png)) {
            $b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($png))
            $useMime = 'png'
          }
        }

        if ($b64.Length -le $MaxBase64 -and $b64 -match '^[A-Za-z0-9+/=]+$') {
          # 注意：MIME 必须是 image/xxx 形式，否则浏览器不认（svg 要写成 svg+xml）
          $media = if ($useMime -eq 'svg') { 'image/svg+xml' } else { 'image/' + $useMime }
          $found += ('  "' + $h + '": "data:' + $media + ';base64,' + $b64 + '",')
          Write-Host ("   OK   {0}  ({1}, {2} KB)" -f $h, $media, [Math]::Round($b64.Length / 1024, 1))
          $ok = $true
        } else {
          $skip += "$h  —— 图标太大（base64 $($b64.Length) > $MaxBase64），已放弃"
        }
      } else {
        $skip += "$h  —— 下载到的不是图片（可能是 HTML 错误页）"
      }
    } else {
      $skip += "$h  —— 下载失败（超时 / 证书 / 拒绝连接）"
    }
  } catch {
    $skip += "$h  —— $($_.Exception.Message)"
  } finally {
    if (Test-Path $tmpFile) { Remove-Item $tmpFile -Force -EA SilentlyContinue }
    $pngTmp = $tmpFile + '.png'
    if (Test-Path $pngTmp) { Remove-Item $pngTmp -Force -EA SilentlyContinue }
  }
  if (-not $ok) { Write-Host ("   SKIP {0}" -f $h) -ForegroundColor DarkYellow }
}

# ------------------------------------------------------------------ 4. 写入 + 校验

Write-Host "== 3/4 写入 icons-img.js..." -ForegroundColor Cyan

if ($found.Count -eq 0) {
  Write-Host "这次没有抓到任何新图标。" -ForegroundColor Yellow
} else {
  if (Test-Path $imgPath) {
    Copy-Item $imgPath ($imgPath + '.bak') -Force
  } else {
    $header = "/* 本地图标库（位图）：域名 -> favicon 的 data URI。由 get-icons.ps1 抓取生成，可整文件替换。 */" +
              "`r`nwindow.ICONS_IMG = window.ICONS_IMG || {};" +
              "`r`nObject.assign(window.ICONS_IMG, {`r`n"
    Write-Utf8 $imgPath $header
  }

  $text = Read-Utf8 $imgPath
  $idx  = $text.LastIndexOf('});')
  if ($idx -lt 0) { Write-Host "icons-img.js 结构异常，已中止（未做任何修改）" -ForegroundColor Red; exit 1 }

  $prefix = $text.Substring(0, $idx)
  $suffix = $text.Substring($idx)
  # 追加前必须保证原最后一条目以逗号结尾，否则新块会变成 Unexpected string
  $ws   = $prefix.Length - $prefix.TrimEnd().Length
  $core = $prefix.Substring(0, $prefix.Length - $ws)
  if ($core.EndsWith('"')) { $core += ',' }
  $prefix = $core + $prefix.Substring($prefix.Length - $ws)
  if (-not $prefix.EndsWith("`n")) { $prefix += "`r`n" }
  $block = ($found -join "`r`n") + "`r`n"
  Write-Utf8 $imgPath ($prefix + $block + $suffix)

  Write-Host "== 4/4 校验语法..." -ForegroundColor Cyan
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "   （未安装 node，跳过语法校验）" -ForegroundColor DarkYellow
  } elseif (Test-JsSyntax $imgPath) {
    Write-Host "   node --check 通过" -ForegroundColor Green
  } else {
    if (Test-Path ($imgPath + '.bak')) {
      Copy-Item ($imgPath + '.bak') $imgPath -Force
      Write-Host "语法校验失败，已回滚到备份。" -ForegroundColor Red
    } else {
      Write-Host "语法校验失败，且没有 .bak 可回滚。" -ForegroundColor Red
    }
    exit 1
  }

  # 再校验一遍 MIME 形式：必须是 data:image/xxx，否则页面不认这些图标
  $checkText = Read-Utf8 $imgPath
  if ($checkText -match '"data:(?!image/)') {
    if (Test-Path ($imgPath + '.bak')) { Copy-Item ($imgPath + '.bak') $imgPath -Force }
    Write-Host "发现非 data:image/ 的非法条目，已回滚到备份。" -ForegroundColor Red
    exit 1
  }
  Write-Host "   MIME 校验通过（全部为 data:image/）" -ForegroundColor Green

  $newKeys = Get-Keys $imgPath '"([^"]+)"\s*:\s*"data:image'
  Write-Host ("   新增 {0} 条，icons-img.js 现有 {1} 条" -f $found.Count, $newKeys.Count) -ForegroundColor Green

  # 校验全过，备份就没用了，删掉免得目录里留垃圾
  if (Test-Path ($imgPath + '.bak')) { Remove-Item ($imgPath + '.bak') -Force }
}

# ------------------------------------------------------------------ 汇总

Write-Host ""
Write-Host "──────────── 汇总 ────────────" -ForegroundColor Cyan
Write-Host ("待抓取 : {0}" -f $todo.Count)
Write-Host ("成功   : {0}" -f $found.Count) -ForegroundColor Green
Write-Host ("跳过   : {0}" -f $skip.Count) -ForegroundColor DarkYellow
foreach ($s in $skip) { Write-Host ("   " + $s) -ForegroundColor DarkYellow }
Write-Host ""
Write-Host "刷新页面（Ctrl+F5）即可看到新图标。" -ForegroundColor Cyan
