import Cloudflare from 'cloudflare';
import {
	CLOUDFLARE_EMAIL,
	CLOUDFLARE_KV_API_TOKEN,
	CLOUDFLARE_KV_NAMESPACE_ID,
	CLOUDFLARE_ACCOUNT_ID
} from '$env/static/private';

/**
 * Cloudflare KV client using the official Cloudflare SDK
 * Documentation: https://developers.cloudflare.com/kv/api/
 */
class CloudflareKV {
	private client: Cloudflare;
	private namespaceId: string;
	private accountId: string;

	constructor() {
		// Check if all required environment variables are set
		if (
			!CLOUDFLARE_ACCOUNT_ID ||
			!CLOUDFLARE_KV_NAMESPACE_ID ||
			!CLOUDFLARE_EMAIL ||
			!CLOUDFLARE_KV_API_TOKEN
		) {
			console.error('Missing CloudflareKV configuration:', {
				CLOUDFLARE_ACCOUNT_ID: !!CLOUDFLARE_ACCOUNT_ID,
				CLOUDFLARE_KV_NAMESPACE_ID: !!CLOUDFLARE_KV_NAMESPACE_ID,
				CLOUDFLARE_EMAIL: !!CLOUDFLARE_EMAIL,
				CLOUDFLARE_KV_API_TOKEN: !!CLOUDFLARE_KV_API_TOKEN
			});
			throw new Error('Missing required Cloudflare KV configuration');
		}

		// Initialize the Cloudflare client with proper authentication
		this.client = new Cloudflare({
			apiEmail: CLOUDFLARE_EMAIL,
			apiKey: CLOUDFLARE_KV_API_TOKEN
		});

		this.namespaceId = CLOUDFLARE_KV_NAMESPACE_ID;
		this.accountId = CLOUDFLARE_ACCOUNT_ID;

		console.log(`📦 CloudflareKV SDK initialized with namespace: ${this.namespaceId}`);
	}

	/**
	 * Get a value from KV store using the official SDK
	 */
	async get<T = any>(key: string): Promise<T | null> {
		try {
			// Validate key format (CloudflareKV has restrictions)
			if (!key || key.length > 512) {
				console.warn(`Invalid KV key length: ${key}`);
				return null;
			}

			console.log(`📦 KV SDK GET: ${key}`);

			const result = await this.client.kv.namespaces.values.get(this.namespaceId, key, {
				account_id: this.accountId
			});

			if (result && typeof result === 'string') {
				const parsed = JSON.parse(result);
				console.log(`📦 KV SDK GET success: ${key} -> data found`);
				return parsed;
			}

			console.log(`📦 KV SDK key not found: ${key}`);
			return null;
		} catch (error: any) {
			if (error?.status === 404) {
				console.log(`📦 KV SDK key not found: ${key}`);
				return null;
			}
			console.error(`📦 Failed to get KV key "${key}":`, error);
			return null;
		}
	}

	/**
	 * Set a value in KV store using the official SDK
	 */
	async set(key: string, value: any, options?: { ttl?: number }): Promise<boolean> {
		try {
			console.log(`📦 KV SDK SET: ${key}`);

			const params: any = {
				account_id: this.accountId
			};

			if (options?.ttl) {
				params.expiration_ttl = options.ttl;
			}

			await this.client.kv.namespaces.values.update(this.namespaceId, key, {
				value: JSON.stringify(value),
				...params
			});

			console.log(`📦 KV SDK SET success: ${key}`);
			return true;
		} catch (error) {
			console.error(`📦 Failed to set KV key "${key}":`, error);
			return false;
		}
	}

	/**
	 * Delete a value from KV store using the official SDK
	 */
	async delete(key: string): Promise<boolean> {
		try {
			console.log(`📦 KV SDK DELETE: ${key}`);

			await this.client.kv.namespaces.values.delete(this.namespaceId, key, {
				account_id: this.accountId
			});

			console.log(`📦 KV SDK DELETE success: ${key}`);
			return true;
		} catch (error: any) {
			if (error?.status === 404) {
				console.log(`📦 KV SDK key not found for deletion: ${key}`);
				return true; // Not an error if key doesn't exist
			}
			console.error(`📦 Failed to delete KV key "${key}":`, error);
			return false;
		}
	}

	/**
	 * List keys with optional prefix using the official SDK
	 */
	async list(prefix?: string): Promise<string[]> {
		try {
			console.log(`📦 KV SDK LIST with prefix: ${prefix || 'none'}`);

			const params: any = {
				account_id: this.accountId
			};

			if (prefix) {
				params.prefix = prefix;
			}

			const result = await this.client.kv.namespaces.keys.list(this.namespaceId, params);

			const keys = result.result?.map((item: any) => item.name) || [];
			console.log(`📦 KV SDK LIST success: ${keys.length} keys found`);
			return keys;
		} catch (error) {
			console.error('📦 Failed to list KV keys:', error);
			return [];
		}
	}
}

// Export singleton instance
export const kv = new CloudflareKV();
