import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const assetsDir = new URL('../dist/assets/', import.meta.url);
const forbiddenPatterns = [
  /\bnew Function\b/,
  /\beval\s*\(/,
];

const files = await readdir(assetsDir);
const jsFiles = files.filter((file) => file.endsWith('.js'));
const violations = [];

for (const file of jsFiles) {
  const content = await readFile(join(assetsDir.pathname, file), 'utf8');
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(content)) {
      violations.push(`${file}: ${pattern}`);
    }
  }
}

if (violations.length > 0) {
  console.error('CSP-unsafe JavaScript found in production build:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Production build is CSP-safe.');
