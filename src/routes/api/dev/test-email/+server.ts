import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Resend } from 'resend';
import { RESEND_API_KEY } from '$env/static/private';

const resend = new Resend(RESEND_API_KEY);

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { email } = await request.json();

		if (!email) {
			return json({ error: 'Email is required' }, { status: 400 });
		}

		console.log(`🧪 [Test] Testing email send to: ${email}`);

		// Log request headers for debugging IP detection issues
		const forwarded = request.headers.get('x-forwarded-for');
		const realIP = request.headers.get('x-real-ip');
		const cfConnectingIP = request.headers.get('cf-connecting-ip');
		const userAgent = request.headers.get('user-agent');

		console.log(`🔍 [Test] Request headers:`, {
			'x-forwarded-for': forwarded,
			'x-real-ip': realIP,
			'cf-connecting-ip': cfConnectingIP,
			'user-agent': userAgent?.substring(0, 50)
		});

		// Test sending a basic email
		const result = await resend.emails.send({
			from: 'Master League <noreply@mail.masterleague.app',
			to: email,
			subject: 'Test Email from Master League',
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<h2 style="color: #4338ca;">Test Email</h2>
					<p>This is a test email to verify Resend functionality.</p>
					<p>Email domain: <strong>${email.split('@')[1]}</strong></p>
					<p>If you received this, email delivery is working!</p>
				</div>
			`,
			text: `Test email from Master League. Email domain: ${email.split('@')[1]}. If you received this, email delivery is working!`
		});

		console.log(`✅ [Test] Test email sent successfully to ${email}`);
		console.log(`✅ [Test] Full Resend result:`, JSON.stringify(result, null, 2));
		console.log(`✅ [Test] Resend Email ID:`, result.data?.id);

		// Check for Resend API errors
		if (result.error) {
			const errorObj = result.error as any;
			if (errorObj.statusCode === 403 && errorObj.error?.includes('testing emails')) {
				console.error(`🚫 [Test] RESEND TESTING RESTRICTION detected`);
				return json(
					{
						success: false,
						error: 'Resend Testing Restriction',
						message: `Can only send to verified email addresses. ${email} is not verified.`,
						solution:
							'Verify a domain at resend.com/domains or use billymitchell287@gmail.com for testing',
						domain: email.split('@')[1],
						isTestingRestriction: true
					},
					{ status: 403 }
				);
			}
		}

		return json({
			success: true,
			message: `Test email sent to ${email}`,
			emailId: result.data?.id,
			domain: email.split('@')[1],
			fullResult: result,
			hasEmailId: !!result.data?.id
		});
	} catch (error) {
		console.error(`❌ [Test] Failed to send test email:`, error);

		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				details: typeof error === 'object' ? JSON.stringify(error, null, 2) : String(error)
			},
			{ status: 500 }
		);
	}
};
