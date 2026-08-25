# QA Automation Platform

Runtime QA framework for API reachability, UI, E2E, visual regression, evidence, local reporting, public-site discovery, and optional Google Sheets integration.

## Setup

Copy `.env.example` to `.env`, then configure `BASE_URL`. To inspect a compatible public workbook, set `GOOGLE_SPREADSHEET_ID`.

```bash
npm install
npx playwright install --with-deps chromium
npm run typecheck
npm test
npm run test:unit
npm run test:integration
npm run qa:all
```

For the exact test locations, Postman import steps, artifact behavior, and how
to interpret a run, see [TESTING.md](TESTING.md).

`qa:all` starts with unit tests, integration tests, and a production-dependency
security audit. Their named status is written into the run report before
runtime browser checks begin.

Coverage never stops merely because a workbook has no requirement/test-case
tab. In that case the runner uses deterministic site discovery and the existing
executable suites, then asks the configured local AI for an advisory draft.
When a compatible requirement/test-case tab is added, coverage automatically
switches to Sheet-driven mapped/unmapped reporting.

Project owners can fill [`PROJECT_INPUT.md`](PROJECT_INPUT.md) instead of guessing
which URL, credentials, Sheet columns, role rules or local ports are required.
Copy-ready Sheet layouts are provided under `templates/`.

The runner never writes to source projects. Google Sheets synchronization is disabled by default and requires explicit credentials and configuration. Public-sheet discovery is read-only.

## Runtime checks

```bash
npm run qa:check-env
npm run qa:discover-site
npm run qa:discover-sheet
npm run qa:triage
npm run qa:report
```

## HTTP and API coverage

`npm run qa:api:live` runs the committed Postman collection through Newman. With only `BASE_URL`, it verifies safe public `GET` website behavior; it does not pretend that HTML pages are a backend API.

Set `API_BASE_URL` only when the backend API base is known. `npm run qa:api:direct` then requests that base as JSON and records API health evidence. Endpoint-level API tests require the backend contract (OpenAPI/Swagger, a Postman collection, or documented routes and non-production credentials); the runner does not guess or mutate unknown endpoints.

`qa:discover-site` crawls localized public routes, records failed first-party assets, and writes `reports/current/site-discovery.json`. `qa:triage` turns deterministic failed image responses into deduplicated local findings in `bugs/runtime-findings.json`; it does not modify the target application or a spreadsheet.

## AI-written test plans

The executable Playwright suite remains deterministic so that a run result is reproducible. To have the local model write a human-style test case from the current website instead of a hard-coded checklist, run:

```bash
npm run qa:ai:test-plan
```

It crawls the current target, samples real pages/forms and confirmed findings, then writes a review-required draft to `reports/current/ai-test-plan.json`. The AI is instructed to write a user journey rather than a generic “Kiểm tra…” title; the output is schema-validated and title-reviewed by the local model before it is saved. It does not execute mutations or create a Google Sheet issue.

To enable append-only Google Sheet synchronization, set `SHEET_SYNC_ENABLED=true`, configure `GOOGLE_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_FILE`, and `TESTER_NAME`, share the workbook with the service-account email, then run:

```bash
npm run qa:sync-sheet
```

The writer identifies the compatible master tab by headers, appends only a new bug row, and uses a QA fingerprint to prevent a repeat sync from duplicating that row.

## Docker

```bash
docker compose up -d
docker compose run --rm qa-runner npm run qa:all
```

`docker compose up -d` starts MongoDB and the QA dashboard at
`http://127.0.0.1:3000`. This project uses the Compose plugin command
`docker compose` (with a space), not the legacy `docker-compose` binary.

Rebuild `qa-runner` after dependency or Dockerfile changes. The Playwright npm
package is pinned to the same version as the Playwright Docker image so the
browser binaries and test runner cannot silently drift apart.

MongoDB runs only on `127.0.0.1:27017` and keeps dashboard run records plus read-only Sheet snapshots. Set `MONGODB_URL=mongodb://127.0.0.1:27017/qa_control` for the local dashboard. The QA container reaches Ollama through `host.docker.internal` and mounts the local service-account directory read-only.

## Artifacts

Failures retain Playwright screenshots, videos, traces, and API evidence. Reports are written under `reports/current`; evidence is partitioned by run ID.
