# QA Automation Platform

Runtime QA framework for API reachability, UI, E2E, visual regression, evidence, local reporting, public-site discovery, and optional Google Sheets integration.

## Setup

Copy `.env.example` to `.env`, then configure `BASE_URL`. To inspect a compatible public workbook, set `GOOGLE_SPREADSHEET_ID`.

```bash
npm install
npx playwright install --with-deps chromium
npm run typecheck
npm test
npm run qa:all
```

The runner never writes to source projects. Google Sheets synchronization is disabled by default and requires explicit credentials and configuration. Public-sheet discovery is read-only.

## Runtime checks

```bash
npm run qa:check-env
npm run qa:discover-site
npm run qa:discover-sheet
npm run qa:triage
npm run qa:report
```

`qa:discover-site` crawls localized public routes, records failed first-party assets, and writes `reports/current/site-discovery.json`. `qa:triage` turns deterministic failed image responses into deduplicated local findings in `bugs/runtime-findings.json`; it does not modify the target application or a spreadsheet.

To enable append-only Google Sheet synchronization, set `SHEET_SYNC_ENABLED=true`, configure `GOOGLE_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_FILE`, and `TESTER_NAME`, share the workbook with the service-account email, then run:

```bash
npm run qa:sync-sheet
```

The writer identifies the compatible master tab by headers, appends only a new bug row, and uses a QA fingerprint to prevent a repeat sync from duplicating that row.

## Docker

```bash
docker compose run --rm qa-runner npm run qa:all
```

## Artifacts

Failures retain Playwright screenshots, videos, traces, and API evidence. Reports are written under `reports/current`; evidence is partitioned by run ID.
