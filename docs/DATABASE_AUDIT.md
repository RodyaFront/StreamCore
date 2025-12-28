# Аудит базы данных StreamCore

Дата аудита: 2025-01-20

## Общая информация

- **СУБД**: SQLite 3 (better-sqlite3)
- **Режим журналирования**: WAL (Write-Ahead Logging)
- **Расположение**: `data/chat_database.db`
- **Версия библиотеки**: better-sqlite3 ^12.5.0

---

## Структура базы данных

### Таблицы

#### 1. `messages`
**Назначение**: Хранение всех сообщений из чата Twitch

**Структура**:
```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    display_name TEXT,
    message TEXT NOT NULL,
    channel TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_command BOOLEAN DEFAULT 0
);
```

**Индексы**:
- `idx_messages_username` - на поле `username`
- `idx_messages_timestamp` - на поле `timestamp`
- `idx_messages_channel` - на поле `channel`

**Анализ**:
- ✅ Используется PRIMARY KEY для `id`
- ✅ Индексы на часто используемых полях
- ⚠️ `display_name` может быть NULL (нормально)
- ⚠️ `is_command` хранится как INTEGER (0/1), но используется как BOOLEAN в коде
- ⚠️ Нет индекса на комбинацию `(username, timestamp)` для быстрого поиска сообщений пользователя по времени
- ⚠️ Нет индекса на `is_command` для фильтрации команд

**Рекомендации**:
- Добавить составной индекс `(username, timestamp DESC)` для запросов типа "последние N сообщений пользователя"
- Рассмотреть добавление индекса на `is_command` если нужна фильтрация команд

---

#### 2. `user_stats`
**Назначение**: Статистика пользователей чата

