/**
 * Global Setup for Playwright E2E Tests
 *
 * This runs before all tests and handles:
 * - Cleanup of test data (unless --no-cleanup flag is passed)
 * - Token refresh
 *
 * To skip cleanup (e.g., when debugging test state):
 *   npm run test:e2e:no-cleanup
 *   # or
 *   SKIP_CLEANUP=1 npm run test:e2e
 */

import { execSync } from 'child_process';

async function globalSetup() {
	const skipCleanup = process.env.SKIP_CLEANUP === '1' || process.env.SKIP_CLEANUP === 'true';

	if (!skipCleanup) {
		console.log('\n🧹 Running test data cleanup before tests...\n');
		try {
			execSync('npm run test:cleanup', {
				stdio: 'inherit',
				cwd: process.cwd()
			});
		} catch (error) {
			console.error('⚠️ Cleanup failed, but continuing with tests:', error);
		}
	} else {
		console.log('\n⏭️  Skipping cleanup (SKIP_CLEANUP=1)\n');
	}
}

export default globalSetup;
