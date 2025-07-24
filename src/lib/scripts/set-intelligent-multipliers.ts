import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { fixtures, teams } from '../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

// Load environment variables from .env file
dotenv.config();

// Set up database connection
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
const sql = neon(DATABASE_URL);
const db = drizzle(sql);

// Premier League rivalry/derby matches - teams that should have 3x multiplier when they play each other
const DERBY_MATCHES = [
	// London derbies
	['ars', 'che'],
	['ars', 'tot'],
	['ars', 'whu'],
	['ars', 'cry'],
	['ars', 'ful'],
	['ars', 'bre'],
	['che', 'tot'],
	['che', 'whu'],
	['che', 'cry'],
	['che', 'ful'],
	['che', 'bre'],
	['tot', 'whu'],
	['tot', 'cry'],
	['tot', 'ful'],
	['tot', 'bre'],
	['whu', 'cry'],
	['whu', 'ful'],
	['whu', 'bre'],
	['cry', 'ful'],
	['cry', 'bre'],
	['ful', 'bre'],

	// Manchester derby
	['mci', 'mun'],

	// Merseyside derby
	['liv', 'eve'],

	// North London derby
	['ars', 'tot'],

	// Birmingham derby (if Villa and another Birmingham team)
	// ['avl', 'bir'], // No Birmingham teams in current PL

	// Big 6 rivalries
	['ars', 'mun'],
	['ars', 'mci'],
	['ars', 'liv'],
	['che', 'mun'],
	['che', 'mci'],
	['che', 'liv'],
	['tot', 'mun'],
	['tot', 'mci'],
	['tot', 'liv'],
	['mun', 'liv'],
	['mci', 'liv']
];

// Top 6 teams that usually create exciting matches (2x multiplier)
const TOP_TEAMS = ['ars', 'che', 'tot', 'mci', 'mun', 'liv'];

function isDerbyMatch(homeTeamId: string, awayTeamId: string): boolean {
	return DERBY_MATCHES.some(
		(derby) =>
			(derby[0] === homeTeamId && derby[1] === awayTeamId) ||
			(derby[0] === awayTeamId && derby[1] === homeTeamId)
	);
}

function isExcitingMatch(homeTeamId: string, awayTeamId: string): boolean {
	// Match involving at least one top 6 team
	return TOP_TEAMS.includes(homeTeamId) || TOP_TEAMS.includes(awayTeamId);
}

// Helper function to randomly select from an array
function getRandomSelection<T>(array: T[]): T | null {
	if (array.length === 0) return null;
	const randomIndex = Math.floor(Math.random() * array.length);
	return array[randomIndex];
}

async function setIntelligentMultipliersForWeek(weekId: number, season = '2025-26'): Promise<void> {
	console.log(
		`🎯 Setting intelligent multipliers for week ${weekId} (${season}) based on rivalry rules...`
	);

	// Get all fixtures for the week and season
	const weekFixtures = await db
		.select()
		.from(fixtures)
		.where(and(eq(fixtures.weekId, weekId), eq(fixtures.season, season)));

	if (weekFixtures.length === 0) {
		console.log(`No fixtures found for week ${weekId} in season ${season}`);
		return;
	}

	console.log(`📊 Found ${weekFixtures.length} fixtures for week ${weekId} (${season})`);

	// Categorize fixtures
	const derbyMatches = weekFixtures.filter((fixture) =>
		isDerbyMatch(fixture.homeTeamId, fixture.awayTeamId)
	);

	const excitingMatches = weekFixtures.filter(
		(fixture) =>
			!isDerbyMatch(fixture.homeTeamId, fixture.awayTeamId) &&
			isExcitingMatch(fixture.homeTeamId, fixture.awayTeamId)
	);

	const standardMatches = weekFixtures.filter(
		(fixture) =>
			!isDerbyMatch(fixture.homeTeamId, fixture.awayTeamId) &&
			!isExcitingMatch(fixture.homeTeamId, fixture.awayTeamId)
	);

	console.log(`🔥 Derby matches found: ${derbyMatches.length}`);
	console.log(`⚡ Exciting matches found: ${excitingMatches.length}`);
	console.log(`📋 Standard matches found: ${standardMatches.length}`);

	// Reset all fixtures to 1x multiplier first
	for (const fixture of weekFixtures) {
		await db.update(fixtures).set({ pointsMultiplier: 1 }).where(eq(fixtures.id, fixture.id));
	}

	// Assign 1 triple points (3x) to the best derby match
	if (derbyMatches.length > 0) {
		const selectedDerby = derbyMatches[0]; // Take first derby match
		await db.update(fixtures).set({ pointsMultiplier: 3 }).where(eq(fixtures.id, selectedDerby.id));

		console.log(
			`🏆 Triple Points (3x): ${selectedDerby.homeTeamId} vs ${selectedDerby.awayTeamId}`
		);
	}

	// Assign 1 double points (2x) to the best exciting match (not already a derby)
	if (excitingMatches.length > 0) {
		const selectedExciting = excitingMatches[0]; // Take first exciting match
		await db
			.update(fixtures)
			.set({ pointsMultiplier: 2 })
			.where(eq(fixtures.id, selectedExciting.id));

		console.log(
			`⚡ Double Points (2x): ${selectedExciting.homeTeamId} vs ${selectedExciting.awayTeamId}`
		);
	}

	console.log(`✅ Multipliers set according to rivalry rules!`);

	// Show summary
	const finalCount = {
		triple: derbyMatches.length > 0 ? 1 : 0,
		double: excitingMatches.length > 0 ? 1 : 0,
		standard:
			weekFixtures.length - (derbyMatches.length > 0 ? 1 : 0) - (excitingMatches.length > 0 ? 1 : 0)
	};

	console.log(`\n📊 Final multiplier distribution:`);
	console.log(`   3x points: ${finalCount.triple} fixture(s)`);
	console.log(`   2x points: ${finalCount.double} fixture(s)`);
	console.log(`   1x points: ${finalCount.standard} fixture(s)`);
}