**Структура**:
```sql
CREATE TABLE user_stats (
    username TEXT PRIMARY KEY,
    message_count INTEGER DEFAULT 0,
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_characters INTEGER DEFAULT 0,
    favorite_words TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Индексы**:
- Нет дополнительных индексов (только PRIMARY KEY на `username`)

**Анализ**:
- ✅ PRIMARY KEY на `username`
- ✅ Все числовые поля имеют значения по умолчанию
- ⚠️ `favorite_words` хранится как TEXT (JSON), что усложняет запросы
- ⚠️ Нет индекса на `message_count` для быстрого получения топов
- ⚠️ Нет индекса на `last_seen` для поиска активных пользователей
- ⚠️ Нет индекса на `first_seen` для поиска новичков

**Рекомендации**:
- Добавить индекс `idx_user_stats_message_count` на `message_count DESC` для топов
- Добавить индекс `idx_user_stats_last_seen` на `last_seen DESC` для активных пользователей
- Рассмотреть нормализацию `favorite_words` в отдельную таблицу (если нужны сложные запросы)

---

#### 3. `rewards`
**Назначение**: Информация о наградах Twitch Channel Points

**Структура**:
```sql
CREATE TABLE rewards (
    reward_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    cost INTEGER NOT NULL,
    enabled BOOLEAN DEFAULT 1,
    prompt TEXT,
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    redemption_count INTEGER DEFAULT 0
);
```

**Индексы**:
- Нет дополнительных индексов (только PRIMARY KEY на `reward_id`)

**Анализ**:
- ✅ PRIMARY KEY на `reward_id`
- ⚠️ `enabled` хранится как INTEGER (0/1), но используется как BOOLEAN
- ⚠️ Нет индекса на `redemption_count` для топов наград
- ⚠️ Нет индекса на `enabled` для фильтрации активных наград

**Рекомендации**:
- Добавить индекс `idx_rewards_redemption_count` на `redemption_count DESC` для топов
- Добавить индекс `idx_rewards_enabled` на `enabled` для фильтрации

---

#### 4. `redemptions`
**Назначение**: История активаций наград

**Структура**:
```sql
CREATE TABLE redemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    redemption_id TEXT UNIQUE NOT NULL,
    reward_id TEXT NOT NULL,
    username TEXT NOT NULL,
    cost INTEGER NOT NULL,
    status TEXT NOT NULL,
    user_input TEXT,
    redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    fulfilled_at DATETIME,
    FOREIGN KEY (reward_id) REFERENCES rewards(reward_id) ON DELETE CASCADE
);
```

**Индексы**:
- `idx_redemptions_username` - на поле `username`
- `idx_redemptions_reward_id` - на поле `reward_id`
- `idx_redemptions_redeemed_at` - на поле `redeemed_at`
- `idx_redemptions_status` - на поле `status`

**Анализ**:
- ✅ PRIMARY KEY на `id`
- ✅ UNIQUE constraint на `redemption_id` предотвращает дубликаты
- ✅ FOREIGN KEY с CASCADE для целостности данных
- ✅ Хорошее покрытие индексами
- ⚠️ Нет составного индекса `(username, redeemed_at DESC)` для истории пользователя
- ⚠️ Нет индекса на `fulfilled_at` для фильтрации выполненных наград

**Рекомендации**:
- Добавить составной индекс `(username, redeemed_at DESC)` для быстрого получения истории пользователя
- Рассмотреть добавление индекса на `fulfilled_at` если нужна фильтрация по статусу выполнения

---

## Запросы к базе данных

### Подготовленные запросы (Prepared Statements)

#### `queries/messages.js`
- ✅ `insertMessage` - INSERT с параметрами
- ✅ `getRecentMessages` - SELECT с LIMIT и ORDER BY
- ✅ `getMessagesByUser` - SELECT с WHERE и ORDER BY
- ✅ `getMessageStats` - агрегация с WHERE

**Анализ**:
- ✅ Все запросы используют prepared statements (безопасность от SQL injection)
- ✅ Используются параметризованные запросы
- ⚠️ `getMessagesByUser` может быть медленным для пользователей с большим количеством сообщений (нет LIMIT в запросе, только в коде)

#### `queries/users.js`
- ✅ `getUserStats` - простой SELECT
- ✅ `updateUserStats` - INSERT ... ON CONFLICT (UPSERT)
- ✅ `getTopUsers` - SELECT с ORDER BY и LIMIT
- ✅ `getUserPointsStats` - JOIN с агрегацией

**Анализ**:
- ✅ Использование UPSERT для атомарного обновления
- ✅ JOIN для объединения данных из разных таблиц
- ⚠️ `getUserMessagesAndPoints` использует подзапросы вместо JOIN (может быть медленнее)

#### `queries/rewards.js`
- ✅ `upsertReward` - INSERT ... ON CONFLICT (UPSERT)
- ✅ `insertRedemption` - INSERT ... ON CONFLICT DO NOTHING
- ✅ `updateRedemptionStatus` - UPDATE
- ✅ `getUserRedemptions` - JOIN с ORDER BY и LIMIT
- ✅ `getRewardRedemptions` - JOIN с ORDER BY и LIMIT
- ✅ `getTopRewards` - SELECT с ORDER BY и LIMIT

**Анализ**:
- ✅ Все запросы используют prepared statements
- ✅ Правильное использование JOIN для объединения данных
- ✅ Использование ON CONFLICT для предотвращения дубликатов

---

## Транзакции

### Использование транзакций

**В `services/chat/logger.js`**:
```javascript
const transaction = db.transaction(() => {
    insertMessage.run(...);
    updateUserStats.run(...);
});
transaction();
```

**Анализ**:
- ✅ Использование транзакций для атомарности операций
- ✅ Правильная структура транзакции

**В `services/chat/stats.js`**:
```javascript
const transaction = db.transaction((users) => {
    for (const user of users) {
        updateFavoriteWords.run(...);
    }
});
transaction(topUsers);
```

**Анализ**:
- ✅ Использование транзакций для массовых обновлений
- ✅ Передача параметров в транзакцию

---

## Потенциальные проблемы

### 1. Производительность

#### Проблема: Отсутствие индексов на часто используемых полях
- `user_stats.message_count` - используется для топов
- `user_stats.last_seen` - используется для поиска активных пользователей
- `rewards.redemption_count` - используется для топов наград

**Влияние**: Медленные запросы при росте данных

**Решение**: Добавить соответствующие индексы

---

#### Проблема: Отсутствие составных индексов
- `(messages.username, messages.timestamp DESC)` - для истории сообщений пользователя
- `(redemptions.username, redemptions.redeemed_at DESC)` - для истории наград пользователя

**Влияние**: Медленные запросы при фильтрации по нескольким полям

**Решение**: Добавить составные индексы

---

### 2. Целостность данных

#### Проблема: Отсутствие FOREIGN KEY на `redemptions.username`
```sql
FOREIGN KEY (username) REFERENCES user_stats(username) ON DELETE CASCADE
```

**Влияние**: Возможны "висячие" записи в `redemptions` если пользователь удален из `user_stats`

**Решение**: Добавить FOREIGN KEY constraint

---

#### Проблема: Отсутствие проверки типов данных
- `is_command` хранится как INTEGER, но используется как BOOLEAN
- `enabled` хранится как INTEGER, но используется как BOOLEAN

**Влияние**: Потенциальная путаница при работе с данными

**Решение**: Использовать CHECK constraint или хранить как INTEGER с явной проверкой

---

### 3. Масштабируемость

#### Проблема: Хранение JSON в TEXT поле
- `user_stats.favorite_words` хранится как JSON в TEXT

**Влияние**: Невозможность эффективных запросов по содержимому JSON

**Решение**: Рассмотреть нормализацию в отдельную таблицу `user_favorite_words` если нужны сложные запросы

---

#### Проблема: Отсутствие партиционирования
- Таблица `messages` может расти неограниченно

**Влияние**: Медленные запросы при большом объеме данных

**Решение**: Рассмотреть архивацию старых сообщений или партиционирование по датам

---

## Рекомендации по улучшению

### Критичные (высокий приоритет)

1. **Добавить индексы на часто используемые поля**:
   ```sql
   CREATE INDEX idx_user_stats_message_count ON user_stats(message_count DESC);
   CREATE INDEX idx_user_stats_last_seen ON user_stats(last_seen DESC);
   CREATE INDEX idx_rewards_redemption_count ON rewards(redemption_count DESC);
   ```

2. **Добавить составные индексы**:
   ```sql
   CREATE INDEX idx_messages_username_timestamp ON messages(username, timestamp DESC);
   CREATE INDEX idx_redemptions_username_redeemed ON redemptions(username, redeemed_at DESC);
   ```

3. **Добавить FOREIGN KEY на `redemptions.username`**:
   ```sql
   ALTER TABLE redemptions ADD CONSTRAINT fk_redemptions_username
   FOREIGN KEY (username) REFERENCES user_stats(username) ON DELETE CASCADE;
   ```

---

### Важные (средний приоритет)

4. **Добавить индексы для фильтрации**:
   ```sql
   CREATE INDEX idx_messages_is_command ON messages(is_command);
   CREATE INDEX idx_rewards_enabled ON rewards(enabled);
   ```

5. **Добавить индексы для поиска новичков**:
   ```sql
   CREATE INDEX idx_user_stats_first_seen ON user_stats(first_seen);
   ```

---

### Желательные (низкий приоритет)

6. **Рассмотреть нормализацию `favorite_words`**:
   ```sql
   CREATE TABLE user_favorite_words (
       username TEXT NOT NULL,
       word TEXT NOT NULL,
       count INTEGER DEFAULT 1,
       PRIMARY KEY (username, word),
       FOREIGN KEY (username) REFERENCES user_stats(username) ON DELETE CASCADE
   );
   ```

7. **Добавить CHECK constraints для валидации**:
   ```sql
   ALTER TABLE messages ADD CONSTRAINT chk_is_command
   CHECK (is_command IN (0, 1));

   ALTER TABLE rewards ADD CONSTRAINT chk_enabled
   CHECK (enabled IN (0, 1));
   ```

---

## Подготовка к системе уровней

### Необходимые изменения для интеграции

1. **Создать таблицу `user_levels`**:
   ```sql
   CREATE TABLE user_levels (
       username TEXT PRIMARY KEY,
       level INTEGER DEFAULT 1,
       exp INTEGER DEFAULT 0,
       exp_to_next_level INTEGER DEFAULT 100,
       total_exp INTEGER DEFAULT 0,
       updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (username) REFERENCES user_stats(username) ON DELETE CASCADE
   );
   ```

2. **Добавить индексы**:
   ```sql
   CREATE INDEX idx_user_levels_level ON user_levels(level DESC);
   CREATE INDEX idx_user_levels_exp ON user_levels(total_exp DESC);
   ```

3. **Миграция существующих данных**:
   - Инициализировать уровни для всех существующих пользователей
   - Рассчитать начальный опыт на основе текущей статистики (опционально)

---

## Метрики для мониторинга

### Производительность
- Время выполнения запросов к `messages` (особенно `getRecentMessages`)
- Время выполнения запросов к `user_stats` (особенно `getTopUsers`)
- Размер базы данных

### Целостность данных
- Количество "висячих" записей в `redemptions` без соответствующего `user_stats`
- Соответствие `message_count` в `user_stats` реальному количеству сообщений

### Использование
- Количество сообщений в день
- Количество уникальных пользователей
- Рост размера таблицы `messages`

---

## Заключение

### Сильные стороны
- ✅ Использование prepared statements для безопасности
- ✅ Правильное использование транзакций
- ✅ Хорошее покрытие индексами для таблицы `redemptions`
- ✅ Использование WAL режима для лучшей производительности

### Области для улучшения
- ⚠️ Добавить недостающие индексы для улучшения производительности
- ⚠️ Добавить FOREIGN KEY constraints для целостности данных
- ⚠️ Рассмотреть нормализацию JSON полей при необходимости сложных запросов

### Готовность к расширению
- ✅ Структура базы данных позволяет легко добавлять новые таблицы
- ✅ Использование prepared statements упрощает добавление новых запросов
- ✅ Транзакции обеспечивают атомарность операций

---

## План действий

1. **Немедленно**: Добавить критичные индексы
2. **Перед внедрением системы уровней**: Создать таблицу `user_levels` и миграцию
3. **В ближайшее время**: Добавить FOREIGN KEY constraints
4. **По мере необходимости**: Рассмотреть нормализацию и оптимизацию запросов

