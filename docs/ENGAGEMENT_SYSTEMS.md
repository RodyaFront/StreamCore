# Системы вовлечения пользователей в чат

Документ описывает системы геймификации и вовлечения пользователей в чат Twitch.

## 1. Система уровней и прогресса

### Описание
Система уровней на основе активности пользователей в чате. Пользователи получают опыт за различные действия и повышают уровень.

### Механика
- **Уровни**: от 1 до 100+ (или без ограничений)
- **Опыт (EXP)**: начисляется за различные действия
- **Прогресс**: визуальный прогресс-бар до следующего уровня
- **Бонусы**: за повышение уровня можно давать бейджи, упоминания, специальные права

### Источники опыта
- **Базовое сообщение**: 1-5 EXP (зависит от длины)
- **Слово дня**: +10 EXP за использование
- **Ежедневное задание**: +50-100 EXP за выполнение
- **Достижение**: +25-100 EXP в зависимости от редкости
- **Стрик**: бонус за каждый день стрика (+5 EXP за каждый день)
- **Помощь новичку**: +15 EXP
- **Репутация**: +5 EXP за каждую полученную репутацию

### Формула опыта для уровня
```
EXP для уровня N = 100 * N * (N + 1) / 2
Примеры:
- Уровень 1: 100 EXP
- Уровень 2: 300 EXP (100 + 200)
- Уровень 3: 600 EXP (100 + 200 + 300)
- Уровень 10: 5500 EXP
```

### Структура БД
```sql
CREATE TABLE user_levels (
    username TEXT PRIMARY KEY,
    level INTEGER DEFAULT 1,
    exp INTEGER DEFAULT 0,
    exp_to_next_level INTEGER DEFAULT 100,
    total_exp INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (username) REFERENCES user_stats(username)
);

CREATE INDEX idx_user_levels_level ON user_levels(level DESC);
CREATE INDEX idx_user_levels_exp ON user_levels(total_exp DESC);
```

### API Endpoints
- `GET /api/chat/levels/user?username=<username>` - получить уровень пользователя
- `GET /api/chat/levels/top?limit=<number>` - топ пользователей по уровню
- `GET /api/chat/levels/leaderboard?type=<level|exp>&limit=<number>` - лидерборд

### Команды чата
- `!level` или `!уровень` - показать свой уровень и прогресс
- `!levels` или `!топ` - показать топ по уровням

### Виджет в интерфейсе
- Отображение текущего уровня пользователя
- Прогресс-бар до следующего уровня
- Топ пользователей по уровням
- История повышений уровня

---

## 2. Система достижений

### Описание
Система достижений за различные активности в чате. Мотивирует пользователей к разнообразной активности.

### Типы достижений

#### Базовые достижения
- **Первое слово** - отправил первое сообщение
- **Активный участник** - 100/500/1000/5000 сообщений
- **Словарный запас** - использовал 50/100/200 уникальных слов
- **Долгожитель** - активность 7/30/100/365 дней подряд
- **Ночной совенок** - активность в ночное время (00:00-06:00)
- **Ранняя пташка** - активность утром (06:00-12:00)

#### Социальные достижения
- **Помощник** - помог 5/10/25 новичкам
- **Популярный** - получил 10/50/100 репутаций
- **Щедрый** - потратил 1000/5000/10000 очков на награды
- **Благодарный** - дал репутацию 10/50/100 пользователям

#### Специальные достижения
- **Слово дня мастер** - использовал слово дня 7/30/100 раз
- **Коллекционер** - собрал 100/500/1000 уникальных слов
- **Легенда** - достиг уровня 50/75/100
- **Перфекционист** - выполнил все ежедневные задания 7/30 дней подряд

### Структура БД
```sql
CREATE TABLE achievements (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- 'basic', 'social', 'special'
    condition_type TEXT NOT NULL, -- 'message_count', 'streak', 'reputation', etc.
    condition_value INTEGER NOT NULL,
    reward_exp INTEGER DEFAULT 0,
    icon TEXT, -- название иконки или эмодзи
    rarity TEXT DEFAULT 'common' -- 'common', 'rare', 'epic', 'legendary'
);

CREATE TABLE user_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (username) REFERENCES user_stats(username),
    FOREIGN KEY (achievement_id) REFERENCES achievements(id),
    UNIQUE(username, achievement_id)
);

CREATE INDEX idx_user_achievements_username ON user_achievements(username);
CREATE INDEX idx_user_achievements_unlocked_at ON user_achievements(unlocked_at DESC);
```

### API Endpoints
- `GET /api/chat/achievements/list` - список всех достижений
- `GET /api/chat/achievements/user?username=<username>` - достижения пользователя
- `GET /api/chat/achievements/recent?limit=<number>` - недавно разблокированные достижения

### Команды чата
- `!achievements` или `!достижения` - показать свои достижения
- `!achievement <id>` - информация о конкретном достижении

### Виджет в интерфейсе
- Список всех достижений с фильтрацией по категориям
- Прогресс к недостигнутым достижениям
- Недавно разблокированные достижения
- Статистика: сколько достижений у пользователя из общего числа

