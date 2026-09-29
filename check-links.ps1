<#
  check-links.ps1 —— 死链检测
  ------------------------------------------------------------------
  扫描 data.js 里所有链接，逐个请求，按严重程度分类报告：

    DEAD  404 / 410 / 451 / 域名解析失败 —— 真·死链，直接改掉或删掉
    NET   连得上域名但请求失败：超时 / TLS 握手失败 / 拒绝连接
          —— 多半是本地网络受限、需代理或需换 UA，不是死链
    WARN  400 / 401 / 403 / 429 / 5xx —— 反爬、要登录或临时故障，人工确认
    OK    2xx / 3xx（已跟随跳转）

    NET 会自动重试 -Retry 轮（默认 1），仍失败才留在报告里。

  用法（本项目目录打开 PowerShell）：
      powershell -ExecutionPolicy Bypass -File .\check-links.ps1
      .\check-links.ps1 -Timeout 15            # 放宽超时（境外站）
      .\check-links.ps1 -Retry 2               # 连不上的多试几轮
      .\check-links.ps1 -All                   # 连 OK 的也列出来
      .\check-links.ps1 -OutFile report.txt    # 额外写一份报告文件

  退出码：0 = 没有真死链（NET/WARN 都不算）；1 = 有 DEAD（方便接 CI）。
  零依赖：只用 Windows 自带的 PowerShell + .NET HttpClient，16 路并发。
#>

