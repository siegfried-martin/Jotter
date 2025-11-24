/**
 * E2E Test Data Cleanup Script
 *
 * Deletes all test resources (collections, containers, sections) that follow
 * the e2e-test- naming convention.
 *
 * Usage:
 *   npm run test:cleanup
 *
 * This script:
 * 1. Connects to Supabase using credentials from .env.test
 * 2. Queries for all resources starting with "e2e-test-"
 * 3. Deletes them in correct order (sections → containers → collections)
 * 4. Reports summary of deletions
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env.test
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env.test');
dotenv.config({ path: envPath });

// Validate required environment variables
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY;
const ACCESS_TOKEN = process.env.TEST_ACCESS_TOKEN;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !ACCESS_TOKEN) {
	console.error('❌ Missing required environment variables in .env.test');
	console.error('Required: PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, TEST_ACCESS_TOKEN');
	process.exit(1);
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Set auth session
await supabase.auth.setSession({
	access_token: ACCESS_TOKEN,
	refresh_token: process.env.TEST_REFRESH_TOKEN || ''
});

interface CleanupStats {
	collectionsDeleted: number;
	containersDeleted: number;
	sectionsDeleted: number;
}

/**
 * Deletes all test sections (notes) matching the e2e-test- prefix
 */
async function cleanupSections(): Promise<number> {
	console.log('\n🔍 Finding test sections...');

	const { data: sections, error } = await supabase
		.from('note_section')
		.select('id, title')
		.ilike('title', 'e2e-test-%');

	if (error) {
		console.error('❌ Error fetching sections:', error);
		return 0;
	}

	if (!sections || sections.length === 0) {
		console.log('  No test sections found');
		return 0;
	}

	console.log(`  Found ${sections.length} test sections`);

	// Delete all sections
	const { error: deleteError } = await supabase
		.from('note_section')
		.delete()
		.ilike('title', 'e2e-test-%');

	if (deleteError) {
		console.error('❌ Error deleting sections:', deleteError);
		return 0;
	}

	console.log(`  ✅ Deleted ${sections.length} sections`);
	return sections.length;
}

/**
 * Deletes all test containers matching the e2e-test- prefix
 */
async function cleanupContainers(): Promise<number> {
	console.log('\n🔍 Finding test containers...');

	const { data: containers, error } = await supabase
		.from('note_container')
		.select('id, title')
		.ilike('title', 'e2e-test-%');

	if (error) {
		console.error('❌ Error fetching containers:', error);
		return 0;
	}

	if (!containers || containers.length === 0) {
		console.log('  No test containers found');
		return 0;
	}

	console.log(`  Found ${containers.length} test containers`);

	// Delete all containers
	const { error: deleteError } = await supabase
		.from('note_container')
		.delete()
		.ilike('title', 'e2e-test-%');

	if (deleteError) {
		console.error('❌ Error deleting containers:', deleteError);
		return 0;
	}

	console.log(`  ✅ Deleted ${containers.length} containers`);
	return containers.length;
}

/**
 * Deletes all test collections matching the e2e-test- prefix
 */
async function cleanupCollections(): Promise<number> {
	console.log('\n🔍 Finding test collections...');

	const { data: collections, error } = await supabase
		.from('collections')
		.select('id, name')
		.ilike('name', 'e2e-test-%');

	if (error) {
		console.error('❌ Error fetching collections:', error);
		return 0;
	}

	if (!collections || collections.length === 0) {
		console.log('  No test collections found');
		return 0;
	}

	console.log(`  Found ${collections.length} test collections`);

	// Delete all collections
	const { error: deleteError } = await supabase
		.from('collections')
		.delete()
		.ilike('name', 'e2e-test-%');

	if (deleteError) {
		console.error('❌ Error deleting collections:', deleteError);
		return 0;
	}

	console.log(`  ✅ Deleted ${collections.length} collections`);
	return collections.length;
}

/**
 * Main cleanup function
 */
async function cleanup(): Promise<void> {
	console.log('🧹 Starting E2E test data cleanup...');
	console.log('═'.repeat(50));

	const stats: CleanupStats = {
		collectionsDeleted: 0,
		containersDeleted: 0,
		sectionsDeleted: 0
	};

	// Delete in correct order to respect foreign key constraints
	// Sections first (child of containers)
	stats.sectionsDeleted = await cleanupSections();

	// Containers second (child of collections)
	stats.containersDeleted = await cleanupContainers();

	// Collections last (parent)
	stats.collectionsDeleted = await cleanupCollections();

	// Print summary
	console.log('\n' + '═'.repeat(50));
	console.log('📊 Cleanup Summary:');
	console.log(`  Collections deleted: ${stats.collectionsDeleted}`);
	console.log(`  Containers deleted:  ${stats.containersDeleted}`);
	console.log(`  Sections deleted:    ${stats.sectionsDeleted}`);
	console.log(`  Total items deleted: ${stats.collectionsDeleted + stats.containersDeleted + stats.sectionsDeleted}`);
	console.log('═'.repeat(50));

	const totalDeleted =
		stats.collectionsDeleted + stats.containersDeleted + stats.sectionsDeleted;

	if (totalDeleted === 0) {
		console.log('\n✨ No test data found - database is clean!');
	} else {
		console.log('\n✅ Cleanup complete!');
	}
}

// Run cleanup
cleanup()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error('\n❌ Cleanup failed:', error);
		process.exit(1);
	});
