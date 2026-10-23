import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Compare visible claims with the real core test run, never a source-line count.
const run = spawnSync(process.execPath, [
  '--experimental-strip-types', '--test', '--test-reporter=tap', 'tests/core.test.ts',
], { encoding: 'utf8', timeout: 30_000, maxBuffer: 2_000_000 });
process.stdout.write(run.stdout ?? '');
if (run.error || run.status !== 0) {
  process.stderr.write('Core tests did not finish successfully; evidence check failed.\n');
  process.exit(1);
}
const total = Number(run.stdout.match(/^# tests (\d+)$/m)?.[1]);
const passed = Number(run.stdout.match(/^# pass (\d+)$/m)?.[1]);
if (!total || total !== passed) {
  process.stderr.write(`Core test totals are invalid: ${passed}/${total}.\n`);
  process.exit(1);
}
const documents = [
  [process.argv[2] ?? 'README.md', [/policy tests (\d+)\/(\d+)/g, /the V3 suite is (\d+)\/(\d+)/g]],
  ['docs/case-study.md', [/passes (\d+) policy tests/g]],
  ['docs/interview-notes.md', [/(\d+) 项离线测试/g]],
  ['docs/resume-bullets.md', [/(\d+) 项离线测试/g]],
];
for (const [path, patterns] of documents) {
  const text = readFileSync(path, 'utf8');
  const claims = patterns.flatMap(pattern => [...text.matchAll(pattern)]);
  if (patterns.some(pattern => !text.match(pattern)) ||
      claims.some(claim => Number(claim[1]) !== passed ||
        (claim[2] !== undefined && Number(claim[2]) !== total))) {
    process.stderr.write(`${path}: evidence is missing or stale; actual core tests: ${passed}/${total}.\n`);
    process.exit(1);
  }
}
console.log(`Policy evidence in ${documents.length} documents matches the passing core suite: ${passed}/${total}.`);
