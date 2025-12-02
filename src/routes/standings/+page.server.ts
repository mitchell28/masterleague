import type { PageServerLoad } from './$types';
import { getFootballApiKey } from '$lib/server/utils/env';

const FOOTBALL_DATA_API_KEY = getFootballApiKey();

interface ApiTeam {
	id: number;
	name: string;
	shortName: string;
	tla: string;
	crest: string;
}

interface ApiStandingEntry {
	position: number;
	team: ApiTeam;
	playedGames: number;
	form: string | null;
	won: number;
	draw: number;
	lost: number;
	points: number;
	goalsFor: number;
	goalsAgainst: number;
	goalDifference: number;
}

interface ApiStandingsResponse {
	competition: {
		name: string;
		emblem: string;
	};
	season: {
		id: number;
		startDate: string;
		endDate: string;
		currentMatchday: number;
	};
	standings: Array<{
		stage: string;
		type: string;
		table: ApiStandingEntry[];
	}>;
}

export interface StandingsEntry {
	position: number;
	team: {
		id: number;
		name: string;
		shortName: string;
		tla: string;
		crest: string;
	};
	played: number;
	won: number;
	draw: number;
	lost: number;
	goalsFor: number;
	goalsAgainst: number;
	goalDifference: number;
	points: number;
	form: string[];
}

// Cache for standings data (2 minute TTL)
let standingsCache: {
	data: StandingsEntry[] | null;
	matchday: number | null;
	timestamp: number;
} = {
	data: null,
	matchday: null,
	timestamp: 0
};

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export const load: PageServerLoad = async () => {
	const now = Date.now();

	// Return cached data if still valid
	if (standingsCache.data && now - standingsCache.timestamp < CACHE_TTL) {
		return {
			standings: standingsCache.data,
			matchday: standingsCache.matchday,
			lastUpdated: new Date(standingsCache.timestamp).toISOString(),
			pageMetaTags: {
				title: 'Premier League Table | Master League',
				description:
					'View the current Premier League standings table with live positions, points, goal difference and recent form.'
			}
		};
	}

	try {
		if (!FOOTBALL_DATA_API_KEY) {
			throw new Error('FOOTBALL_DATA_API_KEY not configured');
		}

		const response = await fetch('https://api.football-data.org/v4/competitions/PL/standings', {
			headers: {
				'X-Auth-Token': FOOTBALL_DATA_API_KEY
			}
		});

		if (!response.ok) {
			throw new Error(`API request failed: ${response.status}`);
		}

		const data: ApiStandingsResponse = await response.json();

		// Get the TOTAL standings (not home/away specific)
		const totalStandings = data.standings.find((s) => s.type === 'TOTAL');

		if (!totalStandings) {
			throw new Error('No standings data found');
		}

		// Transform to our format
		const standings: StandingsEntry[] = totalStandings.table.map((entry) => ({
			position: entry.position,
			team: {
				id: entry.team.id,
				name: entry.team.name,
				shortName: entry.team.shortName,
				tla: entry.team.tla,
				crest: entry.team.crest
			},
			played: entry.playedGames,
			won: entry.won,
			draw: entry.draw,
			lost: entry.lost,
			goalsFor: entry.goalsFor,
			goalsAgainst: entry.goalsAgainst,
			goalDifference: entry.goalDifference,
			points: entry.points,
			form: entry.form ? entry.form.split(',').map((f) => f.trim()) : []
		}));

		// Update cache
		standingsCache = {
			data: standings,
			matchday: data.season.currentMatchday,
			timestamp: now
		};

		return {
			standings,
			matchday: data.season.currentMatchday,
			lastUpdated: new Date(now).toISOString(),
			pageMetaTags: {
				title: 'Premier League Table | Master League',
				description:
					'View the current Premier League standings table with live positions, points, goal difference and recent form.'
			}
		};
	} catch (error) {
		console.error('Error fetching standings:', error);

		// Return cached data if available, even if expired
		if (standingsCache.data) {
			return {
				standings: standingsCache.data,
				matchday: standingsCache.matchday,
				lastUpdated: new Date(standingsCache.timestamp).toISOString(),
				error: 'Using cached data - API temporarily unavailable',
				pageMetaTags: {
					title: 'Premier League Table | Master League',
					description:
						'View the current Premier League standings table with live positions, points, goal difference and recent form.'
				}
			};
		}

		// Return empty state if no cache
		return {
			standings: [] as StandingsEntry[],
			matchday: null,
			lastUpdated: null,
			error: 'Unable to load standings data',
			pageMetaTags: {
				title: 'Premier League Table | Master League',
				description:
					'View the current Premier League standings table with live positions, points, goal difference and recent form.'
			}
		};
	}
};
