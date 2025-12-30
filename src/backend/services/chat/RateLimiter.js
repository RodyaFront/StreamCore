/**
 * Простой rate limiter для API запросов
 * Ограничивает количество запросов в единицу времени
 */
class RateLimiter {
    constructor(maxRequests = 30, timeWindow = 60000) {
        this.maxRequests = maxRequests; // Максимум запросов
        this.timeWindow = timeWindow; // Окно времени в миллисекундах
        this.requests = []; // Массив временных меток запросов
    }

    /**
     * Проверяет, можно ли сделать запрос
     * @returns {boolean} true если можно сделать запрос
     */
    canMakeRequest() {
        const now = Date.now();
        // Удаляем старые запросы вне временного окна
        this.requests = this.requests.filter(timestamp => now - timestamp < this.timeWindow);

        return this.requests.length < this.maxRequests;
    }

    /**
     * Регистрирует запрос
     */
    recordRequest() {
        this.requests.push(Date.now());
    }

    /**
     * Вычисляет время до следующего доступного слота
     * @returns {number} Время в миллисекундах
     */
    getTimeUntilNextSlot() {
        if (this.canMakeRequest()) {
            return 0;
        }

        const now = Date.now();
        const oldestRequest = Math.min(...this.requests);
        const timeSinceOldest = now - oldestRequest;
        return this.timeWindow - timeSinceOldest;
    }

    /**
     * Ожидает доступного слота и регистрирует запрос
     * @returns {Promise<void>}
     */
    async waitAndRecord() {
        while (!this.canMakeRequest()) {
            const waitTime = this.getTimeUntilNextSlot();
            if (waitTime > 0) {
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
        this.recordRequest();
    }
}

export function createRateLimiter(maxRequests = 30, timeWindow = 60000) {
    return new RateLimiter(maxRequests, timeWindow);
}

