# OTP Email Debugging Guide

## Issue

OTP login with email only works with @gmail.com addresses and fails with other email providers.

## Changes Made

### 1. Enhanced Server-Side Logging (`src/lib/server/db/auth/auth.ts`)

- Added comprehensive logging for OTP email sending process
- Logs email domain to identify patterns
- Logs detailed error information including Resend API responses
- Added email domain classification (common vs uncommon domains)
- Fixed email sender to use Resend's default domain (`onboarding@resend.dev`)
- **NEW**: Added custom IP detection for rate limiting
- **NEW**: Enhanced Resend API response logging

### 2. Enhanced Client-Side Logging (`src/routes/auth/otp/+page.svelte`)

- Added detailed logging for OTP request and verification
- Logs email address and OTP attempts
- Enhanced error handling and reporting

### 3. Enhanced Auth Client Error Handling (`src/lib/client/auth-client.ts`)

- Added comprehensive error logging for all auth requests
- Enhanced rate limiting detection
- Added response body logging for failed requests

### 4. Updated Rate Limiting Configuration

- Increased OTP request limits from 3 to 5 per minute
- Increased OTP verification attempts from 5 to 8 per minute
- Added rate limiting event logging
- **NEW**: Added custom IP detection with fallback

### 5. Email Testing Tools

- Created `/dev/test-email` page for testing email delivery
- Created `/api/dev/test-email` endpoint for direct email testing
- **NEW**: Created `/dev/batch-test-email` for comprehensive domain testing
- **NEW**: Created `/api/dev/batch-test-email` for batch testing
- Allows testing different email domains independently

## Recent Findings

### Issue Analysis

Based on your test results:

1. **@victory.digital**: Email sends successfully but `emailId` is `undefined`
2. **@gmail.com**: Email sends successfully and `emailId` is present
3. **Both domains**: Show "No IP address found for rate limiting"

### Key Insights

- The IP detection issue affects all domains equally (not the root cause)
- Missing email IDs for certain domains may indicate different Resend API handling
- The email is being sent successfully in both cases (based on Resend API response)

### Potential Root Causes

1. **Resend Domain Reputation**: Different handling for different recipient domains
2. **Email Provider Filtering**: Some providers may accept but not deliver
3. **API Response Variations**: Resend may return different response structures
4. **Delivery vs Acceptance**: Email accepted by Resend but filtered by recipient provider

## Debugging Steps

### Step 1: Run Batch Test (NEW)

1. Visit http://localhost:5173/dev/batch-test-email
2. Test multiple domains simultaneously:
   - Gmail: billymitchell287@gmail.com
   - Victory Digital: billy@victory.digital
   - Yahoo: test@yahoo.com
   - Outlook: test@outlook.com
3. Compare email ID presence and delivery rates across domains

### Step 2: Check Server Logs

When attempting OTP login, look for these log patterns:

```
🔐 [OTP] Attempting to send OTP to: user@example.com
🔐 [OTP] Email domain: example.com
✅ [OTP] Using common email domain: gmail.com
⚠️  [OTP] Using less common email domain: example.com
✅ [OTP] Email sent successfully to user@example.com
✅ [OTP] Full Resend result: {...}
✅ [OTP] Resend Email ID: <email-id>
⚠️  [OTP] No email ID returned, email may not have been sent properly
```

### Step 3: Check Rate Limiting (NEW)

Look for IP detection logs:

```
🔍 [Rate Limit] Client IP detected: 192.168.1.1
⚠️  [Rate Limit] No IP address found, using fallback: 127.0.0.1
🚫 [Rate Limit] Limit reached for /email-otp/send-verification-otp
```

### Step 4: Check Client Logs

In browser console, look for:

```
🔐 [Client] Requesting OTP for email: user@example.com
✅ [Client] OTP request successful for: user@example.com
🚨 [Auth Client] Request failed: {...}
```

### Step 5: Test Direct Email Sending

1. Visit http://localhost:5173/dev/test-email
2. Test with different email providers:
   - Gmail: test@gmail.com
   - Yahoo: test@yahoo.com
   - Outlook: test@outlook.com
   - Custom domain: test@yourdomain.com
3. Compare success/failure rates and email ID presence

### Step 6: Check Resend Dashboard

- Visit https://resend.com/dashboard
- Check email logs and delivery status
- Look for bounced or rejected emails
- Compare delivery rates between domains

## Common Issues and Solutions

### Issue 1: "From" Domain Not Verified

**Symptoms:** Emails fail to send with domain verification errors
**Solution:** Use `onboarding@resend.dev` (Resend's default domain) ✅ Already implemented

### Issue 2: Rate Limiting

**Symptoms:** 429 errors after multiple attempts
**Solution:** Increased rate limits ✅ Already implemented

### Issue 3: Email Provider Blocking

**Symptoms:** Gmail works, but Yahoo/Outlook fail
**Solution:** Check Resend reputation and consider SPF/DKIM records

### Issue 4: Spam Filtering

**Symptoms:** Emails sent but not received
**Solution:** Check spam folders, improve email content/formatting ✅ Already implemented

## Next Steps

1. **Test with the new logging** - Try OTP login with non-Gmail addresses and check logs
2. **Use the test email tool** - Compare delivery rates across providers
3. **Check Resend dashboard** - Look for delivery issues or reputation problems
4. **Monitor rate limiting** - Check if rate limits are being hit
5. **Verify DNS records** - Ensure proper SPF/DKIM setup if using custom domain

## Monitoring Commands

### Check server logs:

```bash
npm run dev
# Then attempt OTP login and watch console output
```

### Test email endpoint:

```bash
curl -X POST http://localhost:5173/api/dev/test-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

The comprehensive logging should now help identify exactly where and why the OTP process fails for non-Gmail addresses.
