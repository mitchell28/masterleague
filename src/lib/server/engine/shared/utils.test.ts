import { describe, it, expect } from 'vitest';
import { calculatePredictionPoints, getMatchOutcome } from './utils';

describe('calculatePredictionPoints', () => {
	// ---- Exact score (3 pts) ----
	describe('exact score prediction', () => {
		it('returns 3 for an exact score match', () => {
			expect(calculatePredictionPoints(2, 1, 2, 1)).toBe(3);
		});

		it('returns 3 for a 0-0 exact draw', () => {
			expect(calculatePredictionPoints(0, 0, 0, 0)).toBe(3);
		});

		it('returns 3 × multiplier (2×) for exact score', () => {
			expect(calculatePredictionPoints(1, 0, 1, 0, 2)).toBe(6);
		});

		it('returns 3 × multiplier (3×) for exact score', () => {
			expect(calculatePredictionPoints(3, 2, 3, 2, 3)).toBe(9);
		});
	});

	// ---- Correct outcome only (1 pt) ----
	describe('correct outcome only', () => {
		it('returns 1 for correct home win but wrong score', () => {
			expect(calculatePredictionPoints(2, 0, 3, 1)).toBe(1);
		});

		it('returns 1 for correct away win but wrong score', () => {
			expect(calculatePredictionPoints(0, 1, 0, 2)).toBe(1);
		});

		it('returns 1 for correct draw but wrong score', () => {
			expect(calculatePredictionPoints(1, 1, 2, 2)).toBe(1);
		});

		it('returns 1 × multiplier (2×) for correct outcome', () => {
			expect(calculatePredictionPoints(2, 0, 3, 1, 2)).toBe(2);
		});

		it('returns 1 × multiplier (3×) for correct outcome', () => {
			expect(calculatePredictionPoints(0, 1, 0, 3, 3)).toBe(3);
		});
	});

	// ---- Wrong prediction (0 pts) ----
	describe('wrong prediction', () => {
		it('returns 0 when home win predicted but draw occurs', () => {
			expect(calculatePredictionPoints(2, 0, 1, 1)).toBe(0);
		});

		it('returns 0 when draw predicted but home win occurs', () => {
			expect(calculatePredictionPoints(1, 1, 2, 0)).toBe(0);
		});

		it('returns 0 when away win predicted but home win occurs', () => {
			expect(calculatePredictionPoints(0, 2, 1, 0)).toBe(0);
		});

		it('returns 0 even with a multiplier when outcome is wrong', () => {
			expect(calculatePredictionPoints(0, 1, 1, 0, 3)).toBe(0);
		});
	});

	// ---- Null / unfinished fixtures ----
	describe('unfinished match (null scores)', () => {
		it('returns 0 when actual home score is null', () => {
			expect(calculatePredictionPoints(2, 1, null, 1)).toBe(0);
		});

		it('returns 0 when actual away score is null', () => {
			expect(calculatePredictionPoints(2, 1, 2, null)).toBe(0);
		});

		it('returns 0 when both actual scores are null', () => {
			expect(calculatePredictionPoints(2, 1, null, null)).toBe(0);
		});
	});

	// ---- Default multiplier = 1 ----
	it('defaults to multiplier 1 when not provided', () => {
		expect(calculatePredictionPoints(1, 0, 1, 0)).toBe(3);
		expect(calculatePredictionPoints(1, 0, 2, 0)).toBe(1);
		expect(calculatePredictionPoints(0, 1, 1, 0)).toBe(0);
	});
});

describe('getMatchOutcome', () => {
	it('returns "home" when home score is higher', () => {
		expect(getMatchOutcome(2, 0)).toBe('home');
	});

	it('returns "away" when away score is higher', () => {
		expect(getMatchOutcome(1, 3)).toBe('away');
	});

	it('returns "draw" when scores are equal', () => {
		expect(getMatchOutcome(1, 1)).toBe('draw');
	});

	it('returns null when either score is null', () => {
		expect(getMatchOutcome(null, 2)).toBeNull();
		expect(getMatchOutcome(2, null)).toBeNull();
		expect(getMatchOutcome(null, null)).toBeNull();
	});
});
