import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Resend } from 'resend';
import { RESEND_API_KEY } from '$env/static/private';

const resend = new Resend(RESEND_API_KEY);

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { emails } = await request.json();

		if (!emails || !Array.isArray(emails)) {
			return json({ error: 'Emails array is required' }, { status: 400 });
		}

		console.log(`🔬 [Batch Test] Testing multiple emails:`, emails);

		const results = [];

		for (const email of emails) {
			console.log(`\n📧 [Batch Test] Testing: ${email}`);

			try {
				const startTime = Date.now();

				const result = await resend.emails.send({
					from: 'Master League <onboarding@resend.dev>',
					to: email,
					subject: `Batch Test Email for ${email.split('@')[1]}`,
					html: `
						<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
							<h2 style="color: #4338ca;">Batch Test Email</h2>
							<p>This is a batch test email for domain analysis.</p>
							<p>Email: <strong>${email}</strong></p>
							<p>Domain: <strong>${email.split('@')[1]}</strong></p>
							<p>Timestamp: <strong>${new Date().toISOString()}</strong></p>
						</div>
					`,
					text: `Batch test email for ${email}. Domain: ${email.split('@')[1]}. Timestamp: ${new Date().toISOString()}`
				});

				const endTime = Date.now();
				const responseTime = endTime - startTime;

				console.log(`✅ [Batch Test] Success for ${email}:`, {
					emailId: result.data?.id,
					responseTime: `${responseTime}ms`,
					hasError: !!result.error,
					errorMessage: result.error?.message
				});

				results.push({
					email,
					domain: email.split('@')[1],
					success: true,
					emailId: result.data?.id,
					responseTime,
					hasEmailId: !!result.data?.id,
					fullResponse: result,
					error: null
				});
			} catch (error) {
				console.error(`❌ [Batch Test] Failed for ${email}:`, error);

				results.push({
					email,
					domain: email.split('@')[1],
					success: false,
					emailId: null,
					responseTime: null,
					hasEmailId: false,
					fullResponse: null,
					error: error instanceof Error ? error.message : String(error)
				});
			}

			// Small delay between requests to avoid rate limiting
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		// Analysis
		const analysis = {
			totalTested: results.length,
			successful: results.filter((r) => r.success).length,
			failed: results.filter((r) => !r.success).length,
			withEmailId: results.filter((r) => r.hasEmailId).length,
			withoutEmailId: results.filter((r) => r.success && !r.hasEmailId).length,
			domainAnalysis: {}
		};

		// Group by domain
		results.forEach((result) => {
			const domain = result.domain;
			if (!analysis.domainAnalysis[domain]) {
				analysis.domainAnalysis[domain] = {
					total: 0,
					successful: 0,
					withEmailId: 0,
					avgResponseTime: 0
				};
			}

			analysis.domainAnalysis[domain].total++;
			if (result.success) {
				analysis.domainAnalysis[domain].successful++;
				if (result.hasEmailId) {
					analysis.domainAnalysis[domain].withEmailId++;
				}
				if (result.responseTime) {
					analysis.domainAnalysis[domain].avgResponseTime =
						(analysis.domainAnalysis[domain].avgResponseTime + result.responseTime) / 2;
				}
			}
		});

		console.log(`\n📊 [Batch Test] Analysis:`, JSON.stringify(analysis, null, 2));

		return json({
			success: true,
			results,
			analysis
		});
	} catch (error) {
		console.error(`❌ [Batch Test] Batch test failed:`, error);

		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