async function setMultipliersForAllWeeks() {
	try {
		const season = '2025-26';
		console.log(`🚀 Setting intelligent multipliers for all 38 weeks of the ${season} season...\n`);

		const weeklyStats: Array<{
			week: number;
			derbyCount: number;
			excitingCount: number;
			standardCount: number;
			selectedDerby: string | null;
			selectedExciting: string | null;
		}> = [];
		let totalDerbyCount = 0;
		let totalExcitingCount = 0;
		let weeksWithoutDerby = 0;
		let weeksWithoutExciting = 0;

		// Process all 38 weeks
		for (let week = 1; week <= 38; week++) {
			console.log(`\n--- Week ${week} ---`);

			// Get all fixtures for the week and season
			const weekFixtures = await db
				.select()
				.from(fixtures)
				.where(and(eq(fixtures.weekId, week), eq(fixtures.season, season)));

			if (weekFixtures.length === 0) {
				console.log(`No fixtures found for week ${week}`);
				continue;
			}

			// Categorize fixtures
			const derbyMatches = weekFixtures.filter((fixture) =>
				isDerbyMatch(fixture.homeTeamId, fixture.awayTeamId)
			);

			const excitingMatches = weekFixtures.filter(
				(fixture) =>
					!isDerbyMatch(fixture.homeTeamId, fixture.awayTeamId) &&
					isExcitingMatch(fixture.homeTeamId, fixture.awayTeamId)
			);

			// Reset all fixtures to 1x multiplier first
			for (const fixture of weekFixtures) {
				await db.update(fixtures).set({ pointsMultiplier: 1 }).where(eq(fixtures.id, fixture.id));
			}

			let selectedDerby: any = null;
			let selectedExciting: any = null;

			// Assign 1 triple points (3x) to a derby match (random selection)
			if (derbyMatches.length > 0) {
				selectedDerby = getRandomSelection(derbyMatches);
				if (selectedDerby) {
					await db
						.update(fixtures)
						.set({ pointsMultiplier: 3 })
						.where(eq(fixtures.id, selectedDerby.id));
					totalDerbyCount++;
				}
			} else {
				// No derby matches - randomly pick any match for triple points
				const allFixtures = weekFixtures.filter((f) => f !== selectedExciting); // Don't pick the same match twice
				selectedDerby = getRandomSelection(allFixtures);
				if (selectedDerby) {
					await db
						.update(fixtures)
						.set({ pointsMultiplier: 3 })
						.where(eq(fixtures.id, selectedDerby.id));
					totalDerbyCount++;
					console.log(`🎲 No derby available - random Triple Points selection`);
				}
				weeksWithoutDerby++;
			}

			// Assign 1 double points (2x) to an exciting match (random selection, not already a derby)
			const availableExcitingMatches = excitingMatches.filter((f) => f.id !== selectedDerby?.id);
			if (availableExcitingMatches.length > 0) {
				selectedExciting = getRandomSelection(availableExcitingMatches);
				if (selectedExciting) {
					await db
						.update(fixtures)
						.set({ pointsMultiplier: 2 })
						.where(eq(fixtures.id, selectedExciting.id));
					totalExcitingCount++;
				}
			} else {
				// No exciting matches - randomly pick from remaining matches
				const remainingFixtures = weekFixtures.filter((f) => f.id !== selectedDerby?.id);
				selectedExciting = getRandomSelection(remainingFixtures);
				if (selectedExciting) {
					await db
						.update(fixtures)
						.set({ pointsMultiplier: 2 })
						.where(eq(fixtures.id, selectedExciting.id));
					totalExcitingCount++;
					console.log(`🎲 No exciting match available - random Double Points selection`);
				} else {
					weeksWithoutExciting++;
				}
			}

			// Show the selected matches for this week
			if (selectedDerby) {
				console.log(
					`🏆 Triple Points (3x): ${selectedDerby.homeTeamId} vs ${selectedDerby.awayTeamId}`
				);
			}
			if (selectedExciting) {
				console.log(
					`⚡ Double Points (2x): ${selectedExciting.homeTeamId} vs ${selectedExciting.awayTeamId}`
				);
			}
			if (!selectedDerby && !selectedExciting) {
				console.log(`📋 No special matches this week - all standard points`);
			}

			// Store stats for this week
			weeklyStats.push({
				week,
				derbyCount: derbyMatches.length,
				excitingCount: excitingMatches.length,
				standardCount: weekFixtures.length,
				selectedDerby: selectedDerby
					? `${selectedDerby.homeTeamId} vs ${selectedDerby.awayTeamId}`
					: null,
				selectedExciting: selectedExciting
					? `${selectedExciting.homeTeamId} vs ${selectedExciting.awayTeamId}`
					: null
			});
		}

		// Show comprehensive season summary
		console.log('\n🏆 SEASON SUMMARY - INTELLIGENT MULTIPLIER SYSTEM');
		console.log('==================================================');
		console.log(`📊 Total weeks processed: ${weeklyStats.length}`);
		console.log(
			`🔥 Weeks with Triple Points (Derby): ${totalDerbyCount}/38 (${((totalDerbyCount / 38) * 100).toFixed(1)}%)`
		);
		console.log(
			`⚡ Weeks with Double Points (Exciting): ${totalExcitingCount}/38 (${((totalExcitingCount / 38) * 100).toFixed(1)}%)`
		);
		console.log(`🏃 Weeks without Derby matches: ${weeksWithoutDerby}`);
		console.log(`😴 Weeks without Exciting matches: ${weeksWithoutExciting}`);

		// Show variety analysis
		const derbyTeams = new Set();
		const excitingTeams = new Set();

		weeklyStats.forEach((week) => {
			if (week.selectedDerby) {
				const teams = week.selectedDerby.split(' vs ');
				derbyTeams.add(teams[0]);
				derbyTeams.add(teams[1]);
			}
			if (week.selectedExciting) {
				const teams = week.selectedExciting.split(' vs ');
				excitingTeams.add(teams[0]);
				excitingTeams.add(teams[1]);
			}
		});

		console.log(`\n🎭 VARIETY ANALYSIS:`);
		console.log(`🏆 Teams involved in Triple Point matches: ${derbyTeams.size} different teams`);
		console.log(`⚡ Teams involved in Double Point matches: ${excitingTeams.size} different teams`);

		// Show sample weeks
		console.log(`\n📋 SAMPLE WEEKS:`);
		[1, 10, 20, 30, 38].forEach((weekNum) => {
			const week = weeklyStats.find((w) => w.week === weekNum);
			if (week) {
				console.log(
					`Week ${weekNum}: ${week.selectedDerby ? '🏆 ' + week.selectedDerby : ''} ${week.selectedExciting ? '⚡ ' + week.selectedExciting : ''}`
				);
			}
		});
	} catch (error) {
		console.error('❌ Error setting multipliers:', error);
		process.exit(1);
	}
}

setMultipliersForAllWeeks().catch(console.error);
