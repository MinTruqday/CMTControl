# Testing guide

## What information to provide

Start with [`PROJECT_INPUT.md`](PROJECT_INPUT.md). It separates the website URL,
backend health/API contract, Google Sheet schema, role credentials, AI and the
local dashboard ports. Ready-to-copy Sheet tabs are available at
`templates/requirements-sheet.csv` and `templates/test-cases-sheet.csv`.

The Sheet is a coverage source, not executable code. A requirement/test-case row
is `MAPPED` only when its `Test ID` matches an ID implemented under `api/`,
`engine/api/`, `ui/`, `e2e/` or `visual/`. A natural-language row without an implemented ID is reported
as `UNMAPPED`; AI suggestions remain drafts until reviewed and implemented.

## Quick verification

The host does not need Node.js when Docker is available:

```bash
cp .env.example .env
docker compose build qa-runner
docker compose run --rm qa-runner npm run typecheck
docker compose run --rm qa-runner npm run test:unit
docker compose run --rm qa-runner npm run test:integration
docker compose run --rm qa-runner npm run qa:all
```

`qa:all` runs the duplicate-test gate, unit tests, integration tests, production
dependency audit, environment checks, Newman/Postman checks, optional backend
health, UI tests, E2E tests, visual regression, site discovery, triage, and
report generation. It exits non-zero when a required group fails.

Missing requirements are a coverage state, not a runtime failure. The generated
`reports/current/coverage.json` uses `SHEET_DRIVEN` when it recognizes a
Requirements/Test Cases/Yêu cầu/Kịch bản tab. Otherwise it uses
`DISCOVERY_FALLBACK`, keeps all deterministic tests running, and includes fresh
AI drafts as `AI_DRAFT_REVIEW` when local AI is enabled.

## Test locations

| Test layer | Location | Command |
| --- | --- | --- |
| Unit | `engine/run/*.test.ts`, `tests/unit/` | `npm run test:unit` |
| Integration | `tests/integration/` | `npm run test:integration` |
| Postman / HTTP | `api/postman/` | `npm run qa:api:live` |
| UI | `ui/tests/` | `npm run qa:ui` |
| E2E | `e2e/tests/` | `npm run qa:e2e` |
| Visual regression | `visual/tests/` | `npm run qa:visual` |
| Dashboard | `dashboard/dashboard.spec.ts` | `npm run qa:dashboard:test` |

Role tests are opt-in. Copy `config/role-access.example.json`, adjust the login
selectors and permission expectations, put usernames/passwords only in `.env`,
then set `ROLE_TEST_ENABLED=true` and `ROLE_TEST_SPEC_FILE` to the copied file.

## Using Postman

Import both files from `api/postman/` into Postman:

1. `QA_Automation.postman_collection.json`
2. `QA_Automation.local.postman_environment.json`

Select the **QA Automation Local** environment, set `baseUrl`, then run the collection. The same collection can be run without the Postman UI through Newman:

```bash
BASE_URL=https://dev.aaainnovations.vn npm run qa:api:live
```

The committed collection currently contains four safe public `GET` checks. It tests website HTTP behavior, not a complete backend API contract. Backend endpoint tests require `API_BASE_URL` plus an OpenAPI/Swagger contract or documented routes and non-production credentials.

`npm run audit:prod` is the release security gate. Newman remains a development
tool and must run only the committed read-only collection; never run an
unreviewed collection in this repository's container.

## Screenshots, video, and traces

Normal UI and E2E runs do not intentionally capture every page. Playwright screenshots, video, traces, and the custom evidence bundle are retained only for failed tests when these `.env` flags are enabled:

```dotenv
SCREENSHOT_ON_FAILURE=true
VIDEO_ON_FAILURE=true
TRACE_ON_FAILURE=true
```

Visual regression is the exception: it compares the three homepage locales against committed baseline images. Generated artifacts are ignored by Git and appear under `test-results/`, `playwright-report/`, `evidence/`, and `reports/current/`.

To reduce local artifacts while debugging, set the three failure-evidence flags to `false` and set `VISUAL_TEST_ENABLED=false`. Keep them enabled in a formal QA run so failed checks remain reviewable.

## Reading the result

- `reports/current/index.html`: consolidated local report.
- `reports/current/postman-results.json`: Newman result.
- `playwright-report/<run-id>/<group>/index.html`: browser-test report for each
  UI, E2E, and visual group in `qa:all`. Direct single-suite commands write to
  `playwright-report/index.html`.
- `evidence/<run-id>/`: evidence only for failed browser tests.
- `reports/current/<run-id>/run.json`: exit code for each `qa:all` group; every value must be `0` for a complete successful run.
