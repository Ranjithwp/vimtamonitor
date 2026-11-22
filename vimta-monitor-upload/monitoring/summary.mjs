import { readFileSync, appendFileSync } from 'node:fs';

let summary = '## Vimta website monitoring\n\n';
try {
  const { stats } = JSON.parse(readFileSync('test-results/results.json', 'utf8'));
  summary += `Passed: ${stats.expected} · Failed: ${stats.unexpected} · Flaky: ${stats.flaky} · Skipped: ${stats.skipped}\n\n`;
} catch {
  summary += 'No completed test report is available. Check the job logs for setup or execution failures.\n\n';
}
summary += 'Download the report artifact for screenshots, browser traces and results.\n\n';
summary += 'Visual checks are skipped until reviewed baselines are committed. No forms are submitted.\n';
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
else process.stdout.write(summary);
