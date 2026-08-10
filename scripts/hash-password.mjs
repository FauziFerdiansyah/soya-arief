/**
 * Membuat SHA-256 hash untuk password login webadmin.
 *
 * Pakai:  node scripts/hash-password.mjs "password-anda"
 * Output: hex lowercase, tempel ke VITE_ADMIN_PASSWORD_HASH
 */
import { createHash } from 'node:crypto';

const password = process.argv[2];

if (!password) {
  console.error('Pakai: node scripts/hash-password.mjs "password-anda"');
  process.exit(1);
}

const hash = createHash('sha256').update(password, 'utf8').digest('hex');

console.log('\nVITE_ADMIN_PASSWORD_HASH=' + hash + '\n');
