<#
  deploy.ps1 —— 把运行期文件复制到 _site\，再部署到 Cloudflare Pages

  首次使用先登录（浏览器里点一次 Authorize）：
      cmd /c "npx --yes wrangler@latest login"

  用法：
      powershell -ExecutionPolicy Bypass -File .\deploy.ps1                 # 打包 + 部署
      powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -PackOnly       # 只打包，不上传
      powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -Project my-nav # 指定项目名

  只上传 _site\（15 个运行期文件），不会把 .git、*.ps1、README、favicon-worker 传到公网。
  改完 data.js / 样式后重跑一次本脚本即可发布。
#>
param(
  [string]$Project = 'personal-nav',
  [switch]$PackOnly,
  [string]$Branch = 'main'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$site = Join-Path $root '_site'

# 可发布文件清单**从 index.html 自动推导**，不再手写第二份。
# 原因：这份清单原本同时存在于 deploy.ps1、README 的构建命令、Pages 控制台三处，
# 早晚会漂移，而漏一个文件的后果是"本地好好的、线上少一块"。
# 推导规则：index.html 里的本地 src/href + Pages 专用文件（HTML 里不会出现那些）。
$html = [IO.File]::ReadAllText((Join-Path $root 'index.html'), [Text.Encoding]::UTF8)
$list = New-Object System.Collections.ArrayList
foreach ($m in [regex]::Matches($html, '(?:src|href)="([^"#][^"]*)"')) {
  $u = $m.Groups[1].Value
  if ($u -match '^(https?:|data:|mailto:|javascript:|#)') { continue }
  [void]$list.Add(($u -split '\?')[0])
}
foreach ($extra in 'index.html', 'app.js', 'sw.js', 'manifest.webmanifest', '404.html', 'robots.txt', '_headers') {
  [void]$list.Add($extra)
}
# app.js 是 ES Module，会 import 其它 js：这些不在 index.html 里，必须一并带上
$appJs = [IO.File]::ReadAllText((Join-Path $root 'app.js'), [Text.Encoding]::UTF8)
foreach ($m in [regex]::Matches($appJs, 'from\s+["''](\.[^"'']+)["'']')) {
  $rel = $m.Groups[1].Value -replace '^\./', ''
  [void]$list.Add(($rel -split '\?')[0])
}
# PWA 图标只被 manifest 和 sw.js 引用，同样不在 index.html 里
$manifest = [IO.File]::ReadAllText((Join-Path $root 'manifest.webmanifest'), [Text.Encoding]::UTF8)
foreach ($m in [regex]::Matches($manifest, '"src"\s*:\s*"([^"]+)"')) {
  [void]$list.Add($m.Groups[1].Value)
}
$sw = [IO.File]::ReadAllText((Join-Path $root 'sw.js'), [Text.Encoding]::UTF8)
$core = [regex]::Match($sw, '(?s)const CORE = \[(.*?)\]')
foreach ($m in [regex]::Matches($core.Groups[1].Value, '"([^"]+)"')) {
  if ($m.Groups[1].Value -ne './') { [void]$list.Add($m.Groups[1].Value) }
}
$files = @($list | Sort-Object -Unique)

if (Test-Path $site) { Remove-Item $site -Recurse -Force }
New-Item -ItemType Directory -Path $site | Out-Null

foreach ($f in $files) {
  $src = Join-Path $root $f
  if (-not (Test-Path $src)) { throw "缺少文件：$f" }
  $dst = Join-Path $site $f
  # 有子目录的（js/xxx.js）先建目录再拷
  $dstDir = Split-Path -Parent $dst
  if (-not (Test-Path $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }
  Copy-Item -LiteralPath $src -Destination $dst
}

$sum = (Get-ChildItem $site -Recurse -File | Measure-Object Length -Sum).Sum
Write-Host ("[1/2] 打包完成 -> _site\  {0} 个文件 / {1:N0} KB" -f $files.Count, ($sum / 1KB)) -ForegroundColor Green

if ($PackOnly) { exit 0 }

Write-Host "[2/2] 正在上传到 Cloudflare Pages（项目：$Project）..." -ForegroundColor Cyan
cmd /c "npx --yes wrangler@latest pages deploy `"$site`" --project-name $Project --branch $Branch --commit-dirty true"
if ($LASTEXITCODE -ne 0) { throw "部署失败（退出码 $LASTEXITCODE）。若未登录请先执行：cmd /c `"npx --yes wrangler@latest login`"" }
