# Платформа для стриминга

Гибкая модульная платформа для создания стриминговых виджетов и приложений.

## Архитектура

Платформа построена на модульной архитектуре с системой плагинов:

```
src/backend/
  core/           # Ядро платформы
    events.js     # Event Bus для связи между модулями
    services.js   # Service Manager для управления сервисами
    plugins.js    # Plugin Manager для управления плагинами
  services/       # Встроенные сервисы
    http/         # HTTP сервер
    socketio/     # Socket.IO сервер
    database/     # База данных
    twitch/       # Twitch интеграция (IRC + EventSub)
  plugins/        # Плагины (загружаются автоматически)
```

## Сервисы

### HTTP Service

Предоставляет HTTP сервер для статики и API.

```javascript
const httpService = getService('http');
const server = httpService.getServer();
```

### Socket.IO Service

Предоставляет Socket.IO сервер для real-time коммуникации.

```javascript
const socketioService = getService('socketio');
const io = socketioService.getIO();
```

### Database Service

Предоставляет доступ к SQLite базе данных.

```javascript
const dbService = getService('database');
const db = dbService.getDb();
```

### Twitch Service

Управляет подключениями к Twitch (IRC и EventSub).

События:
- `twitch:ready` - сервис готов к работе

## Создание плагина

1. Создайте папку в `plugins/your-plugin-name/`
2. Создайте `index.js` с экспортом плагина:

```javascript
export default {
    name: 'your-plugin-name',
    version: '1.0.0',

    async init({ eventBus, serviceManager, getService }) {
        // Инициализация плагина
        const io = getService('socketio').getIO();
        const db = getService('database').getDb();

        // Подписка на события
        eventBus.on('twitch:ready', () => {
            console.log('Twitch готов!');
        });
    },

    async shutdown() {
        // Очистка при остановке
    }
};
```

3. Плагин будет автоматически загружен при запуске платформы

## Event Bus

Централизованная система событий для связи между модулями.

### Использование

```javascript
// Подписка на событие
eventBus.on('event:name', (data) => {
    console.log('Событие получено:', data);
});

// Отправка события
eventBus.emit('event:name', { some: 'data' });
```

### Системные события

- `service:registered` - сервис зарегистрирован
- `service:initialized` - сервис инициализирован
- `services:initialized` - все сервисы инициализированы
- `plugin:loaded` - плагин загружен
- `plugin:initialized` - плагин инициализирован
- `plugins:initialized` - все плагины инициализированы
- `twitch:ready` - Twitch сервис готов
- `socket:connection` - новое Socket.IO подключение
- `socket:disconnect` - Socket.IO отключение

## Запуск

```bash
npm run server
```

Платформа автоматически:
1. Инициализирует все сервисы
2. Загрузит все плагины из `plugins/`
3. Инициализирует плагины

## Отладка

Для просмотра всех событий установите переменную окружения:

```bash
DEBUG_EVENTS=true npm run server
```

## Примеры плагинов

См. `plugins/example/` для примера базового плагина.

