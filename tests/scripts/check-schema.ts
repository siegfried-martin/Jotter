/**
 * Check database schema for foreign key constraints
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env.test');
dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY!;
const ACCESS_TOKEN = process.env.TEST_ACCESS_TOKEN!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

await supabase.auth.setSession({
	access_token: ACCESS_TOKEN,
	refresh_token: process.env.TEST_REFRESH_TOKEN || ''
});

console.log('🔍 Checking foreign key constraints for note_container table...\n');

// Query to get foreign key constraints
const query = `
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
    AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'note_container'
ORDER BY tc.table_name, tc.constraint_name;
`;

const { data, error } = await supabase.rpc('exec_sql', { query });

if (error) {
	// Try alternative approach using Supabase's query builder
	console.log('⚠️ RPC not available, checking table structure...');

	const { data: tableData, error: tableError } = await supabase
		.from('note_container')
		.select('*')
		.limit(1);

	if (tableError) {
		console.error('❌ Error:', tableError);
	} else {
		console.log('✅ Table exists, but cannot query schema constraints via Supabase API');
		console.log('   You need to check Supabase dashboard or use direct PostgreSQL connection');
		console.log('\n📋 Expected constraint:');
		console.log('   note_container.collection_id -> collection.id ON DELETE CASCADE');
	}
} else {
	console.log('Foreign Key Constraints:');
	console.log(JSON.stringify(data, null, 2));
}
