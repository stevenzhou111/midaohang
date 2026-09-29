<#
  check-links.ps1 —— 死链检测
  ------------------------------------------------------------------
  扫描 data.js 里所有链接，逐个请求，按严重程度分类报告：

    FAIL  404 / 410 / 451 / 连不上（DNS、超时、拒绝连接）—— 真·死链
    WARN  400 / 401 / 403 / 429 / 5xx —— 多半是反爬、要登录或临时故障，需人工确认
    OK    2xx / 401（要登录但站点活着）/ 3xx（已跟随跳转）

  用法（本项目目录打开 PowerShell）：
      powershell -ExecutionPolicy Bypass -File .\check-links.ps1
      .\check-links.ps1 -Timeout 15            # 放宽超时（境外站）
      .\check-links.ps1 -All                   # 连 OK 的也列出来
      .\check-links.ps1 -OutFile report.txt    # 额外写一份报告文件

  退出码：0 = 没有死链；1 = 发现死链（方便接 CI）。
  零依赖：只用 Windows 自带的 PowerShell + .NET HttpClient，16 路并发。
#>

param(
  [int]$Timeout = 12,          # 单个请求超时（秒）
  [int]$Concurrency = 16,      # 并发数
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
            [void]$results.Add([pscustomobject]@{
                Name = $item.Name; Url = $item.Url; Code = 0
                Kind = 'FAIL'; Detail = "连不上：$($_.Exception.Message)"
            })
        }
    }

    foreach ($p in $pending) {
        $item = $p.Item
        $result = [pscustomobject]@{ Name = $item.Name; Url = $item.Url; Code = 0; Kind = 'FAIL'; Detail = '' }
        try {
            $resp = $p.Task.GetAwaiter().GetResult()
            $code = [int]$resp.StatusCode
            $media = ''
            if ($resp.Content.Headers.ContentType) { $media = $resp.Content.Headers.ContentType.MediaType }
            $result.Code = $code
            if ($code -ge 200 -and $code -lt 300) {
                $result.Kind = 'OK'; $result.Detail = "$code $media"
            } elseif ($code -eq 404 -or $code -eq 410 -or $code -eq 451) {
                $result.Kind = 'FAIL'; $result.Detail = "$code（页面确实不存在）"
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
            $result.Kind = 'FAIL'
            $result.Detail = "连不上：$msg"
        }
        [void]$results.Add($result)
    }

    # 进度提示
    Write-Host ("   已检查 {0}/{1}" -f $results.Count, $pairs.Count)
}

$client.Dispose()
$handler.Dispose()
Write-Host ""

# ---------------------------------------------------------------- 3. 报告

$fail = @($results | Where-Object { $_.Kind -eq 'FAIL' } | Sort-Object Name)
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
Write-Host ("  疑似 WARN: {0}" -f $warn.Count) -ForegroundColor Yellow
Write-Host ("  死链 FAIL: {0}" -f $fail.Count) -ForegroundColor Red

Show-Group '死链（建议修掉或删掉）' $fail 'Red'
Show-Group '疑似（反爬 / 5xx，人工确认一下）' $warn 'Yellow'
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
if ($fail.Count -gt 0) { exit 1 }
exit 0
