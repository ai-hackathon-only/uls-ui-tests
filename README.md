# uls-ui-tests

Browser UI tests for the MediaWiki extension
[UniversalLanguageSelector](https://gerrit.wikimedia.org/r/mediawiki/extensions/UniversalLanguageSelector)
(ULS). The suite opens a wiki in Google Chrome, clicks and types like a reader would,
and checks each ULS feature in seven skins, on desktop, tablet and mobile, as an
anonymous visitor and as a logged-in user. It replaces checking each skin by hand.

These are end-to-end tests with [Playwright](https://playwright.dev/). There are no
unit tests and no CI: you run the suite by hand.

## What you need

- Node 24 and Google Chrome (the installed one; Playwright does not download browsers here).
- A MediaWiki with ULS, MobileFrontend and the skins Vector 2022, Vector, MonoBook,
  Timeless, Modern, Cologne Blue and Minerva.
- Test accounts on that wiki. Logged-in tests change only these accounts' own preferences
  and put them back after each test.

## Run it

```sh
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install   # once
set -a; . /path/to/wiki.env; set +a              # ULS_WIKI, ULS_USERS, ULS_PASSWORD
npm test
```

`npm test` runs the whole matrix, prints a pass/fail table, writes the reports and
exits non-zero if any test had an unexpected result.

### Environment variables

| Variable | Meaning |
|---|---|
| `ULS_WIKI` | Base URL of the wiki, e.g. `http://en.mediawiki-agents.mwdd.localhost:8081` |
| `ULS_USERS` | Comma-separated test account names. One logged-in worker per account. |
| `ULS_PASSWORD` | Password for those accounts. Never commit it. |
| `ULS_WORKERS` | Number of parallel workers. Capped at the number of accounts. |
| `ULS_ALLOW_REMOTE` | Set to `1` to allow a wiki that is not `*.localhost` or `127.0.0.1`. |
| `ULS_NO_PROXY` | Set to `1` to start Chrome with `--no-proxy-server` (sandboxes with an HTTP proxy). |
| `ULS_RUN` | Save the run under `runs/<name>/` (`results.json` and `COVERAGE.md`) for `npm run compare`. |
| `ULS_COOKIES` | Semicolon-separated cookies set on the wiki host, e.g. `qa_t439715=old;qa_t439718=old`. |
| `ULS_SHOTS` | Set to `1` (with `ULS_RUN`) to save one screenshot of the open selector per row in `runs/<name>/shots/<row>.png`. |

The suite refuses any URL on port 8080, and any non-local URL unless
`ULS_ALLOW_REMOTE=1` is set. To test another wiki, point `ULS_WIKI` at it and give
accounts that exist there.

### Run a subset

The filters take comma-separated values and can be combined:

```sh
ULS_SKIN=timeless npm test                     # one skin
ULS_SKIN=vector,monobook ULS_DEVICE=mobile npm test
ULS_DEVICE=desktop npm test                    # desktop, tablet or mobile
ULS_USER=anon npm test                         # anon or user (logged in)
npm test -- --grep @search                     # one feature group
npm test -- --project=minerva-mobile-user      # one matrix row
npm run test:list                              # list tests, run nothing
```

## The matrix

| Skin | `useskin=` | Devices |
|---|---|---|
| Vector 2022 | `vector-2022` | desktop, tablet, mobile |
| Vector legacy | `vector` | desktop, tablet, mobile |
| MonoBook | `monobook` | desktop, tablet, mobile |
| Timeless | `timeless` | desktop, tablet, mobile |
| Modern | `modern` | desktop, tablet, mobile |
| Cologne Blue | `cologneblue` | desktop, tablet, mobile |
| Minerva | `minerva` with `useformat=mobile` | tablet, mobile |

Devices: desktop 1280 × 800; tablet 820 × 1180 with touch; mobile 390 × 844 with touch
and a mobile user agent. Desktop skins get `useformat=desktop`, so MobileFrontend
does not switch them to Minerva on small screens. Each row runs as `anon` and as
`user`, so there are 40 rows. A row is a Playwright project named
`<skin>-<device>-<user>`, e.g. `vector-2022-mobile-user`. The matrix lives in
`tests/support/matrix.js` and was agreed in the `Decision: matrix` discussion.

## Read the results

At the start of each run the suite reads `Special:Version` and records the ULS commit,
the MediaWiki core commit and the installed skins. The results describe that code.

- **Terminal**: one table, rows are matrix rows, columns are feature groups.
- **`report/index.html`**: the same table with the run info at the top.
- **`COVERAGE.md`**: which features each row tested and the result, written by the suite.
- **`playwright-report/`**: Playwright's own report with traces and screenshots of
  failures (`npx playwright show-report`).

Cell values:

| Value | Meaning |
|---|---|
| `pass 3/3` | All tests of the group passed. |
| `FAIL 1/3` | Unexpected result. The run exits non-zero. |
| `xfail` | Expected failure: a known ULS bug listed in `KNOWN-ISSUES.md`. |
| `n/a` | The skin or device does not offer the feature; the reason is in `COVERAGE.md`. |
| `skip` | Skipped for another reason. |
| empty | Not run (filtered out). |

A known bug that starts passing shows as `FAIL` too, so a fix gets noticed.

## Compare two versions

To check what a ULS patch changes across the matrix:

```sh
ULS_RUN=before ULS_SHOTS=1 npm test
# check out the patch on the wiki
ULS_RUN=after ULS_SHOTS=1 npm test
npm run compare -- before after
```

You can also compare the old and new language selector on the same ULS checkout with QA cookies:

```sh
ULS_RUN=new ULS_SHOTS=1 npm test
ULS_RUN=old ULS_SHOTS=1 ULS_COOKIES='qa_t439715=old;qa_t439718=old;qa_t439851=old' npm test
npm run compare -- new old
```

`npm run compare -- <before> <after>` reads `runs/<before>/results.json` and
`runs/<after>/results.json`, prints a summary to the terminal, and writes
`compare/<before>-vs-<after>/`:

- **`index.html`**: run metadata, warnings, category counts, changed tests, and
  before/after screenshots side by side for every row that changed.
- **`summary.md`**: Markdown summary of the comparison.
- **`phab-draft.txt`**: Phabricator Remarkup ready to paste into a task or patch comment.

The command exits non-zero when there are new failures (`pass` → `FAIL`). At the top it
warns if the test suite commits differ, if the subset filters differ (rows run in only one
side are marked "not compared", not removed), or if ULS commit, MediaWiki core commit and
QA cookies are identical.

For each changed row with both screenshots, compare also gives a pixel difference: the share
of pixels whose colour changed (any channel by more than `ULS_PIXEL_TOLERANCE`, default 16 of
255). It is marked "over" when it is above `ULS_PIXEL_THRESHOLD` (default 3, in percent) and
shows in `index.html`, `summary.md` and `phab-draft.txt`. Two runs on the same code differed
by up to 2.09% (the suggested languages list can change), so a value under 3% is likely noise.
The pixel difference does not change the exit code.

## Add a test

Tests live in `tests/<group>.spec.js`, one file per feature group. The group is the
column in the table. `FEATURES.md` lists the features and which test covers each.

```js
'use strict';
const { test, expect } = require( './support/fixtures' );

test( 'Esc closes the selector @open', async ( { page, gotoWiki, uls } ) => {
	test.skip( uls.skin === 'minerva', 'n/a: <why this skin has no such feature>' );
	await gotoWiki( 'QA_ULS_search_codes' );
	// click, type, read the page, expect …
} );
```

- Always import `test` and `expect` from `./support/fixtures`, never from
  `@playwright/test`. The fixtures log in, pick the skin and collect errors.
- End the title with `@<group>`.
- `gotoWiki( title, params )` opens a page in the row's skin.
- `uls` holds `{ skin, device, user }` for the row.
- For a feature a skin does not have: `test.skip( cond, 'n/a: <reason>' )`.
- For a real ULS bug: keep the assertion, add an entry to `KNOWN-ISSUES.md`, and mark
  the test `test.fail( cond, 'KI-<n>: <short title>' )`. For a bug that hits many
  tests, add it to `tests/support/known-issues.js` and call
  `markKnownIssues( test, uls, '<group>' )` at the start of each test. Never weaken an
  assertion to make a test pass, and never add retries.
- Each test fails on console errors and failed requests (status 400 or higher). Known
  ones go in `tests/support/known-errors.js` with their `KI-<n>`.
- Show that a new test can fail: break its selector locally, run it, check it goes red.

To add a skin, add it to `SKINS` in `tests/support/matrix.js` (and to `devicesFor` if
it does not run on all devices), then mark features it lacks as `n/a` in the specs.

## Files

```
playwright.config.js        projects (one per matrix row), workers, reporters
tests/<group>.spec.js       feature tests
tests/support/matrix.js     skins, devices, users, subset filters
tests/support/fixtures.js   login, gotoWiki, error collector, preference reset
tests/support/base-url.js   refuses port 8080 and non-local wikis
tests/support/run-info.js   reads Special:Version
tests/support/saved-run.js  writes runs/<name>/results.json when ULS_RUN is set
tests/support/cookies.js    parses ULS_COOKIES for browser contexts
tests/support/summary-reporter.js   table, report/index.html, COVERAGE.md
tests/support/compare-html.js       compare/<before>-vs-<after>/index.html
tests/support/compare-phab.js       compare/<before>-vs-<after>/phab-draft.txt
bin/compare.js              compares two saved runs (npm run compare)
KNOWN-ISSUES.md             ULS bugs the suite found (KI-<n>)
```

## Licence

GPL-2.0-or-later, the same as ULS. See `LICENSE`.

This repository was written by AI agents in a hackathon; see `GOALS.md`.
