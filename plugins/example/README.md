# Пример плагина

Это пример плагина для платформы. Используйте его как шаблон для создания своих плагинов.

## Структура плагина

```
plugins/
  example/
    index.js      # Основной файл плагина
    README.md     # Документация плагина
```

## API плагина

Плагин должен экспортировать объект со следующими свойствами:

- `name` (string, обязательное) - уникальное имя плагина
- `version` (string, обязательное) - версия плагина
- `description` (string, опциональное) - описание плагина
- `init(context)` (function, обязательное) - функция инициализации
- `shutdown()` (function, опциональное) - функция остановки

### Context в init()

```javascript
{
    eventBus,        // EventBus для подписки на события
    serviceManager,  // ServiceManager для управления сервисами
    getService(name) // Функция для получения сервиса
}
```

## Доступные сервисы

- `http` - HTTP сервер
- `socketio` - Socket.IO сервер
- `database` - База данных (better-sqlite3)
- `twitch` - Twitch сервис (IRC + EventSub)

## События платформы

- `service:registered` - сервис зарегистрирован
- `service:initialized` - сервис инициализирован
- `services:initialized` - все сервисы инициализированы
- `plugin:loaded` - плагин загружен
- `plugin:initialized` - плагин инициализирован
- `plugins:initialized` - все плагины инициализированы
- `twitch:ready` - Twitch сервис готов
- `socket:connection` - новое Socket.IO подключение
- `socket:disconnect` - Socket.IO отключение

