# Проверка прав администратора
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Запрос прав администратора..." -ForegroundColor Yellow
    # Перезапуск скрипта с правами администратора
    $arguments = "-File `"$PSCommandPath`""
    Start-Process powershell -Verb RunAs -ArgumentList $arguments
    exit
}

Write-Host "Запуск keylistener с правами администратора..." -ForegroundColor Green
Set-Location $PSScriptRoot
python key_listener.py