### Логика проверки
- Проверка достижений должна происходить при:
  - Отправке сообщения
  - Получении репутации
  - Выполнении задания
  - Повышении уровня
  - Обновлении стрика

---

## 3. Ежедневные задания

### Описание
Система ежедневных заданий, которые мотивируют пользователей к регулярной активности в чате.

### Типы заданий

#### Базовые задания
- **Напиши сообщения** - написать 10/20/50 сообщений
- **Используй слово дня** - использовать слово дня в сообщении
- **Помоги новичку** - ответить на вопрос новичка
- **Оставь совет** - использовать команду !совет

#### Социальные задания
- **Дай репутацию** - дать репутацию другому пользователю
- **Получи репутацию** - получить репутацию от другого пользователя
- **Активность в чате** - быть активным в течение часа

#### Специальные задания
- **Длинное сообщение** - написать сообщение длиннее 50 символов
- **Разнообразие** - использовать 10 разных слов в сообщениях
- **Время активности** - быть активным в определенное время

### Структура БД
```sql
CREATE TABLE daily_quests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    target_type TEXT NOT NULL, -- 'message_count', 'word_of_day', 'reputation', etc.
    target_value INTEGER NOT NULL,
    reward_exp INTEGER DEFAULT 50,
    category TEXT DEFAULT 'basic', -- 'basic', 'social', 'special'
    enabled BOOLEAN DEFAULT 1
);

CREATE TABLE user_quest_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    quest_id TEXT NOT NULL,
    date DATE NOT NULL,
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT 0,
    completed_at DATETIME,
    FOREIGN KEY (quest_id) REFERENCES daily_quests(id),
    UNIQUE(username, quest_id, date)
);

CREATE INDEX idx_user_quest_progress_username_date ON user_quest_progress(username, date);
CREATE INDEX idx_user_quest_progress_completed ON user_quest_progress(completed, date);
```

### Логика работы
1. **Генерация заданий**: каждый день в 00:00 создаются новые задания для всех пользователей
2. **Отслеживание прогресса**: прогресс обновляется при выполнении действий
3. **Автоматическое выполнение**: некоторые задания проверяются автоматически
4. **Награды**: при выполнении задания пользователь получает EXP и уведомление

### API Endpoints
- `GET /api/chat/quests/daily?username=<username>` - текущие задания пользователя
- `GET /api/chat/quests/today` - все задания на сегодня
- `POST /api/chat/quests/complete` - отметить задание как выполненное (если требуется ручное подтверждение)

### Команды чата
- `!quests` или `!задания` - показать текущие задания
- `!quest <id>` - информация о конкретном задании

### Виджет в интерфейсе
- Список текущих заданий с прогресс-барами
- Время до сброса заданий (до 00:00)
- История выполненных заданий
- Статистика: сколько заданий выполнено за неделю/месяц

---

## 4. Система "Слово дня"

### Описание
Каждый день выбирается случайное слово. Пользователи получают бонусы за использование этого слова в своих сообщениях.

### Механика
- **Выбор слова**: случайное слово из базы или из популярных слов чата
- **Бонусы**: EXP за использование слова дня
- **Счетчик**: отслеживание количества использований слова дня
- **Топ**: рейтинг пользователей по использованию слова дня

### Структура БД
```sql
CREATE TABLE word_of_the_day (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE UNIQUE NOT NULL,
    word TEXT NOT NULL,
    usage_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE word_of_the_day_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    username TEXT NOT NULL,
    message_id INTEGER,
    used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (username) REFERENCES user_stats(username),
    FOREIGN KEY (message_id) REFERENCES messages(id)
);

CREATE INDEX idx_word_of_day_date ON word_of_the_day(date DESC);
CREATE INDEX idx_word_usage_date_username ON word_of_the_day_usage(date, username);
```

### Логика работы
1. **Генерация**: каждый день в 00:00 выбирается новое слово
2. **Проверка**: при отправке сообщения проверяется наличие слова дня
3. **Награда**: при использовании слова дня пользователь получает +10 EXP
4. **Статистика**: обновляется счетчик использований

### Источники слов
- Популярные слова из истории чата (но не слишком частые)
- Слова из определенной тематики (можно настроить)
- Случайные слова из словаря

### API Endpoints
- `GET /api/chat/word-of-day` - получить слово дня
- `GET /api/chat/word-of-day/stats?date=<date>` - статистика использования слова дня
- `GET /api/chat/word-of-day/top?date=<date>&limit=<number>` - топ пользователей по использованию

### Команды чата
- `!word` или `!слово` - показать слово дня
- `!wordstats` - статистика использования слова дня

### Виджет в интерфейсе
- Отображение слова дня крупным шрифтом
- Счетчик использований
- Топ пользователей по использованию слова дня
- История слов дня за последние дни

---

## 6. Система репутации

### Описание
Пользователи могут давать репутацию друг другу за полезные сообщения, помощь и активность.

### Механика
- **Дача репутации**: команда `!rep @username` или `!реп @username`
- **Ограничения**: 1 репутация в день на пользователя, максимум 5 репутаций в день всего
- **Награды**: за получение репутации пользователь получает +5 EXP
- **Рейтинг**: топ пользователей по репутации

