# StreamCore

Модульная платформа для создания стриминговых виджетов и приложений. Запускается вместе со стримом и позволяет накручивать новые приложения со временем.

## Архитектура

Платформа построена на модульной архитектуре с системой плагинов:

- **Ядро платформы** (`src/backend/core/`) - Event Bus, Service Manager, Plugin Manager
- **Встроенные сервисы** (`src/backend/services/`) - HTTP, Socket.IO, Database, Twitch, UDP
- **Плагины** (`plugins/`) - автоматически загружаемые модули расширения

## Установка

1. Установите зависимости:
   ```bash
   npm install
   pip install -r requirements.txt
   ```

2. Настройте переменные окружения (`.env`):
   ```
   TWITCH_ACCOUNT=your_channel
   ACCESS_TOKEN=your_token
   CLIENT_ID=your_client_id
   SECRET=your_client_secret
   REFRESH_TOKEN=your_refresh_token
   ```

## Запуск

### Режим разработки

Запуск всех компонентов одной командой:

```bash
npm start
```

Или по отдельности:

1. **Платформа** (в одном терминале):
   ```bash
   npm run server
   ```

2. **Vite dev server** (в другом терминале):
   ```bash
   npm run dev
   ```

3. **Слушатель клавиш** (в третьем терминале):
   ```bash
   npm run keylistener
   ```

### Сборка для продакшена

1. Соберите фронтенд:
   ```bash
   npm run build
   ```

2. Запустите платформу:
   ```bash
   npm run server
   ```

## Создание плагинов

Плагины автоматически загружаются из папки `plugins/`. См. [Руководство по созданию плагинов](docs/PLUGIN_GUIDE.md) для подробностей.

Пример структуры плагина:

```
plugins/
  my-plugin/
    index.js      # Основной файл плагина
    README.md     # Документация
```

## Настройка OBS

1. Добавьте Browser Source в OBS
2. Укажите URL: `http://localhost:3000` (dev) или `http://localhost:3001` (prod)
3. Установите размер окна (например, 1920x1080)
4. Нажмите Numpad0 для открытия/закрытия КПК

## Документация

- [Архитектура платформы](docs/PLATFORM.md)
- [Руководство по созданию плагинов](docs/PLUGIN_GUIDE.md)
- [API базы данных](docs/CHAT_DB_API.md)

## Примечание

Слушатель клавиш должен работать с правами администратора для перехвата глобальных хоткеев.


