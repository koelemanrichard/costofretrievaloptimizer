/**
 * Supabase Auth Users Migration Script
 *
 * Exports users from source project and imports to target project.
 * Users will need to reset their passwords after migration.
 *
 * Usage: npx tsx scripts/migration/migrateAuthUsers.ts
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load migration environment variables
dotenv.config({ path: '.env.migration' });

const SOURCE_URL = process.env.SOURCE_SUPABASE_URL;
const SOURCE_SERVICE_KEY = process.env.SOURCE_SUPABASE_SERVICE_ROLE_KEY;
const TARGET_URL = process.env.TARGET_SUPABASE_URL;
const TARGET_SERVICE_KEY = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY;

interface SupabaseUser {
  id: string;
  email: string;
  email_confirmed_at?: string;
  phone?: string;
  created_at: string;
  updated_at?: string;
  user_metadata?: Record<string, any>;
  app_metadata?: Record<string, any>;
}

async function listSourceUsers(): Promise<SupabaseUser[]> {
  console.log('📥 Fetching users from source project...');

  const response = await fetch(`${SOURCE_URL}/auth/v1/admin/users`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SOURCE_SERVICE_KEY}`,
      'apikey': SOURCE_SERVICE_KEY!,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch users: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.users || [];
}

async function createUserInTarget(user: SupabaseUser): Promise<{ success: boolean; error?: string }> {
  // Create user with a temporary random password (they'll need to reset)
  const tempPassword = `TempMigration_${Math.random().toString(36).slice(2)}!Aa1`;

  const response = await fetch(`${TARGET_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TARGET_SERVICE_KEY}`,
      'apikey': TARGET_SERVICE_KEY!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: user.email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm since they were confirmed in source
      user_metadata: user.user_metadata || {},
      app_metadata: user.app_metadata || {},
      // Preserve the original user ID for foreign key references
      id: user.id
    })
  });

  if (!response.ok) {
    const error = await response.text();
    return { success: false, error: `${response.status}: ${error}` };
  }

  return { success: true };
}

async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${TARGET_URL}/auth/v1/recover`, {
    method: 'POST',
    headers: {
      'apikey': process.env.TARGET_SUPABASE_ANON_KEY || TARGET_SERVICE_KEY!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: email
    })
  });

  if (!response.ok) {
    const error = await response.text();
    return { success: false, error: `${response.status}: ${error}` };
  }

  return { success: true };
}

async function main() {
  console.log('🔐 Supabase Auth Users Migration\n');

  // Validate environment
  if (!SOURCE_URL || !SOURCE_SERVICE_KEY) {
    console.error('❌ Missing SOURCE environment variables in .env.migration');
    console.error('   Required: SOURCE_SUPABASE_URL, SOURCE_SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  if (!TARGET_URL || !TARGET_SERVICE_KEY) {
    console.error('❌ Missing TARGET environment variables in .env.migration');
    console.error('   Required: TARGET_SUPABASE_URL, TARGET_SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log(`📍 Source: ${SOURCE_URL}`);
  console.log(`📍 Target: ${TARGET_URL}\n`);

  // Parse arguments
  const args = process.argv.slice(2);
  const sendResetEmails = args.includes('--send-reset-emails');
  const dryRun = args.includes('--dry-run');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  try {
    // Fetch users from source
    const users = await listSourceUsers();
    console.log(`✅ Found ${users.length} users in source project\n`);

    if (users.length === 0) {
      console.log('No users to migrate.');
      return;
    }

    // Save users to backup file
    const backupDir = './backup';
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const backupFile = path.join(backupDir, `auth_users_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(users, null, 2));
    console.log(`💾 User backup saved to: ${backupFile}\n`);

    // Display users
    console.log('Users to migrate:');
    users.forEach((user, i) => {
      console.log(`  ${i + 1}. ${user.email} (ID: ${user.id})`);
    });
    console.log('');

    if (dryRun) {
      console.log('🔍 DRY RUN - Would migrate these users. Run without --dry-run to proceed.');
      return;
    }

    // Create users in target
    console.log('📤 Creating users in target project...\n');
    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const user of users) {
      process.stdout.write(`  Creating ${user.email}... `);
      const result = await createUserInTarget(user);
      results.push({ email: user.email, ...result });

      if (result.success) {
        console.log('✅');
      } else {
        console.log(`❌ ${result.error}`);
      }
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log('\n' + '='.repeat(50));
    console.log('📋 MIGRATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`\n✅ Successfully migrated: ${successful}/${users.length} users`);

    if (failed > 0) {
      console.log(`❌ Failed: ${failed} users`);
      console.log('\nFailed users:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.email}: ${r.error}`);
      });
    }

    // Send password reset emails if requested
    if (sendResetEmails && successful > 0) {
      console.log('\n📧 Sending password reset emails...\n');

      for (const result of results.filter(r => r.success)) {
        process.stdout.write(`  Sending to ${result.email}... `);
        const resetResult = await sendPasswordResetEmail(result.email);

        if (resetResult.success) {
          console.log('✅');
        } else {
          console.log(`❌ ${resetResult.error}`);
        }

        // Rate limit: wait 1 second between emails
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n✅ Auth migration complete!');
    console.log('\nNext steps:');
    if (!sendResetEmails) {
      console.log('1. Run with --send-reset-emails to send password reset emails to all users');
      console.log('   npx tsx scripts/migration/migrateAuthUsers.ts --send-reset-emails');
    }
    console.log('2. Users will receive an email to set their new password');
    console.log('3. After password reset, users can log in normally');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
