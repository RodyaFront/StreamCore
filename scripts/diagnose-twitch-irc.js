import 'dotenv/config';
import { logger } from '../src/backend/core/logger.js';

async function validateToken(token) {
    try {
        const tokenWithoutPrefix = token.replace('oauth:', '');
        const response = await fetch('https://id.twitch.tv/oauth2/validate', {
            headers: {
                'Authorization': `OAuth ${tokenWithoutPrefix}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            return { valid: true, data };
        } else {
            const errorText = await response.text();
            return { valid: false, error: `HTTP ${response.status}: ${errorText}` };
        }
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

async function diagnose() {
    console.log('\n🔍 Диагностика Twitch IRC подключения\n');

    const username = process.env.TWITCH_ACCOUNT;
    const oauthToken = process.env.ACCESS_TOKEN;
    const channel = process.env.TWITCH_ACCOUNT;

    logger.section('📋 Проверка переменных окружения');

    console.log(`TWITCH_ACCOUNT: ${username ? `✓ ${username}` : '✗ НЕ УСТАНОВЛЕН'}`);
    console.log(`ACCESS_TOKEN: ${oauthToken ? `✓ ${oauthToken.substring(0, 10)}...` : '✗ НЕ УСТАНОВЛЕН'}`);
    console.log(`Channel: ${channel ? `✓ ${channel}` : '✗ НЕ УСТАНОВЛЕН'}`);

    if (!username || !oauthToken || !channel) {
        logger.error('Не все переменные окружения установлены');
        return;
    }

    logger.section('🔐 Проверка токена');

    const tokenResult = await validateToken(oauthToken);

    if (tokenResult.valid) {
        logger.success('Токен валиден');
        console.log(`  User ID: ${tokenResult.data.user_id}`);
        console.log(`  Login: ${tokenResult.data.login}`);
        console.log(`  Scopes: ${tokenResult.data.scopes?.join(', ') || 'нет'}`);

        const requiredScopes = ['chat:read', 'chat:edit'];
        const hasRequiredScopes = requiredScopes.every(scope =>
            tokenResult.data.scopes?.includes(scope)
        );

        if (hasRequiredScopes) {
            logger.success('Все необходимые права присутствуют');
        } else {
            logger.error('Отсутствуют необходимые права');
            console.log(`  Требуются: ${requiredScopes.join(', ')}`);
            console.log(`  Имеются: ${tokenResult.data.scopes?.join(', ') || 'нет'}`);
        }
    } else {
        logger.error('Токен невалиден', tokenResult.error);
    }

    logger.section('🌐 Проверка подключения к Twitch IRC');

    const tls = await import('tls');
    const tokenWithoutPrefix = oauthToken.replace('oauth:', '');
    const ircUsername = username.toLowerCase();
    const channelName = channel.startsWith('#') ? channel : `#${channel}`;

    console.log(`  Host: irc.chat.twitch.tv`);
    console.log(`  Port: 6697`);
    console.log(`  Username: ${ircUsername}`);
    console.log(`  Channel: ${channelName}`);
    console.log(`  Token: ${tokenWithoutPrefix.substring(0, 10)}...`);

    return new Promise((resolve) => {
        const socket = tls.default.connect({
            host: 'irc.chat.twitch.tv',
            port: 6697,
            rejectUnauthorized: false
        }, () => {
            logger.success('TCP соединение установлено');

            socket.setEncoding('utf8');
            socket.setTimeout(15000);

            let buffer = '';
            let authSent = false;
            let nickSent = false;
            let joined = false;

            socket.on('data', (data) => {
                buffer += data;
                const lines = buffer.split('\r\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim()) {
                        console.log(`  ← ${line}`);

                        if (line.startsWith('PING')) {
                            const pong = line.replace('PING', 'PONG');
                            socket.write(`${pong}\r\n`);
                            console.log(`  → ${pong}`);
                        }

                        if (line.includes('001') || line.includes('Welcome')) {
                            logger.success('Получен ответ 001 (Welcome)');
                        }

                        if (line.includes('376') || line.includes('422')) {
                            if (!nickSent) {
                                logger.info('Отправка JOIN команды...');
                                socket.write(`JOIN ${channelName}\r\n`);
                                nickSent = true;
                                console.log(`  → JOIN ${channelName}`);
                            }
                        }

                        if (line.includes(`JOIN ${channelName}`) && (line.includes(ircUsername) || line.includes(`:${ircUsername}!`))) {
                            logger.success('Успешно присоединился к каналу');
                            console.log(`  Детали: ${line}`);
                            joined = true;
                            setTimeout(() => {
                                socket.destroy();
                                resolve();
                            }, 1000);
                        }

                        if (line.includes('353')) {
                            console.log(`  ← ${line}`);
                            logger.info('Получен список пользователей (353)');
                        }

                        if (line.includes('366')) {
                            console.log(`  ← ${line}`);
                            logger.success('Получен ответ 366 (End of NAMES)', 'канал готов');
                            if (!joined) {
                                joined = true;
                                setTimeout(() => {
                                    socket.destroy();
                                    resolve();
                                }, 1000);
                            }
                        }

                        if (line.includes('NOTICE') && line.includes('You are banned')) {
                            logger.error('Вы забанены в канале', line);
                            socket.destroy();
                            resolve();
                        }

                        if (line.includes('NOTICE') && line.includes('Cannot join')) {
                            logger.error('Не удалось присоединиться к каналу', line);
                            socket.destroy();
                            resolve();
                        }

                        if (line.includes('Login authentication failed') || line.includes('Invalid NICK')) {
                            logger.error('Ошибка аутентификации', line);
                            socket.destroy();
                            resolve();
                        }

                        if (line.includes('NOTICE') && line.includes('authentication failed')) {
                            logger.error('Аутентификация не удалась', line);
                            socket.destroy();
                            resolve();
                        }
                    }
                }
            });

            socket.on('error', (err) => {
                logger.error('Ошибка сокета', err.message);
                resolve();
            });

            socket.on('timeout', () => {
                logger.warning('Таймаут соединения');
                socket.destroy();
                resolve();
            });

            socket.on('close', () => {
                if (!joined) {
                    logger.warning('Соединение закрыто до присоединения к каналу');
                }
                resolve();
            });

            setTimeout(() => {
                if (!authSent) {
                    socket.write(`PASS oauth:${tokenWithoutPrefix}\r\n`);
                    authSent = true;
                    console.log(`  → PASS oauth:${tokenWithoutPrefix.substring(0, 10)}...`);
                }

                if (!nickSent) {
                    socket.write(`NICK ${ircUsername}\r\n`);
                    nickSent = true;
                    console.log(`  → NICK ${ircUsername}`);
                }
            }, 100);
        });

        socket.on('error', (err) => {
            logger.error('Ошибка подключения', err.message);
            console.log(`  Код ошибки: ${err.code}`);
            resolve();
        });
    });
}

diagnose().then(() => {
    console.log('\n✅ Диагностика завершена\n');
    process.exit(0);
}).catch((error) => {
    logger.error('Ошибка при диагностике', error.message);
    console.error(error);
    process.exit(1);
});

