# Руководство по созданию плагинов

Это руководство поможет вам создать свой первый плагин для платформы.

## Быстрый старт

1. Создайте папку в `plugins/your-plugin-name/`
2. Создайте файл `index.js`:

```javascript
export default {
    name: 'my-plugin',
    version: '1.0.0',

    async init({ eventBus, serviceManager, getService }) {
        console.log('Мой плагин загружен!');
    }
};
```

3. Перезапустите платформу - плагин загрузится автоматически!

## Структура плагина

```
plugins/
  your-plugin/
    index.js          # Основной файл плагина (обязательно)
    README.md         # Документация плагина
    config.json       # Конфигурация плагина (опционально)
    package.json      # Зависимости плагина (опционально)
```

## API плагина

### Обязательные свойства

- **`name`** (string) - уникальное имя плагина. Используется для идентификации.
- **`init(context)`** (function) - функция инициализации плагина.

### Опциональные свойства

- **`version`** (string) - версия плагина
- **`description`** (string) - описание плагина
- **`shutdown()`** (function) - функция очистки при остановке платформы

### Context в init()

```javascript
{
    eventBus,           // EventBus для подписки на события
    serviceManager,     // ServiceManager для управления сервисами
    getService(name)    // Функция для получения сервиса
}
```

## Примеры использования

### Подписка на события

```javascript
export default {
    name: 'event-listener',
    version: '1.0.0',

    async init({ eventBus }) {
        eventBus.on('twitch:ready', () => {
            console.log('Twitch готов к работе!');
        });

        eventBus.on('socket:connection', ({ socketId }) => {
            console.log(`Новое подключение: ${socketId}`);
        });
    }
};
```

### Использование Socket.IO

```javascript
export default {
    name: 'socket-plugin',
    version: '1.0.0',

    async init({ getService }) {
        const io = getService('socketio').getIO();

        io.on('connection', (socket) => {
            socket.on('my:event', (data) => {
                socket.emit('my:response', { received: data });
            });
        });
    }
};
```

### Работа с базой данных

```javascript
export default {
    name: 'database-plugin',
    version: '1.0.0',

    async init({ getService }) {
        const db = getService('database').getDb();

        const stmt = db.prepare('SELECT * FROM messages LIMIT 10');
        const messages = stmt.all();

        console.log('Последние 10 сообщений:', messages);
    }
};
```

### Комбинированный пример

```javascript
export default {
    name: 'chat-monitor',
    version: '1.0.0',
    description: 'Мониторинг чата с уведомлениями',

    async init({ eventBus, getService }) {
        const io = getService('socketio').getIO();
        const db = getService('database').getDb();

        let messageCount = 0;

        eventBus.on('twitch:ready', () => {
            console.log('[chat-monitor] Twitch готов, начинаю мониторинг');
        });

        io.on('connection', (socket) => {
            socket.on('request:stats', () => {
                const stmt = db.prepare('SELECT COUNT(*) as count FROM messages');
                const result = stmt.get();
                socket.emit('stats', result);
            });
        });
    },

    async shutdown() {
        console.log('[chat-monitor] Остановка мониторинга');
    }
};
```

## Доступные сервисы

### HTTP Service

```javascript
const httpService = getService('http');
const server = httpService.getServer();
```

### Socket.IO Service

```javascript
const socketioService = getService('socketio');
const io = socketioService.getIO();
```

### Database Service

```javascript
const dbService = getService('database');
const db = dbService.getDb();
```

### Twitch Service

```javascript
const twitchService = getService('twitch');
// Доступ к Twitch IRC и EventSub
```

### UDP Service

```javascript
const udpService = getService('udp');
const udpServer = udpService.getServer();
```

## События платформы

### Системные события

- `service:registered` - сервис зарегистрирован
- `service:initialized` - сервис инициализирован
- `services:initialized` - все сервисы инициализированы
- `plugin:loaded` - плагин загружен
- `plugin:initialized` - плагин инициализирован
- `plugins:initialized` - все плагины инициализированы

### События сервисов

- `twitch:ready` - Twitch сервис готов
- `socket:connection` - новое Socket.IO подключение
- `socket:disconnect` - Socket.IO отключение

### Создание собственных событий

```javascript
eventBus.emit('my-plugin:event', { data: 'value' });
```

## Лучшие практики

1. **Именование**: Используйте префикс имени плагина для событий (`my-plugin:event`)
2. **Очистка**: Реализуйте `shutdown()` для освобождения ресурсов
3. **Ошибки**: Обрабатывайте ошибки внутри плагина
4. **Логирование**: Используйте префикс `[PLUGIN:name]` для логов
5. **Документация**: Создавайте README.md для вашего плагина

## Отладка

Для просмотра всех событий установите:

```bash
DEBUG_EVENTS=true npm run server
```

## Примеры плагинов

См. `plugins/example/` для базового примера плагина.

