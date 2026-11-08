# Final pair of full runs (round 2 freeze)

Two full runs of `npm test` in a row on `main` at e83d0b6, by seat 5 holding the run lock, with no
other matrix run going. Machine: MacBook Pro, Apple M2 Max, 64 GB, Node v24.2.0, installed Google
Chrome, accounts from `wiki-seat5.env` (6 workers).

Tested code, from `Special:Version` at the start of each run:

```
Wiki http://en.mediawiki-agents.mwdd.localhost:8081 | MediaWiki 1.48.0-alpha (core f7d0709ef0c28166422137c3167b0a992b999afd) | ULS 2b186dc023e278d88bf91d4713ae021ce2306515 (13:54, 6 November 2026) | skins: Cologne_Blue, MinervaNeue, Modern, MonoBook, Timeless, Vector
```

| Run | Started | Command | Suite summary | Playwright | Exit | Wall time |
|---|---|---|---|---|---|---|
| 1 | 11:02 | `npm test` | PASSED in 709 s: 0 unexpected failure(s), 184 known issue(s), 250 n/a | 750 passed, 250 skipped (11.8m) | 0 | 711 s |
| 2 | 11:14 | `npm test` | PASSED in 723 s: 0 unexpected failure(s), 184 known issue(s), 250 n/a | 750 passed, 250 skipped (12.1m) | 0 | 725 s |

Both runs are under the 900 s limit. The pass/fail list is the same in both:
- the two summary tables (header plus 40 rows) are identical (`diff` prints nothing);
- the sorted titles of the 434 tests that did not plainly pass (184 expected failures, 250 n/a),
  without index or timing, are identical;
- `COVERAGE.md` from the two runs differs only in the order of two n/a lines.

The 184 known issues are KI-1 (Cologne Blue), KI-4 (Timeless tablet and mobile), KI-5 (MonoBook
mobile) and KI-6 (Timeless desktop RTL) in `KNOWN-ISSUES.md`. `COVERAGE.md` in this commit is
the file run 2 wrote, unedited.

Summary table from run 2:

