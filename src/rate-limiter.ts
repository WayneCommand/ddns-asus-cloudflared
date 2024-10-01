class RateLimiter {
	private maxTokens: number;
	private refillRate: number; // tokens per second
	private store: any;

	constructor(maxTokens: number, refillRate: number, client: any) {
		this.maxTokens = maxTokens;
		this.refillRate = refillRate;
		this.store = client;
	}

	private async refillTokens(key: string) {
		const now = Date.now();
		let lastInfo: LimiterInfo = await this.store.get(key, "json");
		const lastRefill = lastInfo ? lastInfo.lastRefill : 0;
		const tokens = lastInfo ? lastInfo.tokens : 0;

		const elapsed = (now - lastRefill) / 1000; // convert to seconds

		const refill = Math.floor(elapsed / this.refillRate);
		const newTokens = Math.min(this.maxTokens, tokens + refill);

		if (newTokens > 0) {

			let info: LimiterInfo = {
				tokens: newTokens,
				lastRefill: now
			}
			await this.store.put(key, JSON.stringify(info));
		}
	}

	public async tryRemoveToken(key: string): Promise<boolean> {
		await this.refillTokens(key);
		let lastInfo: LimiterInfo = await this.store.get(key, "json");
		const tokens = lastInfo ? lastInfo.tokens : 0;

		if (tokens > 0) {

			lastInfo.tokens = tokens - 1;
			await this.store.put(key, JSON.stringify(lastInfo));

			return true;
		}
		return false;
	}
}

type LimiterInfo = {
	lastRefill: number,
	tokens: number
}

export {
	RateLimiter
}
