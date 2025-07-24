interface LeaderboardEntry {
	id: string;
	username: string;
	totalPoints: number;
	correctScorelines: number;
	correctOutcomes: number;
	predictedFixtures: number;
	completedFixtures: number;
	lastUpdated?: string;
}

/**
 * Hook for calculating leaderboard metrics
 * @returns Object with calculation utilities
 */
export function useLeaderboardMetrics() {
	/**
	 * Calculate success rate for a leaderboard entry
	 * Success rate = (correctScorelines + correctOutcomes) / predictedFixtures * 100
	 */
	function calculateSuccessRate(entry: LeaderboardEntry): number {
		const predicted = entry.predictedFixtures || 0;
		if (!predicted) return 0;

		const successful = (entry.correctScorelines || 0) + (entry.correctOutcomes || 0);
		return Math.round((successful / predicted) * 100);
	}

	/**
	 * Calculate accuracy rate for perfect predictions only
	 */
	function calculateAccuracyRate(entry: LeaderboardEntry): number {
		const predicted = entry.predictedFixtures || 0;
		if (!predicted) return 0;

		const perfect = entry.correctScorelines || 0;
		return Math.round((perfect / predicted) * 100);
	}

	/**
	 * Calculate points per prediction average
	 */
	function calculatePointsPerPrediction(entry: LeaderboardEntry): number {
		const predicted = entry.predictedFixtures || 0;
		if (!predicted) return 0;

		const points = entry.totalPoints || 0;
		return Math.round((points / predicted) * 100) / 100; // Round to 2 decimal places
	}

	/**
	 * Get rank suffix (1st, 2nd, 3rd, etc.)
	 */
	function getRankSuffix(rank: number): string {
		const lastDigit = rank % 10;
		const lastTwoDigits = rank % 100;

		if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
			return `${rank}th`;
		}

		switch (lastDigit) {
			case 1:
				return `${rank}st`;
			case 2:
				return `${rank}nd`;
			case 3:
				return `${rank}rd`;
			default:
				return `${rank}th`;
		}
	}

	/**
	 * Determine performance tier based on success rate
	 */
	function getPerformanceTier(successRate: number): {
		tier: string;
		color: string;
		description: string;
	} {
		if (successRate >= 80) {
			return {
				tier: 'Elite',
				color: 'text-yellow-400',
				description: 'Exceptional predictor'
			};
		} else if (successRate >= 65) {
			return {
				tier: 'Expert',
				color: 'text-green-400',
				description: 'Strong predictor'
			};
		} else if (successRate >= 50) {
			return {
				tier: 'Skilled',
				color: 'text-blue-400',
				description: 'Above average'
			};
		} else if (successRate >= 35) {
			return {
				tier: 'Learning',
				color: 'text-orange-400',
				description: 'Room for improvement'
			};
		} else {
			return {
				tier: 'Beginner',
				color: 'text-slate-400',
				description: 'Just getting started'
			};
		}
	}

	return {
		calculateSuccessRate,
		calculateAccuracyRate,
		calculatePointsPerPrediction,
		getRankSuffix,
		getPerformanceTier
	};
}