```
row                      | smoke    | interlanguage    | keyboard  | open             | prefs    | rtl              | search    | settings  | suggested        | uilang   | viewport 
------------------------ | -------- | ---------------- | --------- | ---------------- | -------- | ---------------- | --------- | --------- | ---------------- | -------- | ---------
vector-2022-desktop-anon | pass 1/1 | pass 3/3         | pass 3/3  | pass 3/3 +1 n/a  | n/a      | pass 1/1 +1 n/a  | pass 1/1  | pass 3/3  | pass 3/3         | pass 2/2 | n/a      
vector-2022-desktop-user | pass 1/1 | pass 3/3         | pass 3/3  | pass 3/3 +1 n/a  | pass 1/1 | pass 1/1 +1 n/a  | pass 1/1  | pass 3/3  | pass 3/3         | pass 2/2 | n/a      
vector-2022-tablet-anon  | pass 1/1 | pass 3/3         | pass 3/3  | pass 3/3 +1 n/a  | n/a      | pass 1/1 +1 n/a  | pass 1/1  | pass 3/3  | pass 3/3         | pass 2/2 | pass 2/2 
vector-2022-tablet-user  | pass 1/1 | pass 3/3         | pass 3/3  | pass 3/3 +1 n/a  | pass 1/1 | pass 1/1 +1 n/a  | pass 1/1  | pass 3/3  | pass 3/3         | pass 2/2 | pass 2/2 
vector-2022-mobile-anon  | pass 1/1 | pass 3/3         | n/a       | pass 2/2 +2 n/a  | n/a      | pass 2/2         | pass 1/1  | pass 3/3  | pass 3/3         | pass 2/2 | pass 2/2 
vector-2022-mobile-user  | pass 1/1 | pass 3/3         | n/a       | pass 2/2 +2 n/a  | pass 1/1 | pass 2/2         | pass 1/1  | pass 3/3  | pass 3/3         | pass 2/2 | pass 2/2 
vector-desktop-anon      | pass 1/1 | pass 2/2 +1 n/a  | pass 3/3  | pass 3/3 +1 n/a  | n/a      | pass 1/1 +1 n/a  | pass 1/1  | pass 3/3  | pass 2/2 +1 n/a  | pass 2/2 | n/a      
vector-desktop-user      | pass 1/1 | pass 2/2 +1 n/a  | pass 3/3  | pass 3/3 +1 n/a  | pass 1/1 | pass 1/1 +1 n/a  | pass 1/1  | pass 3/3  | pass 2/2 +1 n/a  | pass 2/2 | n/a      
vector-tablet-anon       | pass 1/1 | pass 2/2 +1 n/a  | pass 3/3  | pass 3/3 +1 n/a  | n/a      | pass 1/1 +1 n/a  | pass 1/1  | pass 3/3  | pass 2/2 +1 n/a  | pass 2/2 | pass 2/2 
vector-tablet-user       | pass 1/1 | pass 2/2 +1 n/a  | pass 3/3  | pass 3/3 +1 n/a  | pass 1/1 | pass 1/1 +1 n/a  | pass 1/1  | pass 3/3  | pass 2/2 +1 n/a  | pass 2/2 | pass 2/2 
vector-mobile-anon       | pass 1/1 | pass 2/2 +1 n/a  | n/a       | pass 2/2 +2 n/a  | n/a      | pass 2/2         | pass 1/1  | pass 3/3  | pass 2/2 +1 n/a  | pass 2/2 | pass 2/2 
vector-mobile-user       | pass 1/1 | pass 2/2 +1 n/a  | n/a       | pass 2/2 +2 n/a  | pass 1/1 | pass 2/2         | pass 1/1  | pass 3/3  | pass 2/2 +1 n/a  | pass 2/2 | pass 2/2 
monobook-desktop-anon    | pass 1/1 | pass 2/2 +1 n/a  | pass 3/3  | pass 3/3 +1 n/a  | n/a      | pass 1/1 +1 n/a  | pass 1/1  | pass 3/3  | pass 2/2 +1 n/a  | pass 2/2 | n/a      
monobook-desktop-user    | pass 1/1 | pass 2/2 +1 n/a  | pass 3/3  | pass 3/3 +1 n/a  | pass 1/1 | pass 1/1 +1 n/a  | pass 1/1  | pass 3/3  | pass 2/2 +1 n/a  | pass 2/2 | n/a      
monobook-tablet-anon     | pass 1/1 | pass 2/2 +1 n/a  | pass 3/3  | pass 3/3 +1 n/a  | n/a      | pass 1/1 +1 n/a  | pass 1/1  | pass 3/3  | pass 2/2 +1 n/a  | pass 2/2 | pass 2/2 
monobook-tablet-user     | pass 1/1 | pass 2/2 +1 n/a  | pass 3/3  | pass 3/3 +1 n/a  | pass 1/1 | pass 1/1 +1 n/a  | pass 1/1  | pass 3/3  | pass 2/2 +1 n/a  | pass 2/2 | pass 2/2 
monobook-mobile-anon     | pass 1/1 | xfail 2/2 +1 n/a | n/a       | xfail 2/2 +2 n/a | n/a      | xfail 2/2        | xfail 1/1 | xfail 3/3 | xfail 2/2 +1 n/a | pass 2/2 | xfail 2/2
monobook-mobile-user     | pass 1/1 | xfail 2/2 +1 n/a | n/a       | xfail 2/2 +2 n/a | pass 1/1 | xfail 2/2        | xfail 1/1 | xfail 3/3 | xfail 2/2 +1 n/a | pass 2/2 | xfail 2/2
timeless-desktop-anon    | pass 1/1 | pass 2/2 +1 n/a  | pass 3/3  | pass 3/3 +1 n/a  | n/a      | xfail 1/1 +1 n/a | pass 1/1  | pass 3/3  | pass 2/2 +1 n/a  | pass 2/2 | n/a      
timeless-desktop-user    | pass 1/1 | pass 2/2 +1 n/a  | pass 3/3  | pass 3/3 +1 n/a  | pass 1/1 | xfail 1/1 +1 n/a | pass 1/1  | pass 3/3  | pass 2/2 +1 n/a  | pass 2/2 | n/a      
timeless-tablet-anon     | pass 1/1 | xfail 2/2 +1 n/a | xfail 3/3 | xfail 3/3 +1 n/a | n/a      | xfail 1/1 +1 n/a | xfail 1/1 | xfail 3/3 | xfail 2/2 +1 n/a | pass 2/2 | xfail 2/2
timeless-tablet-user     | pass 1/1 | xfail 2/2 +1 n/a | xfail 3/3 | xfail 3/3 +1 n/a | pass 1/1 | xfail 1/1 +1 n/a | xfail 1/1 | xfail 3/3 | xfail 2/2 +1 n/a | pass 2/2 | xfail 2/2
timeless-mobile-anon     | pass 1/1 | xfail 2/2 +1 n/a | n/a       | xfail 2/2 +2 n/a | n/a      | xfail 2/2        | xfail 1/1 | xfail 3/3 | xfail 2/2 +1 n/a | pass 2/2 | xfail 2/2
timeless-mobile-user     | pass 1/1 | xfail 2/2 +1 n/a | n/a       | xfail 2/2 +2 n/a | pass 1/1 | xfail 2/2        | xfail 1/1 | xfail 3/3 | xfail 2/2 +1 n/a | pass 2/2 | xfail 2/2
modern-desktop-anon      | pass 1/1 | pass 2/2 +1 n/a  | pass 3/3  | pass 3/3 +1 n/a  | n/a      | pass 1/1 +1 n/a  | pass 1/1  | pass 3/3  | pass 2/2 +1 n/a  | pass 2/2 | n/a      
modern-desktop-user      | pass 1/1 | pass 2/2 +1 n/a  | pass 3/3  | pass 3/3 +1 n/a  | pass 1/1 | pass 1/1 +1 n/a  | pass 1/1  | pass 3/3  | pass 2/2 +1 n/a  | pass 2/2 | n/a      
modern-tablet-anon       | pass 1/1 | pass 2/2 +1 n/a  | pass 3/3  | pass 3/3 +1 n/a  | n/a      | pass 1/1 +1 n/a  | pass 1/1  | pass 3/3  | pass 2/2 +1 n/a  | pass 2/2 | pass 2/2 
modern-tablet-user       | pass 1/1 | pass 2/2 +1 n/a  | pass 3/3  | pass 3/3 +1 n/a  | pass 1/1 | pass 1/1 +1 n/a  | pass 1/1  | pass 3/3  | pass 2/2 +1 n/a  | pass 2/2 | pass 2/2 
modern-mobile-anon       | pass 1/1 | pass 2/2 +1 n/a  | n/a       | pass 2/2 +2 n/a  | n/a      | pass 2/2         | pass 1/1  | pass 3/3  | pass 2/2 +1 n/a  | pass 2/2 | pass 2/2 
modern-mobile-user       | pass 1/1 | pass 2/2 +1 n/a  | n/a       | pass 2/2 +2 n/a  | pass 1/1 | pass 2/2         | pass 1/1  | pass 3/3  | pass 2/2 +1 n/a  | pass 2/2 | pass 2/2 
cologneblue-desktop-anon | pass 1/1 | xfail 2/2 +1 n/a | xfail 3/3 | xfail 3/3 +1 n/a | n/a      | xfail 1/1 +1 n/a | xfail 1/1 | xfail 3/3 | xfail 2/2 +1 n/a | pass 2/2 | n/a      
cologneblue-desktop-user | pass 1/1 | xfail 2/2 +1 n/a | xfail 3/3 | xfail 3/3 +1 n/a | pass 1/1 | xfail 1/1 +1 n/a | xfail 1/1 | xfail 3/3 | xfail 2/2 +1 n/a | pass 2/2 | n/a      
cologneblue-tablet-anon  | pass 1/1 | xfail 2/2 +1 n/a | xfail 3/3 | xfail 3/3 +1 n/a | n/a      | xfail 1/1 +1 n/a | xfail 1/1 | xfail 3/3 | xfail 2/2 +1 n/a | pass 2/2 | xfail 2/2
cologneblue-tablet-user  | pass 1/1 | xfail 2/2 +1 n/a | xfail 3/3 | xfail 3/3 +1 n/a | pass 1/1 | xfail 1/1 +1 n/a | xfail 1/1 | xfail 3/3 | xfail 2/2 +1 n/a | pass 2/2 | xfail 2/2
cologneblue-mobile-anon  | pass 1/1 | xfail 2/2 +1 n/a | n/a       | xfail 2/2 +2 n/a | n/a      | xfail 2/2        | xfail 1/1 | xfail 3/3 | xfail 2/2 +1 n/a | pass 2/2 | xfail 2/2
cologneblue-mobile-user  | pass 1/1 | xfail 2/2 +1 n/a | n/a       | xfail 2/2 +2 n/a | pass 1/1 | xfail 2/2        | xfail 1/1 | xfail 3/3 | xfail 2/2 +1 n/a | pass 2/2 | xfail 2/2
minerva-tablet-anon      | pass 1/1 | pass 3/3         | pass 3/3  | pass 3/3 +1 n/a  | n/a      | pass 1/1 +1 n/a  | pass 1/1  | n/a       | pass 2/2 +1 n/a  | n/a      | pass 2/2 
minerva-tablet-user      | pass 1/1 | pass 3/3         | pass 3/3  | pass 3/3 +1 n/a  | pass 1/1 | pass 1/1 +1 n/a  | pass 1/1  | n/a       | pass 2/2 +1 n/a  | n/a      | pass 2/2 
minerva-mobile-anon      | pass 1/1 | pass 3/3         | n/a       | pass 2/2 +2 n/a  | n/a      | pass 2/2         | pass 1/1  | n/a       | pass 2/2 +1 n/a  | n/a      | pass 2/2 
minerva-mobile-user      | pass 1/1 | pass 3/3         | n/a       | pass 2/2 +2 n/a  | pass 1/1 | pass 2/2         | pass 1/1  | n/a       | pass 2/2 +1 n/a  | n/a      | pass 2/2 

```
