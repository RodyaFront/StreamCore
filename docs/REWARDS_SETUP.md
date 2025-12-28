# Настройка получения наград Twitch

## Минимальная настройка для логирования наград

Текущая реализация логирует активированные награды в консоль сервера, аналогично сообщениям из чата.

## Что нужно для работы

### 1. Настройка EventSub подписки

Для получения реальных событий наград нужно создать подписку через Twitch API:

```bash
curl -X POST 'https://api.twitch.tv/helix/eventsub/subscriptions' \
  -H 'Client-Id: YOUR_CLIENT_ID' \
  -H 'Authorization: Bearer YOUR_APP_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "channel.channel_points_custom_reward_redemption.add",
    "version": "1",
    "condition": {
      "broadcaster_user_id": "YOUR_BROADCASTER_ID"
    },
    "transport": {
      "method": "webhook",
      "callback": "https://your-domain.com/api/eventsub/callback",
      "secret": "YOUR_WEBHOOK_SECRET"
    }
  }'
```

### 2. Переменные окружения

Добавьте в `.env`:

```env
TWITCH_WEBHOOK_SECRET=ваш_секретный_ключ_минимум_10_символов
```

**Важно:** Секрет должен быть минимум 10 символов. Рекомендуется использовать случайную строку:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Публичный URL

Для локальной разработки используйте ngrok или localtunnel:

```bash
# ngrok
ngrok http 3001

# localtunnel
lt --port 3001
```

Используйте полученный URL в `callback` при создании подписки.

## Что логируется

При активации награды в консоли появится:

```
[REWARDS] Награда активирована: "Название награды" от Username (100 очков)
[REWARDS] Ввод пользователя: "текст ввода" (если требуется)
[REWARDS] ID награды: abc123...
[REWARDS] ID активации: xyz789...
[REWARDS] Статус: unfulfilled
[REWARDS] Время активации: 2025-01-20T15:30:00Z
```

## Безопасность

Код автоматически проверяет подпись веб-хука от Twitch через HMAC-SHA256 для защиты от поддельных запросов.

## Тестирование без EventSub

Для тестирования можно использовать Twitch CLI:

```bash
twitch event trigger channel.channel_points_custom_reward_redemption.add \
  --broadcaster-user-id YOUR_BROADCASTER_ID \
  --reward-id YOUR_REWARD_ID \
  --user-id TEST_USER_ID \
  --user-input "тестовый ввод" \
  --secret YOUR_WEBHOOK_SECRET \
  -F http://localhost:3001/api/eventsub/callback
```

## Документация

- [Twitch EventSub Documentation](https://dev.twitch.tv/docs/eventsub)
- [Channel Points Custom Reward Redemption Event](https://dev.twitch.tv/docs/eventsub/eventsub-reference#channel-channel-points-custom-reward-redemption-add)