### Структура БД
```sql
CREATE TABLE user_reputation (
    username TEXT PRIMARY KEY,
    reputation_score INTEGER DEFAULT 0,
    given_count INTEGER DEFAULT 0,
    received_count INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (username) REFERENCES user_stats(username)
);

CREATE TABLE reputation_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user TEXT NOT NULL,
    to_user TEXT NOT NULL,
    date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_user) REFERENCES user_stats(username),
    FOREIGN KEY (to_user) REFERENCES user_stats(username),
    UNIQUE(from_user, to_user, date)
);

CREATE INDEX idx_reputation_score ON user_reputation(reputation_score DESC);
CREATE INDEX idx_reputation_log_date ON reputation_log(date DESC);
CREATE INDEX idx_reputation_log_to_user ON reputation_log(to_user);
```

### Правила
- Пользователь не может дать репутацию самому себе
- Пользователь не может дать репутацию одному и тому же пользователю дважды в день
- Пользователь может дать максимум 5 репутаций в день
- Репутация не может быть отозвана

### API Endpoints
- `GET /api/chat/reputation/user?username=<username>` - репутация пользователя
- `GET /api/chat/reputation/top?limit=<number>` - топ по репутации
- `POST /api/chat/reputation/give` - дать репутацию (через команду в чате)

### Команды чата
- `!rep @username` или `!реп @username` - дать репутацию пользователю
- `!reputation` или `!репутация` - показать свою репутацию
- `!reptop` - топ по репутации

### Виджет в интерфейсе
- Текущая репутация пользователя
- Топ пользователей по репутации
- Недавно полученные репутации
- Статистика: сколько репутаций дано/получено

---

## 7. Система "Стрики" (Streaks)

### Описание
Система отслеживания дней подряд с активностью в чате. Мотивирует к регулярному участию.

### Механика
- **Стрик**: количество дней подряд с хотя бы одним сообщением
- **Бонусы**: за каждый день стрика пользователь получает +5 EXP
- **Рекорд**: самый длинный стрик пользователя
- **Уведомления**: при потере стрика пользователь получает уведомление

### Структура БД
```sql
-- Добавляем поля в существующую таблицу user_stats
ALTER TABLE user_stats ADD COLUMN current_streak INTEGER DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN longest_streak INTEGER DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN last_message_date DATE;
ALTER TABLE user_stats ADD COLUMN streak_bonus_exp INTEGER DEFAULT 0;

CREATE TABLE streak_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    streak_start DATE NOT NULL,
    streak_end DATE,
    streak_length INTEGER NOT NULL,
    FOREIGN KEY (username) REFERENCES user_stats(username)
);

CREATE INDEX idx_streak_current ON user_stats(current_streak DESC);
CREATE INDEX idx_streak_longest ON user_stats(longest_streak DESC);
```

### Логика работы
1. **Проверка**: при отправке сообщения проверяется дата последнего сообщения
2. **Обновление**: если сообщение отправлено в тот же день - стрик продолжается
3. **Сброс**: если прошло больше дня - стрик сбрасывается
4. **Бонус**: за каждый день стрика начисляется +5 EXP (максимум +50 EXP в день)

### Правила
- Сообщение должно быть отправлено до 23:59:59 текущего дня
- Если пользователь не был активен более 1 дня, стрик сбрасывается
- При сбросе стрика сохраняется история в `streak_history`

### API Endpoints
- `GET /api/chat/streaks/user?username=<username>` - стрик пользователя
- `GET /api/chat/streaks/top?limit=<number>` - топ по стрикам
- `GET /api/chat/streaks/history?username=<username>` - история стриков пользователя

### Команды чата
- `!streak` или `!стрик` - показать свой стрик
- `!streaks` - топ по стрикам

### Виджет в интерфейсе
- Текущий стрик пользователя с визуализацией
- Рекордный стрик
- Топ пользователей по стрикам
- Предупреждение о риске потери стрика (если не было активности сегодня)

### Ежедневная задача
- Автоматическая проверка всех пользователей в 00:00
- Обновление стриков и начисление бонусов
- Уведомления о потере стрика (можно отправить через Socket.IO)

---

## Интеграция систем

### Взаимосвязи
- **Уровни** получают EXP из всех систем
- **Достижения** разблокируются при выполнении условий из других систем
- **Задания** могут требовать действия из других систем
- **Слово дня** дает бонус EXP, который идет в уровни
- **Репутация** дает EXP и может быть условием для достижений
- **Стрики** дают бонус EXP и могут быть условием для достижений

### Общие компоненты
- Система уведомлений через Socket.IO
- Единая система начисления EXP
- Общие API endpoints для статистики
- Виджеты в интерфейсе для отображения всех систем

### Приоритет реализации
1. **Система уровней** - базовая геймификация
2. **Система стриков** - простая механика, мотивирует регулярность
3. **Система слова дня** - простая интеграция с существующей системой сообщений
4. **Система репутации** - социальное взаимодействие
5. **Система достижений** - требует интеграции со всеми системами
6. **Ежедневные задания** - требует интеграции со всеми системами

