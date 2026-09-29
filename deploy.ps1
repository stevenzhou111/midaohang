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

# 运行期必需文件（站点本体 + Cloudflare Pages 专用配置）
$files = @(
  'index.html',
  'styles.css',
  'app.js',
  'data.js',
  'icons.js',
  'icons-img.js',
  'manifest.webmanifest',
  'sw.js',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png',
  '_headers',
  '404.html',
  'robots.txt'
)

if (Test-Path $site) { Remove-Item $site -Recurse -Force }
New-Item -ItemType Directory -Path $site | Out-Null

foreach ($f in $files) {
  $src = Join-Path $root $f
  if (-not (Test-Path $src)) { throw "缺少文件：$f" }
  Copy-Item -LiteralPath $src -Destination (Join-Path $site $f)
}

$sum = (Get-ChildItem $site -File | Measure-Object Length -Sum).Sum
Write-Host ("[1/2] 打包完成 -> _site\  {0} 个文件 / {1:N0} KB" -f $files.Count, ($sum / 1KB)) -ForegroundColor Green

if ($PackOnly) { exit 0 }

Write-Host "[2/2] 正在上传到 Cloudflare Pages（项目：$Project）..." -ForegroundColor Cyan
cmd /c "npx --yes wrangler@latest pages deploy `"$site`" --project-name $Project --branch $Branch --commit-dirty true"
if ($LASTEXITCODE -ne 0) { throw "部署失败（退出码 $LASTEXITCODE）。若未登录请先执行：cmd /c `"npx --yes wrangler@latest login`"" }
