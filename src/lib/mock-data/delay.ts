/**
 * Injects artificial latency around a mock value so loading/skeleton UI is
 * actually exercised while there's no real backend to wait on.
 */
export async function simulateNetwork<T>(value: T, ms = 400): Promise<T> {
	await new Promise((resolve) => setTimeout(resolve, ms));
	return value;
}
