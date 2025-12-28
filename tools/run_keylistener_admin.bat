@echo off
:: Проверка прав администратора и перезапуск с правами, если нужно
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Запуск keylistener с правами администратора...
    cd /d "%~dp0"
    python key_listener.py
    if %errorLevel% neq 0 (
        echo.
        echo Скрипт завершился с ошибкой. Код выхода: %errorLevel%
        pause
    )
) else (
    echo Запрос прав администратора...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
)

