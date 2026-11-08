# Done (round 3): evidence per GOALS.md line

Filled in by seat 1 from the proof runs. Wiki: http://en.mediawiki-agents.mwdd.localhost:8081. Machine: MacBook Pro, Apple M2 Max, 64 GB.

## Lines and where they are met

| GOALS.md line (round 3) | Where | Evidence |
|---|---|---|
| Saved runs | #62 | `runs/shots-full/results.json`: `run` (ULS, core, suite commit + dirty flag, skins, wiki, cookies, filters, start, seconds), 1000 `tests` (row, skin, device, user, group, title, outcome, recovered, error), `coverage` |
| QA cookies | #62 | `ULS_COOKIES=...` recorded as `run.cookies`; see proof 2 |
| Compare | #67, #66 | proofs 1 and 3 below: `compare/<a>-vs-<b>/` with `index.html`, `summary.md`, `phab-draft.txt`; exit 1 on a new failure |
| Screenshots side by side | #64, #66 | `ULS_SHOTS=1` run `shots-full` saved 40 PNGs, one per row; 722 s, still under 15 min |
| Phabricator draft | #66 | `phab-draft.txt` in each compare folder; see proof 2 |
| Proof in this file | #69 | proofs 1, 2, 3 below (all three filled) |
| README "Compare two versions" | #66 | `README.md` section with the owner's four steps |

## Proof 3: compare can fail

Copy of a real full run (`runs/shots-full`, 1000 tests, ULS_SHOTS=1, 722 s) with one row edited from pass to FAIL:

```
cp -R runs/shots-full runs/proof3-fail   # then set one vector-2022-desktop-anon @open test to FAIL
node bin/compare.js shots-full proof3-fail ; echo exit=$?
```

```
NEW FAILURES (1 test(s) across 1 row(s)):
  FAIL vector-2022-desktop-anon › @open › Language button is visible and opens selector @open: pass -> FAIL (edited by hand for proof 3)
Summary: 1 changed row(s) | new failures: 1 (1 rows) | fixed: 0 | KI now passing: 0 | still failing: 0 (xfail unchanged: 184) | added: 0 | removed: 0 | n/a changes: 0
exit=1
```

The top of the output also warns "No code change between these runs" (same ULS, core and cookies). Run time 0.04 s.

## Proof 1: no-change pair

Seat 5 ran both under the `matrix` lock, same ULS (`2b186dc`), core (`f7d0709`), no cookies, `ULS_SHOTS=1`:

| Run | Command | Started | Result | Time |
|---|---|---|---|---|
| nochange-a | `ULS_RUN=nochange-a ULS_SHOTS=1 npm test` | 14:36 | 1000 tests, 0 unexpected, 184 known issues, 250 n/a, exit 0 | 725 s |
| nochange-b | `ULS_RUN=nochange-b ULS_SHOTS=1 npm test` | 14:51 | 1000 tests, 0 unexpected, 184 known issues, 250 n/a, exit 0 | 721 s |

Logs: `matrix-seat5-1440.log`, `matrix-seat5-1452.log` in the run folder.

```
node bin/compare.js nochange-a nochange-b ; echo EXIT=$?
WARNING: Suite commits or working tree state differ (4e4a2d6e (dirty) vs afcab8f4 (dirty)): this includes a test change, not only a ULS code change.
WARNING: No code change between these runs: ULS commit (2b186dc0...), MediaWiki core commit (f7d0709e...) and QA cookies (none) are identical.
Summary: 0 changed row(s) | new failures: 0 (0 rows) | fixed: 0 (0 rows) | KI now passing: 0 (0 rows) | still failing: 0 (xfail unchanged: 184) | added: 0 | removed: 0 | n/a changes: 0 | recovered (re-login/retry): before 0, after 0
EXIT=0
```