param(
  [int]$Timeout = 12,          # 单个请求超时（秒）
  [int]$Concurrency = 16,      # 并发数
  [int]$Retry = 1,             # 连不上时额外重试几轮（只针对 NET）
  [string[]]$Ignore = @(),     # 已知"对脚本返 403/404、真人浏览器正常"的地址（如风控站）
  [switch]$All,                # 连成功的也打印
  [string]$OutFile = ""        # 可选：把完整报告写进这个文件
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
if (-not $root) { $root = Split-Path -Parent $MyInvocation.MyCommand.Path }

$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

# ---------------------------------------------------------------- 1. 读 data.js

$dataPath = Join-Path $root 'data.js'
if (-not (Test-Path $dataPath)) { Write-Host "找不到 data.js" -ForegroundColor Red; exit 1 }
$dataText = [IO.File]::ReadAllText($dataPath, [Text.Encoding]::UTF8)

# 链接条目形如：{ name: "GitHub", url: "https://github.com", desc: "..." }
# name 一定在 url 前面，所以一个正则就能同时拿到名称和地址
$pairs = New-Object System.Collections.ArrayList
foreach ($m in [regex]::Matches($dataText, 'name\s*:\s*"([^"]+)"\s*,\s*url\s*:\s*"(https?://[^"]+)"')) {
    [void]$pairs.Add([pscustomobject]@{ Name = $m.Groups[1].Value; Url = $m.Groups[2].Value })
}

# 兜底：没匹配到 name 的 url 单独收进来，避免漏检
$seen = New-Object 'System.Collections.Generic.HashSet[string]'
foreach ($p in $pairs) { [void]$seen.Add($p.Url) }
foreach ($m in [regex]::Matches($dataText, 'url\s*:\s*"(https?://[^"]+)"')) {
    $u = $m.Groups[1].Value
    if (-not $seen.Contains($u)) {
        [void]$pairs.Add([pscustomobject]@{ Name = "(未命名)"; Url = $u })
        [void]$seen.Add($u)
    }
}

if ($pairs.Count -eq 0) { Write-Host "data.js 里没找到任何链接" -ForegroundColor Red; exit 1 }

# 白名单：像 Costco 这种"风控站"会对脚本请求返 404，真人浏览器却是 200，
# 不排除掉的话每次都会误报死链、CI 常驻红灯
if ($Ignore.Count -gt 0) {
  $before = $pairs.Count
  $pairs = @($pairs | Where-Object {
      $u = $_.Url
      -not ($Ignore | Where-Object { $_ -and ($u -like $_ -or $u -like ($_ + '*')) })
  })
  if ($before -ne $pairs.Count) {
    Write-Host ("已按 -Ignore 排除 {0} 条（风控站/已知误报）" -f ($before - $pairs.Count)) -ForegroundColor DarkCyan
  }
}

Write-Host ("== 待检查链接：{0} 条（并发 {1}，超时 {2}s）==" -f $pairs.Count, $Concurrency, $Timeout) -ForegroundColor Cyan

# ---------------------------------------------------------------- 2. 并发请求

Add-Type -AssemblyName System.Net.Http

$handler = New-Object System.Net.Http.HttpClientHandler
$handler.AllowAutoRedirect = $true
$handler.MaxAutomaticRedirections = 8
$handler.AutomaticDecompression = [System.Net.DecompressionMethods]::GZip -bor [System.Net.DecompressionMethods]::Deflate

$client = New-Object System.Net.Http.HttpClient($handler)
$client.Timeout = [TimeSpan]::FromSeconds($Timeout)
$client.DefaultRequestHeaders.TryAddWithoutValidation('User-Agent', $UA) | Out-Null
$client.DefaultRequestHeaders.TryAddWithoutValidation('Accept', 'text/html,application/xhtml+xml,image/avif,image/webp,*/*;q=0.8') | Out-Null
$client.DefaultRequestHeaders.TryAddWithoutValidation('Accept-Language', 'zh-CN,zh;q=0.9,en;q=0.8') | Out-Null

function Classify-ConnectError($err) {
  # 把"连不上"拆成两类：域名解析失败 = 真死链；超时 / TLS / 拒绝 = 多半是网络受限
  $chain = @()
  $e = $err.Exception
  while ($e) { $chain += $e; $e = $e.InnerException }

  $msg = ''
  for ($i = $chain.Count - 1; $i -ge 0; $i--) { if ($chain[$i].Message) { $msg = $chain[$i].Message } }
  $msg = ($msg -replace '\s+', ' ').Trim()

  $flat = ' ' + $msg + ' '
  foreach ($x in $chain) {
    if ($x -is [System.Net.Sockets.SocketException]) {
      $c = [string]$x.SocketErrorCode
      if ($c -eq 'HostNotFound' -or $c -eq 'NoData' -or $c -eq 'NoRecovery' -or $c -eq 'TryAgain') { $flat += ' DNSERR ' }
    }
    if ($x -is [System.Net.WebException] -and $x.Status -eq 'NameResolutionFailure') { $flat += ' DNSERR ' }
  }

  if ($flat -match ' DNSERR ') { return @{ Kind = 'DEAD'; Detail = "域名解析失败（站点可能已注销）：$msg" } }
  if ($flat -match 'timed out|timeout|超时|已取消|was canceled|operation was canceled') {
    return @{ Kind = 'NET'; Detail = "请求超时（多半是网络受限 / 需代理，不是死链）：$msg" }
  }
  if ($flat -match 'SSL|TLS|secure channel|安全通道|handshake|握手') {
    return @{ Kind = 'NET'; Detail = "TLS 握手失败（常见于网络劫持或需代理）：$msg" }
  }
  if ($flat -match 'refused|拒绝') {
    return @{ Kind = 'NET'; Detail = "连接被拒绝（可能临时故障）：$msg" }
  }
  return @{ Kind = 'NET'; Detail = "连不上：$msg" }
}

$results = New-Object System.Collections.ArrayList
$batchSize = [Math]::Max(1, $Concurrency)

for ($start = 0; $start -lt $pairs.Count; $start += $batchSize) {
    $end = [Math]::Min($start + $batchSize - 1, $pairs.Count - 1)
    $slice = @()
    for ($i = $start; $i -le $end; $i++) { $slice += $pairs[$i] }

    # 一个批次里把请求全部发出去，再统一等结果 —— 真并发
    $pending = New-Object System.Collections.ArrayList
    foreach ($item in $slice) {
        try {
            [void]$pending.Add([pscustomobject]@{
                Item = $item
                Task = $client.GetAsync($item.Url, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead)
            })
        } catch {
            $c = Classify-ConnectError $_
            [void]$results.Add([pscustomobject]@{
                Name = $item.Name; Url = $item.Url; Code = 0
                Kind = $c.Kind; Detail = $c.Detail
            })
        }
    }

    foreach ($p in $pending) {
        $item = $p.Item
        $result = [pscustomobject]@{ Name = $item.Name; Url = $item.Url; Code = 0; Kind = 'NET'; Detail = '' }
        try {
            $resp = $p.Task.GetAwaiter().GetResult()
            $code = [int]$resp.StatusCode
            $media = ''
            if ($resp.Content.Headers.ContentType) { $media = $resp.Content.Headers.ContentType.MediaType }
            $result.Code = $code
            if ($code -ge 200 -and $code -lt 300) {
                $result.Kind = 'OK'; $result.Detail = "$code $media"
            } elseif ($code -eq 404 -or $code -eq 410 -or $code -eq 451) {
                $result.Kind = 'DEAD'; $result.Detail = "$code（页面确实不存在）"
            } elseif ($code -ge 400 -and $code -lt 500) {
                # 400/401/403/405/429 …… 多半是反爬、要登录，或它不接受脚本请求，
                # 站点本身还活着，交给人工点开确认，别误报成死链
                $result.Kind = 'WARN'; $result.Detail = "$code（疑似反爬 / 需登录，建议人工点开确认）"
            } elseif ($code -ge 500) {
                $result.Kind = 'WARN'; $result.Detail = "$code（服务器错误，可能是临时故障）"
            } else {
                $result.Kind = 'WARN'; $result.Detail = "$code"
            }
            $resp.Dispose()
        } catch {
            $msg = ''
            if ($_.Exception.InnerException) { $msg = $_.Exception.InnerException.Message }
            if (-not $msg) { $msg = $_.Exception.Message }
            $msg = ($msg -replace '\s+', ' ').Trim()
            $c = Classify-ConnectError $_
            $result.Kind = $c.Kind
            $result.Detail = $c.Detail
        }
        [void]$results.Add($result)
    }

    # 进度提示
    Write-Host ("   已检查 {0}/{1}" -f $results.Count, $pairs.Count)
}

# 只重试"连不上"的条目：区分真死链（DNS 挂了）和网络受限（超时/TLS）
if ($Retry -gt 0) {
  for ($round = 1; $round -le $Retry; $round++) {
    $idx = @()
    for ($i = 0; $i -lt $results.Count; $i++) { if ($results[$i].Kind -eq 'NET') { $idx += $i } }
    if ($idx.Count -eq 0) { break }
    Write-Host ("   重试 {0}/{1}：{2} 条连不上的链接" -f $round, $Retry, $idx.Count) -ForegroundColor Yellow

    for ($s = 0; $s -lt $idx.Count; $s += $batchSize) {
      $tasks = @()
      for ($i = $s; $i -lt [Math]::Min($s + $batchSize, $idx.Count); $i++) {
        $old = $results[$idx[$i]]
        $t = $null
        try { $t = $client.GetAsync($old.Url, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead) } catch { }
        $tasks += , ([pscustomobject]@{ Idx = $idx[$i]; Task = $t })
      }
      foreach ($w in $tasks) {
        if ($null -eq $w.Task) { continue }
        $old = $results[$w.Idx]
        $r = [pscustomobject]@{ Name = $old.Name; Url = $old.Url; Code = 0; Kind = 'NET'; Detail = '' }
        try {
          $resp = $w.Task.GetAwaiter().GetResult()
          $code = [int]$resp.StatusCode
          $r.Code = $code
          if ($code -ge 200 -and $code -lt 300) {
            $r.Kind = 'OK'; $r.Detail = "$code（重试后恢复）"
          } elseif ($code -eq 404 -or $code -eq 410 -or $code -eq 451) {
            $r.Kind = 'DEAD'; $r.Detail = "$code（页面确实不存在）"
          } elseif ($code -ge 400) {
            $r.Kind = 'WARN'; $r.Detail = "$code（反爬 / 需登录 / 服务器错误）"
          }
          $resp.Dispose()
        } catch {
          $c = Classify-ConnectError $_
          $r.Kind = $c.Kind; $r.Detail = $c.Detail
        }
        $results[$w.Idx] = $r
      }
    }
  }
  foreach ($r in $results) {
    if ($r.Kind -eq 'NET' -and $r.Detail -notmatch '重试') { $r.Detail += "（已重试 $Retry 轮仍失败）" }
  }
}

$client.Dispose()
$handler.Dispose()
Write-Host ""

# ---------------------------------------------------------------- 3. 报告

$dead = @($results | Where-Object { $_.Kind -eq 'DEAD' } | Sort-Object Name)
$net  = @($results | Where-Object { $_.Kind -eq 'NET' }  | Sort-Object Name)
$warn = @($results | Where-Object { $_.Kind -eq 'WARN' } | Sort-Object Name)
$ok   = @($results | Where-Object { $_.Kind -eq 'OK' })

function Show-Group($title, $list, $color) {
    if ($list.Count -eq 0) { return }
    Write-Host ""
    Write-Host ("── {0}（{1}）──" -f $title, $list.Count) -ForegroundColor $color
    foreach ($r in $list) {
        Write-Host ("  {0,-22} {1}" -f $r.Detail, $r.Name) -ForegroundColor $color
        Write-Host ("  {0}" -f $r.Url)
    }
}

Write-Host "══════════ 链接检查报告 ══════════" -ForegroundColor Cyan
Write-Host ("  可用 OK  : {0}" -f $ok.Count)   -ForegroundColor Green
Write-Host ("  死链 DEAD: {0}" -f $dead.Count) -ForegroundColor Red
Write-Host ("  疑似 WARN: {0}" -f $warn.Count) -ForegroundColor Yellow
Write-Host ("  连不上 NET: {0}" -f $net.Count) -ForegroundColor Yellow

Show-Group '死链 DEAD（域名挂了 / 页面不存在，建议删掉）' $dead 'Red'
Show-Group '连不上 NET（多半是本地网络受限或需代理，不算死链）' $net 'Yellow'
Show-Group '疑似 WARN（反爬 / 需登录 / 5xx，人工确认一下）' $warn 'Yellow'
if ($All) { Show-Group '可用' $ok 'Green' }

if ($OutFile) {
  $lines = @("状态`t说明`t名称`t地址")
  foreach ($r in ($results | Sort-Object Kind, Name)) {
    $lines += ("{0}`t{1}`t{2}`t{3}" -f $r.Kind, $r.Detail, $r.Name, $r.Url)
  }
  [IO.File]::WriteAllLines($OutFile, $lines, $utf8NoBom)
  Write-Host ""
  Write-Host ("完整报告已写入：{0}" -f $OutFile) -ForegroundColor Cyan
}

Write-Host ""
if ($dead.Count -gt 0) { exit 1 }
exit 0
