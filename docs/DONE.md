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

Pending: seat 5 runs `nochange-a` (done 14:48, PASSED in 725 s, 1000 tests) and `nochange-b` (started 14:51) under the matrix lock.

Early check: seat 1's `shots-full` (14:22, 722 s) against seat 5's `nochange-a` (14:48, 725 s), same ULS, core and cookies, both with `ULS_SHOTS=1`:

```
node bin/compare.js shots-full nochange-a ; echo exit=$?
Summary: 0 changed row(s) | new failures: 0 (0 rows) | fixed: 0 (0 rows) | KI now passing: 0 (0 rows) | still failing: 0 (xfail unchanged: 184) | added: 0 | removed: 0 | n/a changes: 0 | recovered (re-login/retry): before 0, after 0
exit=0
```

The top warns that the suite commits differ (two clones) and that there is no code change.

## Proof 2: cookie pair

Pending.
