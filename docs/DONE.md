# Done (round 3): evidence per GOALS.md line

Filled in by seat 1 from the proof runs. Wiki: http://en.mediawiki-agents.mwdd.localhost:8081. Machine: MacBook Pro, Apple M2 Max, 64 GB.

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

Pending.
