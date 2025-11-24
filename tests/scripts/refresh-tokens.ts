/**
 * Auto-refresh access tokens using refresh token
 *
 * This script checks if the access token is expired and automatically
 * refreshes it using the longer-lived refresh token.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Load environment variables from .env.test
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env.test');
dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY;
const ACCESS_TOKEN = process.env.TEST_ACCESS_TOKEN;
const REFRESH_TOKEN = process.env.TEST_REFRESH_TOKEN;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !ACCESS_TOKEN || !REFRESH_TOKEN) {
	console.error('❌ Missing required environment variables in .env.test');
	process.exit(1);
}

/**
 * Decode JWT and check expiration
 */
function isTokenExpired(token: string): boolean {
	try {
		// JWT format: header.payload.signature
		const parts = token.split('.');
		if (parts.length !== 3) {
			return true;
		}

		// Decode payload (base64url)
		const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

		// Check expiration (exp is in seconds, Date.now() is in milliseconds)
		const expirationTime = payload.exp * 1000;
		const currentTime = Date.now();

		// Add 60 second buffer - refresh if token expires within 1 minute
		const isExpired = expirationTime < (currentTime + 60000);

		if (isExpired) {
			console.log(`   Token expires at: ${new Date(expirationTime).toISOString()}`);
			console.log(`   Current time:     ${new Date(currentTime).toISOString()}`);
		}

		return isExpired;
	} catch (error) {
		console.error('   Error decoding token:', error);
		return true;
	}
}

async function refreshTokens() {
	console.log('🔄 Checking if tokens need refresh...');

	const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

	try {
		// Check token expiration by decoding JWT
		if (!isTokenExpired(ACCESS_TOKEN)) {
			console.log('✅ Current access token is still valid');

			// Decode to show user info
			const parts = ACCESS_TOKEN.split('.');
			const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
			console.log(`   User: ${payload.email}`);
			console.log(`   Expires: ${new Date(payload.exp * 1000).toISOString()}`);
			return;
		}

		// Token is expired, refresh it
		console.log('🔄 Access token expired, refreshing...');

		const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
			refresh_token: REFRESH_TOKEN
		});

		if (refreshError || !refreshData.session) {
			throw refreshError || new Error('No session returned from refresh');
		}

		// Update .env.test with new tokens
		console.log('💾 Updating .env.test with new tokens...');

		let envContent = fs.readFileSync(envPath, 'utf-8');

		// Replace the access token
		envContent = envContent.replace(
			/TEST_ACCESS_TOKEN=.*/,
			`TEST_ACCESS_TOKEN=${refreshData.session.access_token}`
		);

		// Update refresh token if it changed
		if (refreshData.session.refresh_token !== REFRESH_TOKEN) {
			envContent = envContent.replace(
				/TEST_REFRESH_TOKEN=.*/,
				`TEST_REFRESH_TOKEN=${refreshData.session.refresh_token}`
			);
		}

		fs.writeFileSync(envPath, envContent);

		console.log('✅ Tokens refreshed successfully!');
		console.log(`   User: ${refreshData.session.user.email}`);
	} catch (error) {
		console.error('❌ Token refresh failed:', error);
		console.error('\n⚠️  Please manually update tokens in .env.test:');
		console.error('   1. Log into the app in your browser');
		console.error('   2. Open DevTools Console (F12)');
		console.error('   3. Run: JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.startsWith("sb-") && k.endsWith("-auth-token"))))');
		console.error('   4. Copy access_token and refresh_token to .env.test');
		process.exit(1);
	}
}

refreshTokens()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error('❌ Script failed:', error);
		process.exit(1);
	});
