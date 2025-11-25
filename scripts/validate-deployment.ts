#!/usr/bin/env npx ts-node
/**
 * Pre-Deployment Validation Script
 *
 * Run this before deploying to catch common issues:
 * - TypeScript compilation errors
 * - Missing environment variables
 * - Supabase function availability
 * - API proxy functionality
 *
 * Usage: npm run validate
 */

import { execSync } from 'child_process';

interface ValidationResult {
  name: string;
  passed: boolean;
  message: string;
  details?: string;
}

const results: ValidationResult[] = [];

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logResult(result: ValidationResult) {
  const icon = result.passed ? '✓' : '✗';
  const color = result.passed ? colors.green : colors.red;
  log(`${icon} ${result.name}: ${result.message}`, color);
  if (result.details && !result.passed) {
    console.log(`  ${colors.yellow}${result.details}${colors.reset}`);
  }
}

// ============================================
// Validation Functions
// ============================================

async function validateTypeScript(): Promise<ValidationResult> {
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    return {
      name: 'TypeScript Compilation',
      passed: true,
      message: 'No type errors found',
    };
  } catch (error: any) {
    const output = error.stdout?.toString() || error.stderr?.toString() || 'Unknown error';
    const errorCount = (output.match(/error TS/g) || []).length;
    return {
      name: 'TypeScript Compilation',
      passed: false,
      message: `${errorCount} type error(s) found`,
      details: output.slice(0, 500),
    };
  }
}

async function validateEnvVariables(): Promise<ValidationResult> {
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ];

  const optionalVars = [
    'VITE_ANTHROPIC_API_KEY',
    'VITE_OPENAI_API_KEY',
    'VITE_GEMINI_API_KEY',
  ];

  const missing = requiredVars.filter(v => !process.env[v]);
  const missingOptional = optionalVars.filter(v => !process.env[v]);

  if (missing.length > 0) {
    return {
      name: 'Environment Variables',
      passed: false,
      message: `Missing required: ${missing.join(', ')}`,
      details: 'Create a .env file with these variables',
    };
  }

  const warnings = missingOptional.length > 0
    ? ` (optional missing: ${missingOptional.join(', ')})`
    : '';

  return {
    name: 'Environment Variables',
    passed: true,
    message: `All required variables set${warnings}`,
  };
}

async function validateSupabaseConnection(): Promise<ValidationResult> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return {
      name: 'Supabase Connection',
      passed: false,
      message: 'Missing Supabase credentials',
    };
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: { 'apikey': anonKey },
    });

    if (response.ok || response.status === 200) {
      return {
        name: 'Supabase Connection',
        passed: true,
        message: 'Connected successfully',
      };
    }

    return {
      name: 'Supabase Connection',
      passed: false,
      message: `HTTP ${response.status}`,
      details: await response.text(),
    };
  } catch (error: any) {
    return {
      name: 'Supabase Connection',
      passed: false,
      message: 'Connection failed',
      details: error.message,
    };
  }
}

async function validateSupabaseFunction(name: string): Promise<ValidationResult> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return {
      name: `Edge Function: ${name}`,
      passed: false,
      message: 'Missing Supabase credentials',
    };
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
      },
      body: JSON.stringify({}),
    });

    // 404 means function doesn't exist
    // Other errors (401, 400, etc.) mean function exists but request was invalid
    if (response.status === 404) {
      return {
        name: `Edge Function: ${name}`,
        passed: false,
        message: 'Function not deployed',
        details: 'Run: supabase functions deploy ' + name,
      };
    }

    return {
      name: `Edge Function: ${name}`,
      passed: true,
      message: `Deployed (status: ${response.status})`,
    };
  } catch (error: any) {
    return {
      name: `Edge Function: ${name}`,
      passed: false,
      message: 'Request failed',
      details: error.message,
    };
  }
}

