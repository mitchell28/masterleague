<script lang="ts">
	import {
		Html,
		Head,
		Body,
		Preview,
		Container,
		Section,
		Text,
		Button,
		Row,
		Column,
		Hr,
		Link
	} from 'better-svelte-email';

	interface Props {
		userName: string;
		week: number;
		missingCount: number;
		totalFixtures: number;
		firstKickoff: string;
		fixtures?: Array<{
			homeTeam: string;
			awayTeam: string;
			matchDate: string;
		}>;
	}

	let {
		userName = 'Player',
		week = 1,
		missingCount = 0,
		totalFixtures = 10,
		firstKickoff = '',
		fixtures = []
	}: Props = $props();

	let previewText = $derived(`${missingCount} predictions needed for Week ${week} - Master League`);
	let predictionsUrl = $derived(`https://masterleague.app/predictions/${week}`);
	const unsubscribeUrl = 'https://masterleague.app/settings';

	// Site colors - Master League green
	const accent = '#30FF9A';
	const bgDark = '#090e1e';
	const bgCard = '#0f172a';
	const bgCardLight = '#1e293b';
	const textMuted = '#94a3b8';
</script>

<Html lang="en">
	<Head>
		<title>Week {week} Prediction Reminder</title>
		{@html `<link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />`}
	</Head>
	<Body
		style="background-color: {bgDark}; font-family: 'Work Sans', Arial, sans-serif; margin: 0; padding: 0;"
	>
		<Preview preview={previewText} />
		<Container style="max-width: 580px; margin: 0 auto; padding: 32px 16px;">
			<!-- Header with angular clip-path effect using borders -->
			<Section
				style="background-color: {bgCard}; padding: 32px; text-align: center; border-left: 4px solid {accent};"
			>
				<Text
					style="margin: 0; font-size: 28px; font-weight: 700; color: {accent}; letter-spacing: 0.02em; text-transform: uppercase;"
				>
					Master League
				</Text>
				<Text
					style="margin: 8px 0 0 0; font-size: 14px; color: {textMuted}; text-transform: uppercase; letter-spacing: 0.1em;"
				>
					Week {week} Prediction Reminder
				</Text>
			</Section>

			<!-- Main Content -->
			<Section style="background-color: {bgCardLight}; padding: 32px;">
				<Text style="font-size: 18px; color: #ffffff; margin: 0 0 16px 0;">
					Hey {userName},
				</Text>

				<Text style="font-size: 15px; color: #cbd5e1; margin: 0 0 24px 0; line-height: 1.6;">
					You have <strong style="color: {accent};">{missingCount}</strong> predictions left to make
					for Week {week}.
				</Text>

				{#if firstKickoff}
					<Section
						style="background-color: {bgCard}; padding: 16px; margin: 0 0 24px 0; border-left: 3px solid {accent};"
					>
						<Text
							style="margin: 0; font-size: 12px; color: {textMuted}; text-transform: uppercase; letter-spacing: 0.05em;"
						>
							First Kickoff
						</Text>
						<Text style="margin: 4px 0 0 0; font-size: 15px; font-weight: 600; color: #ffffff;">
							{firstKickoff}
						</Text>
					</Section>
				{/if}

				<!-- Progress indicator -->
				<Section style="margin: 0 0 24px 0;">
					<Text
						style="margin: 0 0 8px 0; font-size: 12px; color: {textMuted}; text-transform: uppercase; letter-spacing: 0.05em;"
					>
						Your Progress
					</Text>
					<Text style="margin: 0; font-size: 14px; color: #cbd5e1;">
						{totalFixtures - missingCount} of {totalFixtures} predictions made
					</Text>
					<Text style="margin: 4px 0 0 0; font-size: 14px; color: {accent}; font-weight: 600;">
						{missingCount} remaining
					</Text>
				</Section>

				<!-- Sample fixtures if provided -->
				{#if fixtures.length > 0}
					<Text
						style="margin: 0 0 12px 0; font-size: 12px; font-weight: 600; color: {textMuted}; text-transform: uppercase; letter-spacing: 0.05em;"
					>
						Upcoming Matches
					</Text>
					{#each fixtures.slice(0, 3) as fixture}
						<Section style="background-color: {bgCard}; padding: 12px 16px; margin: 0 0 8px 0;">
							<Text style="margin: 0; font-size: 14px; color: #ffffff; font-weight: 500;">
								{fixture.homeTeam} vs {fixture.awayTeam}
							</Text>
							<Text style="margin: 4px 0 0 0; font-size: 12px; color: {textMuted};">
								{fixture.matchDate}
							</Text>
						</Section>
					{/each}
				{/if}

				<!-- CTA Button -->
				<Section style="margin: 32px 0 0 0; text-align: center;">
					<Button
						href={predictionsUrl}
						style="background-color: {accent}; color: #000000; font-family: 'Work Sans', Arial, sans-serif; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; display: inline-block; text-transform: uppercase; letter-spacing: 0.05em;"
					>
						Make Your Predictions
					</Button>
				</Section>
			</Section>

			<!-- Points reminder -->
			<Section style="background-color: {bgCard}; padding: 24px;">
				<Hr style="border: none; border-top: 1px solid #334155; margin: 0 0 20px 0;" />
				<Row>
					<Column style="text-align: center; width: 33%;">
						<Text style="margin: 0; font-size: 24px; font-weight: 700; color: {accent};">3</Text>
						<Text
							style="margin: 4px 0 0 0; font-size: 11px; color: {textMuted}; text-transform: uppercase; letter-spacing: 0.05em;"
						>
							Exact Score
						</Text>
					</Column>
					<Column style="text-align: center; width: 33%;">
						<Text style="margin: 0; font-size: 24px; font-weight: 700; color: #facc15;">1</Text>
						<Text
							style="margin: 4px 0 0 0; font-size: 11px; color: {textMuted}; text-transform: uppercase; letter-spacing: 0.05em;"
						>
							Correct Outcome
						</Text>
					</Column>
					<Column style="text-align: center; width: 33%;">
						<Text style="margin: 0; font-size: 24px; font-weight: 700; color: #a78bfa;">2-5x</Text>
						<Text
							style="margin: 4px 0 0 0; font-size: 11px; color: {textMuted}; text-transform: uppercase; letter-spacing: 0.05em;"
						>
							Multipliers
						</Text>
					</Column>
				</Row>
			</Section>

			<!-- Footer -->
			<Section
				style="background-color: {bgCard}; padding: 24px; text-align: center; border-top: 1px solid #1e293b;"
			>
				<Text style="margin: 0; font-size: 11px; color: #64748b;">
					You're receiving this because you have email reminders enabled.
				</Text>
				<Text style="margin: 12px 0 0 0; font-size: 11px; color: #64748b;">
					<Link href={unsubscribeUrl} style="color: {textMuted}; text-decoration: underline;"
						>Manage preferences</Link
					>
					<span style="color: #475569;"> | </span>
					<Link
						href="https://masterleague.app"
						style="color: {textMuted}; text-decoration: underline;">masterleague.app</Link
					>
				</Text>
			</Section>
		</Container>
	</Body>
</Html>
