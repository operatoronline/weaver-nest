
/**
 * A simple async queue to limit concurrent requests.
 * Prevents flooding the API when multiple agents work or user spams inputs.
 */
export class RateLimiter {
    private queue: Array<() => Promise<void>> = [];
    private activeCount = 0;
    private maxConcurrent: number;
    private intervalMs: number;
    private lastRequestTime = 0;

    constructor(maxConcurrent = 2, minIntervalMs = 500) {
        this.maxConcurrent = maxConcurrent;
        this.intervalMs = minIntervalMs;
    }

    /**
     * Enqueue a task. It will execute when a slot is free.
     */
    async add<T>(task: () => Promise<T>, priority = 0): Promise<T> {
        return new Promise((resolve, reject) => {
            const wrappedTask = async () => {
                try {
                    // Enforce minimum interval between starts to smooth bursts
                    const now = Date.now();
                    const timeSinceLast = now - this.lastRequestTime;
                    if (timeSinceLast < this.intervalMs) {
                        await new Promise(r => setTimeout(r, this.intervalMs - timeSinceLast));
                    }
                    this.lastRequestTime = Date.now();

                    const result = await task();
                    resolve(result);
                } catch (e) {
                    reject(e);
                } finally {
                    this.activeCount--;
                    this.processNext();
                }
            };

            // Simple push (could add priority logic here)
            this.queue.push(wrappedTask);
            this.processNext();
        });
    }

    private processNext() {
        if (this.activeCount >= this.maxConcurrent || this.queue.length === 0) {
            return;
        }

        const nextTask = this.queue.shift();
        if (nextTask) {
            this.activeCount++;
            nextTask(); // execution handles its own completion/activeCount decrement
        }
    }

    get pending() {
        return this.queue.length;
    }

    get active() {
        return this.activeCount;
    }
}

// Reduced interval to 100ms to make follow-up requests (like streaming after routing) feel instant
export const globalLimiter = new RateLimiter(3, 100); 
