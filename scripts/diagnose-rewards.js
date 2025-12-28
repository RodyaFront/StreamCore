import 'dotenv/config';

console.log('='.repeat(60));
console.log('ДИАГНОСТИКА ОБРАБОТКИ НАГРАД TWITCH');
console.log('='.repeat(60));
console.log('');

// 1. Проверка переменных окружения
console.log('1. ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ:');
console.log('   CLIENT_ID:', process.env.CLIENT_ID ? '✅ установлен' : '❌ НЕ УСТАНОВЛЕН');
console.log('   SECRET:', process.env.SECRET ? '✅ установлен' : '❌ НЕ УСТАНОВЛЕН');
console.log('   ACCESS_TOKEN:', process.env.ACCESS_TOKEN ? '✅ установлен' : '❌ НЕ УСТАНОВЛЕН');
console.log('   REFRESH_TOKEN:', process.env.REFRESH_TOKEN ? '✅ установлен' : '❌ НЕ УСТАНОВЛЕН');
console.log('   TWITCH_ACCOUNT:', process.env.TWITCH_ACCOUNT || 'не установлен');
console.log('');

// 2. Проверка доступности endpoint
console.log('2. РЕАЛИЗАЦИЯ:');
console.log('   ✅ Используется WebSocket transport (@twurple/eventsub-ws)');
console.log('   ✅ Не требуется публичный URL (работает локально)');
console.log('   ✅ Не требуется создание подписок вручную');
console.log('   ✅ Подписки создаются автоматически при подключении');
console.log('');

// 3. Чеклист для диагностики
console.log('3. ЧЕКЛИСТ ДЛЯ ДИАГНОСТИКИ:');
console.log('');
console.log('   □ Проверьте логи сервера при запуске:');
console.log('     - Должны быть сообщения о запуске сервера');
console.log('     - Должны быть сообщения о подключении к Twitch IRC');
console.log('     - Должно быть: [REWARDS] ✅ EventSub WebSocket подключен');
console.log('');
console.log('   □ Проверьте токен доступа:');
console.log('     - ACCESS_TOKEN должен иметь scope: channel:read:redemptions');
console.log('     - Если токен не имеет нужных прав, получите новый через OAuth');
console.log('     - Используйте: https://twitchtokengenerator.com/');
console.log('');
console.log('   □ Проверьте логи при активации награды:');
console.log('     - Активируйте награду в Twitch');
console.log('     - Проверьте консоль сервера');
console.log('     - Должны появиться сообщения [REWARDS] Награда активирована');
console.log('');

// 4. Типичные проблемы
console.log('4. ТИПИЧНЫЕ ПРОБЛЕМЫ:');
console.log('');
console.log('   ❌ Токен не имеет нужных прав (scopes)');
console.log('      → ACCESS_TOKEN должен иметь: channel:read:redemptions');
console.log('      → Получите новый токен через OAuth с нужными scopes');
console.log('      → Используйте: https://twitchtokengenerator.com/');
console.log('');
console.log('   ❌ Ошибка подключения к WebSocket');
console.log('      → Проверьте интернет-соединение');
console.log('      → Проверьте, не блокирует ли firewall WebSocket соединения');
console.log('');
console.log('   ❌ Токен истек или невалиден');
console.log('      → RefreshingAuthProvider должен автоматически обновить токен');
console.log('      → Проверьте REFRESH_TOKEN');
console.log('');
console.log('   ❌ Неверные credentials');
console.log('      → Проверьте CLIENT_ID и SECRET');
console.log('      → Убедитесь, что они соответствуют приложению в Twitch Developer Console');
console.log('');

console.log('='.repeat(60));
console.log('Для получения подробных логов запустите сервер и активируйте награду');
console.log('='.repeat(60));
