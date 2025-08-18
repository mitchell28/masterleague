/**
 * Cron job coordination system to prevent conflicts and track health
 * Simplified to use memory-only storage instead of CloudflareKV
 */

// Simple memory storage for cron coordination
class CronMemoryStore {
	private data = new Map<string, { value: any; expiry: number }>();

	async get<T>(key: string): Promise<T | null> {
		const item = this.data.get(key);
		if (!item) return null;

		if (Date.now() > item.expiry) {
			this.data.delete(key);
			return null;
		}

		return item.value;
	}

	async set(key: string, value: any, options?: { ttl?: number }): Promise<boolean> {
		const ttl = options?.ttl ? options.ttl * 1000 : 60 * 60 * 1000; // Default 1 hour
		this.data.set(key, {
			value,
			expiry: Date.now() + ttl
		});
		return true;
	}

	async delete(key: string): Promise<boolean> {
		this.data.delete(key);
		return true;
	}
}

const cronStore = new CronMemoryStore();

export class CronCoordinator {
	private static readonly CRON_LOCK_TTL = 300; // 5 minutes
	private static readonly HEALTH_TTL = 3600; // 1 hour

	/**
	 * Lock keys for different cron job types
	 */
	private static readonly LOCK_KEYS = {
		leaderboard: (orgId: string, season: string) => `cron:lock:leaderboard:${orgId}:${season}`,
		fixtures: (week?: number) => `cron:lock:fixtures${week ? `:${week}` : ''}`,
		predictions: (identifier?: string) =>
			`cron:lock:predictions${identifier ? `:${identifier}` : ''}`,
		maintenance: () => 'cron:lock:maintenance'
	} as const;

	/**
	 * Health tracking keys
	 */
	private static readonly HEALTH_KEYS = {
		lastRun: (jobType: string) => `cron:health:${jobType}:last_run`,
		lastSuccess: (jobType: string) => `cron:health:${jobType}:last_success`,
		consecutiveFailures: (jobType: string) => `cron:health:${jobType}:failures`
	} as const;

	/**
	 * Acquire a lock for a specific cron job type
	 */
	static async acquireLock(
		lockType: 'leaderboard' | 'fixtures' | 'predictions' | 'maintenance',
		identifier?: string
	): Promise<{ acquired: boolean; heldBy?: string; ttl?: number }> {
		try {
			let lockKey: string;

			switch (lockType) {
				case 'leaderboard':
					if (!identifier) throw new Error('Organization ID required for leaderboard lock');
					const [orgId, season = '2025-26'] = identifier.split(':');
					lockKey = this.LOCK_KEYS.leaderboard(orgId, season);
					break;
				case 'fixtures':
					lockKey = this.LOCK_KEYS.fixtures(identifier ? parseInt(identifier) : undefined);
					break;
				case 'predictions':
					lockKey = this.LOCK_KEYS.predictions(identifier);
					break;
				case 'maintenance':
					lockKey = this.LOCK_KEYS.maintenance();
					break;
				default:
					throw new Error(`Unknown lock type: ${lockType}`);
			}

			// Check if lock already exists
			const existingLock = await cronStore.get<{
				acquiredBy: string;
				acquiredAt: string;
				lockType: string;
			}>(lockKey);

			if (existingLock) {
				const acquiredAt = new Date(existingLock.acquiredAt);
				const ttl = Math.max(0, this.CRON_LOCK_TTL - (Date.now() - acquiredAt.getTime()) / 1000);

				return {
					acquired: false,
					heldBy: existingLock.acquiredBy,
					ttl: Math.round(ttl)
				};
			}

			// Acquire the lock
			const lockData = {
				acquiredBy: `cron-${Date.now()}`,
				acquiredAt: new Date().toISOString(),
				lockType,
				identifier: identifier || null
			};

			const success = await cronStore.set(lockKey, lockData, { ttl: this.CRON_LOCK_TTL });

			return {
				acquired: success,
				heldBy: success ? lockData.acquiredBy : undefined
			};
		} catch (error) {
			console.error(`Failed to acquire ${lockType} lock:`, error);
			return { acquired: false };
		}
	}

	/**
	 * Release a lock
	 */
	static async releaseLock(
		lockType: 'leaderboard' | 'fixtures' | 'predictions' | 'maintenance',
		identifier?: string
	): Promise<boolean> {
		try {
			let lockKey: string;

			switch (lockType) {
				case 'leaderboard':
					if (!identifier) return false;
					const [orgId, season = '2025-26'] = identifier.split(':');
					lockKey = this.LOCK_KEYS.leaderboard(orgId, season);
					break;
				case 'fixtures':
					lockKey = this.LOCK_KEYS.fixtures(identifier ? parseInt(identifier) : undefined);
					break;
				case 'predictions':
					lockKey = this.LOCK_KEYS.predictions(identifier);
					break;
				case 'maintenance':
					lockKey = this.LOCK_KEYS.maintenance();
					break;
				default:
					return false;
			}

			return await cronStore.delete(lockKey);
		} catch (error) {
			console.error(`Failed to release ${lockType} lock:`, error);
			return false;
		}
	}

