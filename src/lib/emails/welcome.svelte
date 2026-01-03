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
	}

	let { userName = 'Player' }: Props = $props();

	const previewText = `Welcome to Master League - Start making predictions now`;
	const predictionsUrl = 'https://masterleague.app/predictions';
	const leaderboardUrl = 'https://masterleague.app/leaderboard';

	// Site colors - Master League green
	const accent = '#30FF9A';
	const bgDark = '#090e1e';
	const bgCard = '#0f172a';
	const bgCardLight = '#1e293b';
	const textMuted = '#94a3b8';
</script>

<Html lang="en">
	<Head>
		<title>Welcome to Master League</title>
		{@html `<link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />`}
	</Head>
	<Body
		style="background-color: {bgDark}; font-family: 'Work Sans', Arial, sans-serif; margin: 0; padding: 0;"
	>
		<Preview preview={previewText} />
		<Container style="max-width: 580px; margin: 0 auto; padding: 32px 16px;">
			<!-- Header with angular accent border -->
			<Section
				style="background-color: {bgCard}; padding: 40px 32px; text-align: center; border-left: 4px solid {accent};"
			>
				<Text
					style="margin: 0; font-size: 32px; font-weight: 700; color: {accent}; letter-spacing: 0.02em; text-transform: uppercase;"
				>
					Welcome to
				</Text>
				<Text
					style="margin: 8px 0 0 0; font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: 0.02em; text-transform: uppercase;"
				>
					Master League
				</Text>
			</Section>

			<!-- Main Content -->
			<Section style="background-color: {bgCardLight}; padding: 32px;">
				<Text style="font-size: 18px; color: #ffffff; margin: 0 0 16px 0;">
					Hey {userName},
				</Text>

				<Text style="font-size: 15px; color: #cbd5e1; margin: 0 0 32px 0; line-height: 1.6;">
					You're all set to start predicting Premier League matches. Compete against friends and
					climb the leaderboards.
				</Text>

				<!-- How it works -->
				<Section
					style="background-color: {bgCard}; padding: 24px; margin: 0 0 32px 0; border-left: 3px solid {accent};"
				>
					<Text
						style="margin: 0 0 20px 0; font-size: 14px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.05em;"
					>
						How It Works
					</Text>

					<Row style="margin-bottom: 16px;">
						<Column style="width: 32px; vertical-align: top;">
							<Text style="margin: 0; font-size: 14px; font-weight: 700; color: {accent};">01</Text>
						</Column>
						<Column style="vertical-align: top;">
							<Text style="margin: 0; font-size: 14px; color: #cbd5e1;">
								<strong style="color: #ffffff;">Make predictions</strong> - Pick the score for each match
								before kickoff
							</Text>
						</Column>
					</Row>

					<Row style="margin-bottom: 16px;">
						<Column style="width: 32px; vertical-align: top;">
							<Text style="margin: 0; font-size: 14px; font-weight: 700; color: {accent};">02</Text>
						</Column>
						<Column style="vertical-align: top;">
							<Text style="margin: 0; font-size: 14px; color: #cbd5e1;">
								<strong style="color: #ffffff;">Earn points</strong> - 3 for exact score, 1 for correct
								outcome
							</Text>
						</Column>
					</Row>

					<Row>
						<Column style="width: 32px; vertical-align: top;">
							<Text style="margin: 0; font-size: 14px; font-weight: 700; color: {accent};">03</Text>
						</Column>
						<Column style="vertical-align: top;">
							<Text style="margin: 0; font-size: 14px; color: #cbd5e1;">
								<strong style="color: #ffffff;">Climb the leaderboard</strong> - Compete with others
								throughout the season
							</Text>
						</Column>
					</Row>
				</Section>

				<!-- Points system -->
				<Hr style="border: none; border-top: 1px solid #334155; margin: 0 0 24px 0;" />
				<Text
					style="margin: 0 0 16px 0; text-align: center; font-size: 11px; font-weight: 600; color: {textMuted}; text-transform: uppercase; letter-spacing: 0.1em;"
				>
					Points System
				</Text>
				<Row>
					<Column style="text-align: center; width: 33%;">
						<Text style="margin: 0; font-size: 28px; font-weight: 700; color: {accent};">3</Text>
						<Text
							style="margin: 4px 0 0 0; font-size: 11px; color: {textMuted}; text-transform: uppercase; letter-spacing: 0.05em;"
						>
							Exact Score
						</Text>
					</Column>
					<Column style="text-align: center; width: 33%;">
						<Text style="margin: 0; font-size: 28px; font-weight: 700; color: #facc15;">1</Text>
						<Text
							style="margin: 4px 0 0 0; font-size: 11px; color: {textMuted}; text-transform: uppercase; letter-spacing: 0.05em;"
						>
							Correct Outcome
						</Text>
					</Column>
					<Column style="text-align: center; width: 33%;">
						<Text style="margin: 0; font-size: 28px; font-weight: 700; color: #a78bfa;">2-3x</Text>
						<Text
							style="margin: 4px 0 0 0; font-size: 11px; color: {textMuted}; text-transform: uppercase; letter-spacing: 0.05em;"
						>
							Multipliers
						</Text>
					</Column>
				</Row>
				<Hr style="border: none; border-top: 1px solid #334155; margin: 24px 0 0 0;" />

				<!-- CTA Buttons -->
				<Section style="margin: 32px 0 0 0; text-align: center;">
					<Button
						href={predictionsUrl}
						style="background-color: {accent}; color: #000000; font-family: 'Work Sans', Arial, sans-serif; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; display: inline-block; text-transform: uppercase; letter-spacing: 0.05em;"
					>
						Start Predicting
					</Button>
				</Section>

				<Section style="margin: 16px 0 0 0; text-align: center;">
					<Link
						href={leaderboardUrl}
						style="font-size: 13px; color: {textMuted}; text-decoration: underline;"
					>
						View the leaderboard
					</Link>
				</Section>
			</Section>

			<!-- Footer -->
			<Section
				style="background-color: {bgCard}; padding: 24px; text-align: center; border-top: 1px solid #1e293b;"
			>
				<Text style="margin: 0; font-size: 13px; color: {textMuted};">
					Good luck this season. May your predictions be accurate.
				</Text>
				<Text style="margin: 16px 0 0 0; font-size: 11px; color: #64748b;">
					<Link
						href="https://masterleague.app"
						style="color: {textMuted}; text-decoration: underline;"
					>
						masterleague.app
					</Link>
				</Text>
			</Section>
		</Container>
	</Body>
</Html>