async function validateAnthropicProxy(): Promise<ValidationResult> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return {
      name: 'Anthropic Proxy Function',
      passed: false,
      message: 'Missing Supabase credentials',
    };
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/anthropic-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'x-anthropic-api-key': 'test-key',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 10,
      }),
    });

    // 401 means function exists and is validating API keys (expected with test key)
    // 400 means function exists and is processing requests
    // 200 would mean it worked (unlikely with test key)
    if (response.status === 401 || response.status === 400 || response.status === 200) {
      return {
        name: 'Anthropic Proxy Function',
        passed: true,
        message: `Working (status: ${response.status})`,
      };
    }

    if (response.status === 404) {
      return {
        name: 'Anthropic Proxy Function',
        passed: false,
        message: 'Function not deployed',
        details: 'Run: supabase functions deploy anthropic-proxy',
      };
    }

    return {
      name: 'Anthropic Proxy Function',
      passed: false,
      message: `Unexpected status: ${response.status}`,
      details: await response.text(),
    };
  } catch (error: any) {
    return {
      name: 'Anthropic Proxy Function',
      passed: false,
      message: 'Request failed',
      details: error.message,
    };
  }
}

async function validateFetchProxy(): Promise<ValidationResult> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return {
      name: 'Fetch Proxy Function',
      passed: false,
      message: 'Missing Supabase credentials',
    };
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/fetch-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
      },
      body: JSON.stringify({
        url: 'https://httpbin.org/get',
        method: 'GET',
      }),
    });

    if (response.ok) {
      return {
        name: 'Fetch Proxy Function',
        passed: true,
        message: 'Working correctly',
      };
    }

    if (response.status === 404) {
      return {
        name: 'Fetch Proxy Function',
        passed: false,
        message: 'Function not deployed',
        details: 'Run: supabase functions deploy fetch-proxy',
      };
    }

    return {
      name: 'Fetch Proxy Function',
      passed: false,
      message: `HTTP ${response.status}`,
      details: await response.text(),
    };
  } catch (error: any) {
    return {
      name: 'Fetch Proxy Function',
      passed: false,
      message: 'Request failed',
      details: error.message,
    };
  }
}

async function validateBuildProcess(): Promise<ValidationResult> {
  try {
    execSync('npm run build', { stdio: 'pipe' });
    return {
      name: 'Production Build',
      passed: true,
      message: 'Build completed successfully',
    };
  } catch (error: any) {
    const output = error.stdout?.toString() || error.stderr?.toString() || 'Unknown error';
    return {
      name: 'Production Build',
      passed: false,
      message: 'Build failed',
      details: output.slice(0, 500),
    };
  }
}

// ============================================
// Main Execution
// ============================================

async function main() {
  log('\n╔════════════════════════════════════════════╗', colors.cyan);
  log('║    Pre-Deployment Validation Script        ║', colors.cyan);
  log('╚════════════════════════════════════════════╝\n', colors.cyan);

  const checks = [
    { name: 'Environment', fn: validateEnvVariables },
    { name: 'TypeScript', fn: validateTypeScript },
    { name: 'Supabase', fn: validateSupabaseConnection },
    { name: 'Anthropic Proxy', fn: validateAnthropicProxy },
    { name: 'Fetch Proxy', fn: validateFetchProxy },
  ];

  // Add build check only if --build flag is passed
  if (process.argv.includes('--build')) {
    checks.push({ name: 'Build', fn: validateBuildProcess });
  }

  log('Running validation checks...\n', colors.blue);

  for (const check of checks) {
    process.stdout.write(`  Checking ${check.name}... `);
    const result = await check.fn();
    results.push(result);
    process.stdout.write('\r');
    logResult(result);
  }

  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  log('\n────────────────────────────────────────────', colors.cyan);
  log(`Summary: ${passed} passed, ${failed} failed`, failed > 0 ? colors.red : colors.green);

  if (failed > 0) {
    log('\n⚠️  Please fix the issues above before deploying.', colors.yellow);
    process.exit(1);
  } else {
    log('\n✅ All checks passed! Ready for deployment.', colors.green);
    process.exit(0);
  }
}

// Load .env file if available
try {
  require('dotenv').config();
} catch {
  // dotenv may not be installed, continue anyway
}

main().catch(error => {
  console.error('Validation script error:', error);
  process.exit(1);
});
