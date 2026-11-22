# Vimta public website monitor

Runs independently of WordPress. No website plugin, passwords or API keys are needed. It does not submit forms, log in, or verify email/CRM delivery.

## Activate on GitHub

1. Add `monitoring/` and `.github/workflows/website-monitor.yml` to your GitHub repository's default branch. These paths must remain together; no theme files need to be uploaded to a separate monitoring repository.
2. Enable GitHub Actions, then open **Actions → Vimta daily website monitor → Run workflow** and choose `check`.
3. Open the completed run and download its report artifact. Extract it and open `playwright-report/index.html`. The report contains failures, screenshots and traces. A red run means a check failed or setup could not complete; inspect the log/report to distinguish them.
4. The daily schedule targets **9:17 AM IST**. GitHub can delay scheduled runs. Schedules run from the default branch, and public repositories can have schedules disabled after 60 days of inactivity.
5. For failure email, configure your GitHub account's Actions notification settings and subscribe to the workflow as appropriate. This project does not send email or create GitHub issues itself.

GitHub runner minutes and artifact storage are subject to your account's allowance. Reports expire after 14 days; check your billing settings before enabling paid usage.

## Checks and coverage

- Four representative pages on desktop Chromium and emulated Android Chromium: HTTP status, unexpected path redirects, Vimta title, required text, images, uncaught JavaScript errors, first-party asset HTTP errors and horizontal overflow.
- Up to 80 unique same-origin homepage links, checked once per run. This is a sample, not a whole-site crawl. Query-string links, private/admin routes and external links are excluded.
- Viewport visual comparisons when approved reference screenshots exist. Full-page appearance and interaction journeys are not covered by these initial visual checks.
- Each failed test retries once. The Playwright report identifies retries/flaky results. A permanently failing run remains red.

Edit `site.config.mjs` to add pages and stable required text or adjust the link limit and changing-area masks. Failed first-party images/scripts/styles/fonts and uncaught exceptions fail checks; third-party asset HTTP errors are not included. HTTP failures from the runner can indicate a firewall challenge as well as a website problem.

## Approve visual references

1. Run the workflow manually with `mode: baseline` on GitHub's Linux runner. Initial normal runs explicitly skip visual comparisons until references exist.
2. Download `candidate-baselines`, inspect all desktop and mobile images and verify the site looks correct. Its top-level `desktop/` and `mobile/` directories belong inside `monitoring/checks/baselines/`.
3. Commit those reviewed PNG files on the default branch. Subsequent daily runs compare against them and include difference images on failures.
4. Repeat deliberately after approved design changes. Never automatically replace references after a failure.

The initial masks cover common carousels, video and iframe selectors. Inspect the references and tune masks for this site's changing content; text updates, asynchronous content and custom carousels may still cause visual alerts. Generate references on the same Linux runner used for daily checks to avoid OS/font differences. The pixel mismatch allowance is 1% of the viewport.

## Run locally

Requires Node.js 24 and outbound HTTPS access.

```sh
cd monitoring
npm ci
npx playwright install chromium
npm run check
npm run report
```

For a short smoke check: `npm run check -- --project=desktop --grep "home: page health"`.

On Windows PowerShell with script execution disabled, use `npm.cmd` and `npx.cmd`. No build or deployment of the WordPress theme is required.

Sources: [Playwright CI setup](https://playwright.dev/docs/ci-intro), [GitHub scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).
