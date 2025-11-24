/**
 * Extract authentication tokens from a logged-in browser session
 *
 * Usage:
 *   1. Make sure you're logged into the app in your browser
 *   2. Run: npm run test:extract-tokens
 *   3. Copy the tokens to .env.test
 */

import { chromium } from '@playwright/test';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env.test');
dotenv.config({ path: envPath });

const APP_URL = process.env.PUBLIC_SUPABASE_URL ?
	process.env.PUBLIC_SUPABASE_URL.replace('https://', 'https://jotter.marstol.com') :
	'http://localhost:5173';

async function extractTokens() {
	console.log('🌐 Launching browser...');
	console.log('📋 Please log in to the application in the browser window that opens');
	console.log('   URL: http://localhost:5173/app');
	console.log('');

	const browser = await chromium.launch({
		headless: false,
		timeout: 120000
	});

	const context = await browser.newContext();
	const page = await context.newPage();

	try {
		// Navigate to the app
		await page.goto('http://localhost:5173/app', {
			waitUntil: 'networkidle',
			timeout: 60000
		});

		console.log('⏳ Waiting for you to log in...');
		console.log('   (The browser will stay open for 2 minutes)');

		// Wait for authentication - look for the /app URL after login
		await page.waitForURL(/\/app/, { timeout: 120000 });

		console.log('✅ Detected successful login! Extracting tokens...');

		// Give a moment for localStorage to be populated
		await page.waitForTimeout(2000);

		// Extract tokens from localStorage
		const tokens = await page.evaluate(() => {
			const supabaseKey = Object.keys(localStorage).find(key =>
				key.startsWith('sb-') && key.endsWith('-auth-token')
			);

			if (supabaseKey) {
				const sessionData = localStorage.getItem(supabaseKey);
				if (sessionData) {
					const session = JSON.parse(sessionData);
					return {
						accessToken: session.access_token,
						refreshToken: session.refresh_token,
						userId: session.user?.id,
						email: session.user?.email,
					};
				}
			}
			return null;
		});

		if (!tokens || !tokens.accessToken || !tokens.refreshToken) {
			throw new Error('Could not extract tokens from localStorage');
		}

		console.log('\n✅ Successfully extracted tokens!');
		console.log('   User:', tokens.email);
		console.log('   User ID:', tokens.userId);
		console.log('');

		// Update .env.test file
		console.log('💾 Updating .env.test...');
		let envContent = fs.readFileSync(envPath, 'utf-8');

		envContent = envContent.replace(/TEST_ACCESS_TOKEN=.*/, `TEST_ACCESS_TOKEN=${tokens.accessToken}`);
		envContent = envContent.replace(/TEST_REFRESH_TOKEN=.*/, `TEST_REFRESH_TOKEN=${tokens.refreshToken}`);

		if (!envContent.includes('TEST_USER_ID=')) {
			envContent += `\nTEST_USER_ID=${tokens.userId}`;
		} else {
			envContent = envContent.replace(/TEST_USER_ID=.*/, `TEST_USER_ID=${tokens.userId}`);
		}

		if (!envContent.includes('TEST_USER_EMAIL=')) {
			envContent += `\nTEST_USER_EMAIL=${tokens.email}`;
		} else {
			envContent = envContent.replace(/TEST_USER_EMAIL=.*/, `TEST_USER_EMAIL=${tokens.email}`);
		}

		fs.writeFileSync(envPath, envContent);

		console.log('✅ .env.test updated successfully!');
		console.log('');
		console.log('🎉 You can now run E2E tests:');
		console.log('   npm run test:e2e');
		console.log('');

	} catch (error) {
		console.error('❌ Failed to extract tokens:', error);
		console.error('');
		console.error('Please try again and make sure you:');
		console.error('  1. Successfully log in with Google OAuth');
		console.error('  2. Wait for the redirect to /app');
		console.error('  3. Keep the browser window open until extraction completes');
		process.exit(1);
	} finally {
		await browser.close();
	}
}

extractTokens()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error('❌ Script failed:', error);
		process.exit(1);
	});
