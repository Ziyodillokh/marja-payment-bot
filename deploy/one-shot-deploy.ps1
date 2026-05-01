# ════════════════════════════════════════════════════════════════════
#  Bir-marta deploy: lokal Windows'dan server'ga
# ════════════════════════════════════════════════════════════════════
#
#  Foydalanish:
#    1. PowerShell'ni administrator sifatida oching
#    2. Bu skriptni ishga tushiring:
#       cd C:\Users\user\Desktop\yangibot!\deploy
#       .\one-shot-deploy.ps1
#    3. Server paroli so'raladi (SSH va SCP uchun)
#
#  Bu skript:
#    1. deploy-server.sh ni server'ga SCP qiladi
#    2. SSH orqali ishga tushiradi
#    3. Loglarni ko'rsatib turadi
#
#  Talablar:
#    - Windows 10+ (OpenSSH Client built-in)
#    - Yoki PuTTY (plink + pscp)
# ════════════════════════════════════════════════════════════════════

param(
    [string]$ServerIP = "62.171.184.14",
    [string]$User = "root",
    [string]$BotToken = "",
    [string]$BotUsername = "marja_sessiyabot",
    [string]$StorageChatId = ""
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$deployScript = Join-Path $scriptDir "deploy-server.sh"

if (-not (Test-Path $deployScript)) {
    Write-Host "✗ deploy-server.sh topilmadi: $deployScript" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  marja-payment-bot — Bir-marta deploy                       ║" -ForegroundColor Cyan
Write-Host "╠════════════════════════════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "║  Server: $User@$ServerIP" -ForegroundColor Cyan
Write-Host "║  Skript: $deployScript" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 1. SSH client tekshirish
$ssh = Get-Command ssh -ErrorAction SilentlyContinue
if (-not $ssh) {
    Write-Host "✗ ssh topilmadi. OpenSSH Client'ni o'rnating:" -ForegroundColor Red
    Write-Host "  Settings → Apps → Optional features → OpenSSH Client" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ SSH client mavjud" -ForegroundColor Green

# 2. Bot token va boshqa qiymatlarni so'rash (agar berilmagan bo'lsa)
if (-not $BotToken) {
    Write-Host ""
    $BotToken = Read-Host "Bot token (BotFather'dan)"
}
if (-not $StorageChatId) {
    $StorageChatId = Read-Host "Storage chat ID (-100... format, video upload uchun) [Enter — bo'sh]"
}

# 3. SCP — skriptni server'ga yuklash
Write-Host ""
Write-Host "→ Skript server'ga yuklanyapti..." -ForegroundColor Yellow
Write-Host "  (parol so'raladi)"
scp -o StrictHostKeyChecking=no $deployScript "${User}@${ServerIP}:/tmp/deploy-server.sh"
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ SCP fail bo'ldi" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Skript yuklandi" -ForegroundColor Green

# 4. SSH — env qiymatlarini eksport qilib, skriptni ishga tushirish
Write-Host ""
Write-Host "→ Server'da deploy boshlanyapti..." -ForegroundColor Yellow
Write-Host "  (parol yana so'raladi)"
Write-Host ""

$remoteCommand = @"
export BOT_TOKEN='$BotToken'
export BOT_USERNAME='$BotUsername'
export STORAGE_CHAT_ID='$StorageChatId'
bash /tmp/deploy-server.sh
"@

ssh -o StrictHostKeyChecking=no "${User}@${ServerIP}" $remoteCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  ✓ DEPLOY MUVAFFAQIYATLI                                    ║" -ForegroundColor Green
    Write-Host "╠════════════════════════════════════════════════════════════╣" -ForegroundColor Green
    Write-Host "║  Admin panel: http://${ServerIP}:3501" -ForegroundColor Green
    Write-Host "║  Login:       admin / admin123 (DARHOL O'ZGARTIRING!)       ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
}
else {
    Write-Host ""
    Write-Host "✗ Deploy fail bo'ldi (exit code: $LASTEXITCODE)" -ForegroundColor Red
    Write-Host "  Server'da ssh orqali tekshirib ko'ring:" -ForegroundColor Yellow
    Write-Host "    ssh ${User}@${ServerIP}" -ForegroundColor Yellow
    Write-Host "    bash /tmp/deploy-server.sh" -ForegroundColor Yellow
    exit 1
}