	/**
	 * Track cron job execution and health
	 */
	static async trackExecution(
		jobType: string,
		success: boolean,
		metadata?: {
			duration?: number;
			itemsProcessed?: number;
			errors?: string[];
		}
	): Promise<void> {
		try {
			const timestamp = new Date().toISOString();

			// Update last run time
			await cronStore.set(this.HEALTH_KEYS.lastRun(jobType), timestamp, { ttl: this.HEALTH_TTL });

			if (success) {
				// Update last success time
				await cronStore.set(this.HEALTH_KEYS.lastSuccess(jobType), timestamp, {
					ttl: this.HEALTH_TTL
				});

				// Reset consecutive failures
				await cronStore.delete(this.HEALTH_KEYS.consecutiveFailures(jobType));

				console.log(`✅ Cron job ${jobType} completed successfully`, metadata);
			} else {
				// Increment consecutive failures
				const currentFailures = await cronStore.get<number>(
					this.HEALTH_KEYS.consecutiveFailures(jobType)
				);
				const newFailureCount = (currentFailures || 0) + 1;

				await cronStore.set(this.HEALTH_KEYS.consecutiveFailures(jobType), newFailureCount, {
					ttl: this.HEALTH_TTL
				});

				console.error(
					`❌ Cron job ${jobType} failed (${newFailureCount} consecutive failures)`,
					metadata
				);
			}
		} catch (error) {
			console.error(`Failed to track execution for ${jobType}:`, error);
		}
	}

	/**
	 * Get health status for all or specific cron jobs
	 */
	static async getHealthStatus(jobType?: string): Promise<{
		[key: string]: {
			lastRun: string | null;
			lastSuccess: string | null;
			consecutiveFailures: number;
			isHealthy: boolean;
			status: 'healthy' | 'warning' | 'critical' | 'unknown';
		};
	}> {
		const jobTypes = jobType
			? [jobType]
			: [
					'leaderboard-peak',
					'leaderboard-offpeak',
					'leaderboard-weekly',
					'fixtures-live',
					'fixtures-regular',
					'daily-check',
					'health-check'
				];

		const healthStatus: any = {};

		for (const job of jobTypes) {
			try {
				const [lastRun, lastSuccess, consecutiveFailures] = await Promise.all([
					cronStore.get<string>(this.HEALTH_KEYS.lastRun(job)),
					cronStore.get<string>(this.HEALTH_KEYS.lastSuccess(job)),
					cronStore.get<number>(this.HEALTH_KEYS.consecutiveFailures(job))
				]);

				const failures = consecutiveFailures || 0;
				const now = Date.now();

				// Determine status based on last success and failure count
				let status: 'healthy' | 'warning' | 'critical' | 'unknown' = 'unknown';
				let isHealthy = false;

				if (lastSuccess) {
					const lastSuccessTime = new Date(lastSuccess).getTime();
					const timeSinceSuccess = now - lastSuccessTime;

					if (failures === 0 && timeSinceSuccess < 2 * 60 * 60 * 1000) {
						// 2 hours
						status = 'healthy';
						isHealthy = true;
					} else if (failures < 3 && timeSinceSuccess < 6 * 60 * 60 * 1000) {
						// 6 hours
						status = 'warning';
					} else {
						status = 'critical';
					}
				}

				healthStatus[job] = {
					lastRun,
					lastSuccess,
					consecutiveFailures: failures,
					isHealthy,
					status
				};
			} catch (error) {
				console.error(`Failed to get health status for ${job}:`, error);
				healthStatus[job] = {
					lastRun: null,
					lastSuccess: null,
					consecutiveFailures: 0,
					isHealthy: false,
					status: 'unknown' as const
				};
			}
		}

		return healthStatus;
	}

	/**
	 * Check if a cron job should run based on last execution and current system state
	 */
	static async shouldJobRun(
		jobType: string,
		intervalMinutes: number,
		options?: {
			skipIfRecentlyFailed?: boolean;
			maxConsecutiveFailures?: number;
		}
	): Promise<{ shouldRun: boolean; reason: string }> {
		try {
			const healthStatus = await this.getHealthStatus(jobType);
			const jobHealth = healthStatus[jobType];

			if (!jobHealth) {
				return { shouldRun: true, reason: 'no-previous-execution' };
			}

			// Check consecutive failures
			const maxFailures = options?.maxConsecutiveFailures || 5;
			if (jobHealth.consecutiveFailures >= maxFailures) {
				return { shouldRun: false, reason: `too-many-failures-${jobHealth.consecutiveFailures}` };
			}

			// Skip if recently failed and option is set
			if (options?.skipIfRecentlyFailed && jobHealth.consecutiveFailures > 0 && jobHealth.lastRun) {
				const lastRunTime = new Date(jobHealth.lastRun).getTime();
				const timeSinceLastRun = Date.now() - lastRunTime;

				// Skip if failed within last 30 minutes
				if (timeSinceLastRun < 30 * 60 * 1000) {
					return { shouldRun: false, reason: 'recently-failed' };
				}
			}

			// Check interval
			if (jobHealth.lastSuccess) {
				const lastSuccessTime = new Date(jobHealth.lastSuccess).getTime();
				const timeSinceSuccess = Date.now() - lastSuccessTime;
				const intervalMs = intervalMinutes * 60 * 1000;

				if (timeSinceSuccess < intervalMs) {
					const minutesRemaining = Math.ceil((intervalMs - timeSinceSuccess) / 60000);
					return { shouldRun: false, reason: `interval-not-met-${minutesRemaining}min` };
				}
			}

			return { shouldRun: true, reason: 'interval-met' };
		} catch (error) {
			console.error(`Failed to check if ${jobType} should run:`, error);
			return { shouldRun: true, reason: 'check-failed-defaulting-to-run' };
		}
	}