0 changes, so no flaky row to fix. About the first warning: seat 5's clone moved from `4e4a2d6` to `afcab8f` between the runs. `git diff --stat 4e4a2d6 afcab8f` touches only `tests/support/compare-html.js` and `compare-phab.js` (the report code, run after the tests), so the test code was the same in both runs. "Dirty" is the local `COVERAGE.md` that every run rewrites.

An extra pair from two clones, seat 1's `shots-full` (14:22, 722 s) against `nochange-a`, also gives 0 changed rows, exit 0.

## Proof 2: cookie pair

Seat 5 ran the cookie run under the `matrix` lock, same ULS (`2b186dc`), core (`f7d0709`) and suite commit (`afcab8f`) as `nochange-b`:

| Run | Command | Started | Result | Time |
|---|---|---|---|---|
| nochange-b | `ULS_RUN=nochange-b ULS_SHOTS=1 npm test` | 14:51 | 1000 tests, 0 unexpected, 184 known issues, exit 0 | 721 s |
| cookies-old | `ULS_RUN=cookies-old ULS_SHOTS=1 ULS_COOKIES='qa_t439715=old;qa_t439718=old;qa_t439851=old' npm test` | 15:06 | 1000 tests, 120 FAIL, 184 known issues, exit 1 | 880 s |

Log: `matrix-seat5-1508.log`. `run.cookies` in `cookies-old/results.json` is `qa_t439715=old;qa_t439718=old;qa_t439851=old`.

```
ULS_RUNS_DIR=../aho-challenger/runs node bin/compare.js nochange-b cookies-old ; echo EXIT=$?
WARNING: Both runs had uncommitted local changes in the test suite (afcab8f4... (dirty)).
NEW FAILURES (120 test(s) across 18 row(s)):
Summary: 18 changed row(s) | new failures: 120 (18 rows) | fixed: 0 (0 rows) | KI now passing: 0 (0 rows) | still failing: 0 (xfail unchanged: 184) | added: 0 | removed: 0 | n/a changes: 0 | recovered (re-login/retry): before 0, after 0
EXIT=1
```

Changed rows per skin (new failures):

| Skin | Rows changed | Tests pass -> FAIL |
|---|---|---|
| Vector legacy | 6 of 6 | 38 |
| Modern | 6 of 6 | 38 |
| MonoBook | 4 of 6 (desktop, tablet) | 30 |
| Timeless | 2 of 6 (desktop) | 14 |
| Cologne Blue | 0 of 6 | 0 |
| Vector 2022, Minerva | 0 of 10 | 0 |

Why: the cookies switch these skins back to the old selector (the screenshot `cookies-old/shots/vector-desktop-anon.png` shows the old "5 more" panel in the sidebar). The suite tests the new selector, so the old one fails the same groups on every changed row: `@keyboard` (search box not focused, Enter test times out on `fill`), `@settings` (no quick action to the settings dialog), `@suggested` (no previously used section), and on tablet `@open` Esc. These are expected changes, not ULS bugs.

Rows that did not change, and why:
- Cologne Blue (all rows), Timeless tablet and mobile, MonoBook mobile: already expected failures before the cookies (KI-1: Cologne Blue has no language button; KI-4: Timeless hides the button under 851 px; KI-5: the MonoBook sidebar covers the button on mobile). The button is unusable with either selector, so the outcome stays xfail. Same 184 xfails in both runs.
- Vector 2022 and Minerva: the cookies don't touch them, and 0 rows changed. Their screenshot files differ by bytes (same size, 1280x800 and 1170x2532); not inspected pixel by pixel.

The warning: "dirty" is the `COVERAGE.md` that every run rewrites, as in proof 1. The compare folder `compare/nochange-b-vs-cookies-old/` has `index.html` (before/after screenshots for the 18 rows), `summary.md` and `phab-draft.txt`.

Run time: 880 s with `ULS_SHOTS=1` and 120 failures (failed tests wait for timeouts), still under 15 minutes.
