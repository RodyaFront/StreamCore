# API для статистики чата

## Описание

Система логирования сообщений чата Twitch в базу данных SQLite с возможностью получения статистики через REST API.

## База данных

База данных создается автоматически в файле `chat_database.db` при первом запуске сервера.

### Таблицы

- **messages** - все сообщения из чата
  - `id` - уникальный идентификатор
  - `username` - имя пользователя (lowercase)
  - `display_name` - отображаемое имя
  - `message` - текст сообщения
  - `channel` - канал
  - `timestamp` - время сообщения
  - `is_command` - является ли сообщение командой

- **user_stats** - статистика пользователей
  - `username` - имя пользователя (primary key)
  - `message_count` - количество сообщений
  - `first_seen` - первое появление
  - `last_seen` - последнее появление
  - `total_characters` - общее количество символов
  - `favorite_words` - JSON с любимыми словами
  - `updated_at` - время последнего обновления

## API Endpoints

Все endpoints доступны по адресу `http://localhost:3001/api/chat/...`

### GET `/api/chat/stats/user?username=<username>`

Получить детальную статистику пользователя.

**Параметры:**
- `username` (обязательный) - имя пользователя

**Пример:**
```
GET /api/chat/stats/user?username=viewer123
```

**Ответ:**
```json
{
  "username": "viewer123",
  "message_count": 150,
  "first_seen": "2024-01-15 10:30:00",
  "last_seen": "2024-01-20 15:45:00",
  "total_characters": 4500,
  "favorite_words": [
    {"word": "привет", "count": 25},
    {"word": "игра", "count": 18}
  ],
  "recent_messages": [...],
  "avg_message_length": 30
}
```

### GET `/api/chat/stats/top?limit=<number>`

Получить топ пользователей по количеству сообщений.

**Параметры:**
- `limit` (опциональный) - количество пользователей (по умолчанию 20)

**Пример:**
```
GET /api/chat/stats/top?limit=10
```

**Ответ:**
```json
[
  {
    "username": "viewer1",
    "message_count": 500,
    "first_seen": "2024-01-10 10:00:00",
    "last_seen": "2024-01-20 16:00:00",
    "total_characters": 15000,
    "favorite_words": [...]
  },
  ...
]
```

### GET `/api/chat/stats/words?username=<username>&limit=<number>`

Получить любимые слова пользователя.

**Параметры:**
- `username` (обязательный) - имя пользователя
- `limit` (опциональный) - количество слов (по умолчанию 10)

**Пример:**
```
GET /api/chat/stats/words?username=viewer123&limit=5
```

**Ответ:**
```json
[
  {"word": "привет", "count": 25},
  {"word": "игра", "count": 18},
  {"word": "круто", "count": 12}
]
```

### GET `/api/chat/messages/recent?limit=<number>`

Получить последние сообщения из чата.

**Параметры:**
- `limit` (опциональный) - количество сообщений (по умолчанию 50)

**Пример:**
```
GET /api/chat/messages/recent?limit=20
```

**Ответ:**
```json
[
  {
    "username": "viewer123",
    "display_name": "Viewer123",
    "message": "Привет всем!",
    "timestamp": "2024-01-20 15:45:00",
    "channel": "#channel"
  },
  ...
]
```

### GET `/api/chat/stats/overview?period=<period>`

Получить общую статистику за период.

**Параметры:**
- `period` (опциональный) - период в формате SQLite (по умолчанию "-7 days")
  - Примеры: "-1 day", "-7 days", "-30 days", "-1 month"

**Пример:**
```
GET /api/chat/stats/overview?period=-7 days
```

**Ответ:**
```json
{
  "total_messages": 1500,
  "unique_users": 45,
  "avg_message_length": 28.5
}
```

## Использование в коде

### Логирование сообщений

Сообщения автоматически логируются при получении через Twitch IRC в файле `twitch.js`.

### Получение статистики программно

```javascript
import { getUserStatistics } from './chatLogger.js';
import { getUserDetailedStats, getTopUsersWithStats } from './chatStats.js';

// Базовая статистика
const stats = getUserStatistics('username');

// Детальная статистика с любимыми словами
const detailedStats = getUserDetailedStats('username');

// Топ пользователей
const topUsers = getTopUsersWithStats(10);
```

## Геймификация

На основе собранных данных можно создать:

1. **Систему уровней** - на основе количества сообщений
2. **Достижения** - за активность, любимые слова, регулярность
3. **Рейтинги** - топ самых активных зрителей
4. **Персонализированные награды** - на основе любимых слов и интересов
5. **Статистику для виджетов** - отображение топ зрителей на стриме