	/**
	 * Coordinate predictions and leaderboard cron jobs
	 * Ensures proper sequencing: predictions -> leaderboard when live matches are active
	 */
	static async coordinatePredictionsLeaderboard(
		organizationId: string,
		hasLiveMatches: boolean,
		predictionsUpdateResult?: { success: boolean; fixturesProcessed: number }
	): Promise<{
		shouldTriggerLeaderboard: boolean;
		reason: string;
		coordination: 'sequential' | 'parallel' | 'skip';
	}> {
		try {
			// Always trigger leaderboard if there are live matches
			if (hasLiveMatches) {
				return {
					shouldTriggerLeaderboard: true,
					reason: 'live-matches-detected',
					coordination: 'sequential'
				};
			}

			// Trigger if predictions processing resulted in changes
			if (predictionsUpdateResult?.success && predictionsUpdateResult.fixturesProcessed > 0) {
				return {
					shouldTriggerLeaderboard: true,
					reason: 'predictions-updated',
					coordination: 'sequential'
				};
			}

			// Check if leaderboard needs update based on last run time
			const leaderboardHealth = await this.getHealthStatus('leaderboard-update');
			const leaderboardStatus = leaderboardHealth['leaderboard-update'];

			if (leaderboardStatus?.lastSuccess) {
				const lastSuccessTime = new Date(leaderboardStatus.lastSuccess).getTime();
				const timeSinceSuccess = Date.now() - lastSuccessTime;
				const intervalMs = 15 * 60 * 1000; // 15 minutes

				if (timeSinceSuccess >= intervalMs) {
					return {
						shouldTriggerLeaderboard: true,
						reason: 'scheduled-leaderboard-update',
						coordination: 'parallel'
					};
				}
			}

			return {
				shouldTriggerLeaderboard: false,
				reason: 'no-triggers-met',
				coordination: 'skip'
			};
		} catch (error) {
			console.error('Coordination check failed:', error);
			return {
				shouldTriggerLeaderboard: false,
				reason: 'coordination-error',
				coordination: 'skip'
			};
		}
	}

	/**
	 * Get coordination status between different cron jobs
	 */
	static async getCoordinationStatus(): Promise<{
		activeJobs: string[];
		coordinationHealth: 'healthy' | 'warning' | 'critical';
		recommendations: string[];
	}> {
		try {
			const healthStatuses = await this.getHealthStatus();
			const jobNames = Object.keys(healthStatuses);

			const activeJobs = jobNames.filter((jobName) => {
				const status = healthStatuses[jobName];
				return status.isHealthy && status.status === 'healthy';
			});

			let coordinationHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
			const recommendations: string[] = [];

			// Check for conflicts or issues
			const failedJobs = jobNames.filter((jobName) => {
				const status = healthStatuses[jobName];
				return status.consecutiveFailures > 2;
			});

			if (failedJobs.length > 0) {
				coordinationHealth = 'warning';
				recommendations.push(
					`${failedJobs.length} job(s) have multiple failures: ${failedJobs.join(', ')}`
				);
			}

			const stalledJobs = jobNames.filter((jobName) => {
				const status = healthStatuses[jobName];
				if (!status.lastRun) return false;
				const stalledThreshold = 60 * 60 * 1000; // 1 hour
				return Date.now() - new Date(status.lastRun).getTime() > stalledThreshold;
			});

			if (stalledJobs.length > 0) {
				coordinationHealth = stalledJobs.length > 1 ? 'critical' : 'warning';
				recommendations.push(
					`${stalledJobs.length} job(s) appear stalled: ${stalledJobs.join(', ')}`
				);
			}

			return {
				activeJobs,
				coordinationHealth,
				recommendations
			};
		} catch (error) {
			console.error('Failed to get coordination status:', error);
			return {
				activeJobs: [],
				coordinationHealth: 'critical',
				recommendations: ['Failed to check coordination status']
			};
		}
	}
}
