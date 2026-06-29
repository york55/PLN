param(
  [int]$Puerto = 9222,
  [string]$ChromePath = ""
)
$ErrorActionPreference = "Stop"
$BaseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PerfilDir = Join-Path $BaseDir "perfil_meli"

Write-Host "== 1) Instalando librerias de Python (playwright, beautifulsoup4, requests) =="
$py = (Get-Command python -ErrorAction SilentlyContinue)
if (-not $py) { $py = (Get-Command py -ErrorAction SilentlyContinue) }
if (-not $py) { Write-Host "ERROR: no se encontro Python en el PATH. Instalalo desde python.org."; exit 1 }
& $py.Source -m pip install --quiet --upgrade playwright beautifulsoup4 requests
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR instalando dependencias."; exit 1 }
Write-Host "   OK (no se necesita 'playwright install': el script se conecta a tu Chrome)."

Write-Host "== 2) Ubicando Google Chrome =="
if (-not $ChromePath) {
  $cands = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe"
  )
  foreach ($c in $cands) { if (Test-Path $c) { $ChromePath = $c; break } }
}
if (-not $ChromePath -or -not (Test-Path $ChromePath)) {
  Write-Host "ERROR: no se encontro chrome.exe. Pasalo con -ChromePath 'ruta\chrome.exe'."; exit 1
}
Write-Host "   Chrome: $ChromePath"

Write-Host "== 3) Abriendo Chrome con perfil dedicado y modo control remoto (puerto $Puerto) =="
$listo = $false
try {
  $j = Invoke-RestMethod "http://127.0.0.1:$Puerto/json/version" -TimeoutSec 3
  Write-Host "   Ya habia una ventana lista: $($j.Browser). No abro otra."
  $listo = $true
} catch { }
if (-not $listo) {
  if (-not (Test-Path $PerfilDir)) { New-Item -ItemType Directory -Force -Path $PerfilDir | Out-Null }
  $args = @("--user-data-dir=$PerfilDir", "--remote-debugging-port=$Puerto",
            "--no-first-run", "--no-default-browser-check",
            "https://www.mercadolibre.com.pe/")
  Start-Process $ChromePath -ArgumentList $args
  Start-Sleep -Seconds 5
  try {
    $j = Invoke-RestMethod "http://127.0.0.1:$Puerto/json/version" -TimeoutSec 5
    Write-Host "   Listo: $($j.Browser)"
  } catch {
    Write-Host "   AVISO: el puerto $Puerto aun no responde. Espera unos segundos."
  }
}

Write-Host ""
Write-Host "================================================================"
Write-Host " SIGUIENTE PASO (solo la 1ra vez):"
Write-Host "   En la ventana de Chrome que se abrio, INICIA SESION en"
Write-Host "   MercadoLibre (boton 'Ingresa a tu cuenta')."
Write-Host "   Luego corre:"
Write-Host "     python script1_productos.py"
Write-Host "     [setear token] ; python script2_reviews.py"
Write-Host "================================================================"
