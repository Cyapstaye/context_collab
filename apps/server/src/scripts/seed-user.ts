/**
 * CLI script to seed an allowlist user.
 * Usage: pnpm seed:user -- --email=x@example.com --password=secret [--role=editor]
 */

import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/auth';

const args = process.argv.slice(2);
const get = (flag: string) => args.find((a) => a.startsWith(`--${flag}=`))?.split('=').slice(1).join('=');

const email = get('email');
const password = get('password');
const role = get('role') ?? 'editor';

if (!email || !password) {
  console.error('Usage: pnpm seed:user -- --email=<email> --password=<password> [--role=editor]');
  process.exit(1);
}

if (!['admin', 'editor'].includes(role)) {
  console.error('role must be "admin" or "editor"');
  process.exit(1);
}

async function main() {
  console.log(`[seed:user] Hashing password for ${email}...`);
  const hash = await hashPassword(password!);

  const user = await prisma.user.upsert({
    where: { email: email! },
    update: { password: hash, role },
    create: { email: email!, password: hash, role },
  });

  console.log(`[seed:user] Done. User ${user.email} (role=${user.role}) saved to DB.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('[seed:user] Error:', err);
  process.exit(1);
});
