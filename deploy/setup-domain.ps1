# ════════════════════════════════════════════════════════════════════
#  Domen + SSL ulash — Bir komanda
# ════════════════════════════════════════════════════════════════════
#
#  Foydalanish:
#    cd C:\Users\user\Desktop\yangibot!\deploy
#    .\setup-domain.ps1
#
#  Yoki parametrlar bilan:
#    .\setup-domain.ps1 -Domain "sessiya.marjagroup.uz" -Email "you@example.com"
# ════════════════════════════════════════════════════════════════════

param(
    [string]$ServerIP = "62.171.184.14",
    [string]$User = "root",
    [string]$Domain = "sessiya.marjagroup.uz",
    [string]$Email = ""
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$setupScript = Join-Path $scriptDir "setup-domain.sh"

if (-not (Test-Path $setupScript)) {
    Write-Host "✗ setup-domain.sh topilmadi: $setupScript" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Domen + SSL ulash                                          ║" -ForegroundColor Cyan
Write-Host "╠════════════════════════════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "║  Server: $User@$ServerIP" -ForegroundColor Cyan
Write-Host "║  Domen:  $Domain" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Email so'rash (agar berilmagan bo'lsa)
if (-not $Email) {
    $Email = Read-Host "Email (Let's Encrypt notification uchun)"
    if (-not $Email) {
        Write-Host "✗ Email majburiy" -ForegroundColor Red
        exit 1
    }
}

# DNS eslatma
Write-Host ""
Write-Host "⚠  DNS TEKSHIRUVI:" -ForegroundColor Yellow
Write-Host "   $Domain → $ServerIP A record sozlangan bo'lishi kerak" -ForegroundColor Yellow
Write-Host "   Cloudflare ishlatsangiz — orange cloud OFF (DNS only) tavsiya" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Davom etamizmi? [Y/n]"
if ($confirm -and $confirm.ToLower() -ne "y") {
    Write-Host "Bekor qilindi" -ForegroundColor Yellow
    exit 0
}

# 1. SCP — skriptni serverga yuklash
Write-Host ""
Write-Host "→ Skript server'ga yuklanmoqda..." -ForegroundColor Yellow
Write-Host "  (parol so'raladi)"
scp -o StrictHostKeyChecking=no $setupScript "${User}@${ServerIP}:/tmp/setup-domain.sh"
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ SCP fail bo'ldi" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Skript yuklandi" -ForegroundColor Green

# 2. SSH — ishga tushirish
Write-Host ""
Write-Host "→ Domen sozlanmoqda... (parol yana so'raladi)" -ForegroundColor Yellow
Write-Host ""

$remoteCommand = @"
export DOMAIN='$Domain'
export EMAIL='$Email'
bash /tmp/setup-domain.sh
"@

ssh -o StrictHostKeyChecking=no "${User}@${ServerIP}" $remoteCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  ✓ DOMEN + SSL ULANDI                                       ║" -ForegroundColor Green
    Write-Host "╠════════════════════════════════════════════════════════════╣" -ForegroundColor Green
    Write-Host "║  https://$Domain" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "Brauzerda oching: https://$Domain" -ForegroundColor Cyan
}
else {
    Write-Host ""
    Write-Host "✗ Setup fail bo'ldi (exit code: $LASTEXITCODE)" -ForegroundColor Red
    Write-Host "  Server'da log'larni ko'rish:" -ForegroundColor Yellow
    Write-Host "    ssh ${User}@${ServerIP}" -ForegroundColor Yellow
    Write-Host "    tail -f /var/log/nginx/error.log" -ForegroundColor Yellow
    exit 1
}
