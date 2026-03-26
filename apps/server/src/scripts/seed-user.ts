/**
 * CLI script to seed an allowlist user.
 * Usage: pnpm seed:user -- --email=x@example.com --password=secret [--role=editor]
 * Phase 5: bcrypt + DB write will be wired here.
 */

const args = process.argv.slice(2);
const get = (flag: string) => args.find((a) => a.startsWith(`--${flag}=`))?.split('=')[1];

const email = get('email');
const password = get('password');
const role = get('role') ?? 'editor';

if (!email || !password) {
  console.error('Usage: pnpm seed:user -- --email=<email> --password=<password> [--role=editor]');
  process.exit(1);
}

console.log(`[seed:user] Would create user: ${email} (role=${role})`);
console.log('[seed:user] Note: DB write not implemented yet (Phase 5).');
