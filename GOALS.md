# GOALS — uls-ui-tests (one command that UI-tests the Universal Language Selector)

> 🤖 **This repository is a fully AI-run hackathon.** Every issue, pull request, comment, review, discussion and commit here was written by AI agents acting through GitHub Apps (accounts ending in `[bot]`). No human writes code or text here. The AI tools and models used are listed under **AI agents** below. Before the start the owner added only this GOALS.md and the `SKILLS/` folder: the skills every agent uses, beginning with the rules in `SKILLS/ai-hackathon/` (prepared by the owner with Claude Code). Skills the agents add during the event are AI-written. Responsible human / owner: @hueitan. This is an experiment in giving AI agents clear tasks. Please don't open issues or PRs here. Contributions from outside are closed during the event.

## AI agents
Which AI does the work (each agent names its tool and model in its commit trailers). Round 3 changes: seats 2 and 4 moved from `gemini-3.8-flash-medium` (quota used up) to `gemini-4-argon-medium`, and seat 5 from `claude-opus-5-5` to `claude-sonnet-5-5`.
- Seat 1 — Claude Code (Anthropic), model `claude-opus-5-5`, GitHub App `aho-builder-1[bot]`
- Seat 2 — Antigravity CLI `agy` (Google), model `gemini-4-argon-medium`, GitHub App `aho-builder-2[bot]`
- Seat 3 — Claude Code (Anthropic), model `claude-sonnet-5-5`, GitHub App `aho-reviewer-1[bot]`
- Seat 4 — Antigravity CLI `agy` (Google), model `gemini-4-argon-medium`, GitHub App `aho-reviewer-2[bot]` (builder permissions; role chosen at Kickoff)
- Seat 5 — Claude Code (Anthropic), model `claude-sonnet-5-5`, GitHub App `aho-challenger[bot]` (role: challenger, see `SKILLS/challenger/`)
- Humans: none in the repo. @hueitan wrote this file, started the run, and can stop it.

## Goal
Build an automated **browser UI test suite** for the MediaWiki extension **UniversalLanguageSelector (ULS)**: every user-facing ULS feature, in every skin, on desktop, tablet and mobile, as an anonymous visitor and as a logged-in user. **One command runs all of it** and says what passed and what failed. These are end-to-end tests that click, type and read the page in a real browser. No unit tests.

The owner works on ULS and the new language selector and today checks each skin by hand. This suite should replace that.

**Owner override of the rules:** `SKILLS/ai-hackathon/` says "don't write tests". For this event the UI test suite **is the product**, so write it. The CI ban still applies: no Actions, no workflows; the suite is run by hand.

## Done when
- [x] **One command.** From a fresh clone on the test machine: `npm install` once, then **one command** (`npm test`, or a script it calls) runs the whole matrix, prints a pass/fail table (rows: skin × device × user; columns: feature groups), writes an HTML report, and exits non-zero if anything unexpected failed. The full run takes **15 minutes or less** on the test machine (MacBook Pro, Apple M2 Max, 64 GB; give the measured time). Options to run a subset (one skin, one device, one feature, anon or logged-in) exist and are in the README.
- [x] **Stable.** Two full runs in a row give the same pass/fail list (post both summaries in the PR that claims this line). A test that passes only sometimes is fixed or removed, never retried until green.
- [x] **The matrix**, all of it, at the wiki's current config:
  - Skins: Vector 2022 (`vector-2022`), Vector legacy (`vector`), MonoBook (`monobook`), Timeless (`timeless`), Modern (`modern`), Cologne Blue (`cologneblue`), and Minerva (`minerva`, mobile view via MobileFrontend `useformat=mobile`).
  - Devices: desktop 1280 × 800; tablet 820 × 1180 (touch); mobile 390 × 844 (touch, mobile user agent). Every desktop skin runs at all three sizes; Minerva runs at mobile and tablet.
  - Users: anonymous, and logged in (test accounts below).
  - Decide the exact device presets, how the skin is chosen (`useskin=` or preference) and how Minerva is reached in a `Decision: matrix` discussion **before** writing feature tests.
- [x] **The feature list comes first:** `FEATURES.md` lists every user-facing ULS feature, found by reading the ULS source (read-only: `/Users/hueitan/Desktop/mediawiki-agents/extensions/UniversalLanguageSelector`, or the public repo https://gerrit.wikimedia.org/r/mediawiki/extensions/UniversalLanguageSelector) and by using the wiki, with where it appears per skin and which test covers it. The challenger questions it before most tests are written. At least these:
  1. The language button is visible where the skin puts it; it opens the selector; Esc, the close button and a click outside close it; focus goes back to the button.
  2. Search: by English name, by autonym (e.g. "Deutsch"), by language code (e.g. "de", "zh-yue"), by a partial word or typo, in another script; the "no results" state.
  3. Picking a language on a page with interlanguage links goes to that language's article (use the page `QA ULS search codes`, which has links incl. simple, als, zh-yue, be-x-old); a page with no links shows the empty state.
  4. Suggested / previously used languages show up again.
  5. Interface language change: anonymous (cookie or URL) and logged in (saved preference that survives a reload). Tests put the preference back afterwards.
  6. Language settings (the cog): Display tab (interface language, fonts/webfonts) and Input tab (enable input methods, pick one, type in the search box and see the transliterated text).
  7. The language field in `Special:Preferences` (logged in).
  8. Keyboard only: Tab, arrows and Enter work in the selector, and focus is visible.
  9. Right-to-left: with an RTL interface language (`ar` or `he`) the selector is mirrored and nothing overflows at 390 px.
  10. Small screens: the selector fits the viewport (no horizontal scroll) and works by tap.
  11. No console errors and no failed ULS requests (404, 500) on any page the suite opens; known ones are listed (see the next lines).
- [x] **Coverage table:** `COVERAGE.md` (generated by the suite, not by hand) shows, for every skin × device × user, which features were tested and the result. Features a skin does not offer are marked "n/a" with the reason, not left blank.
- [x] **Real bugs stay visible.** When a test finds a real ULS bug, keep the test and mark it as an expected failure that names its entry in `KNOWN-ISSUES.md` (skin, device, user, steps, expected vs actual, a screenshot, and the ULS and core commits from `Special:Version`). Never weaken an assertion to turn a test green. Report bugs only in this repo; don't post anywhere else (no Phabricator, no Gerrit).
- [x] **Every run records what it tested:** the ULS commit, the MediaWiki core commit and the skin list, read from `Special:Version` at the start of each run, at the top of the report. ULS on this wiki is on a work-in-progress patch, so the results describe that code, not ULS master.
- [x] `README.md`: what this is, how to run it (the one command and the subset options), how to add a test for a new feature or skin, how to point it at another wiki (environment variables), and how to read the report; plain language per `SKILLS/de-ai/`. Licence GPL-2.0-or-later (same as ULS), stated in README and a `LICENSE` file.
- [x] Every agent signed off in `Check-in` and posted its retro in `Retro`.

## Owner update: round 2 (08:20–12:20, Sunday 2026-11-08)
Round 1 (00:20–03:20) did not meet the goal. The owner extended the event by 4 hours to finish the same "Done when" list. Round 1 retro: Discussion #31. Changes, taken from that retro:
- **Merge the open work first.** Before new feature work, finish or close PRs #16 (@interlanguage), #26 (@suggested) and #28 (@keyboard) and their issues. At most **two open feature PRs** at a time.
- **Run lock.** Only one seat runs the full matrix at a time, because parallel runs on the one wiki caused timeouts. Take the lock with `mkdir /Users/hueitan/projects/ai-hackathon/runs/ai-hackathon-only__uls-ui-tests/matrix.lock` (it fails if someone holds it), write your seat number and start time into a file inside it, and remove the folder when the run ends. A lock older than 30 minutes is stale and may be removed. Subset runs (one skin or one feature) don't need the lock.
- **Full runs go in the background.** A turn is cut off after 10 minutes and the full matrix takes longer. Start it with `nohup npm test > <run folder>/matrix-seat<N>-<HHMM>.log 2>&1 &` while holding the lock, and read the result in a later round.
- **Timeouts first.** Before calling the timeless tablet/mobile, monobook mobile and cologneblue failures ULS bugs, rerun them alone under the lock. If they pass alone, it was load: fix the test or the worker count. If they still fail, they go in `KNOWN-ISSUES.md` as expected failures.
- **Interlanguage links** on the QA page point to external Wikipedia hosts. Tests must not load those hosts: intercept the navigation (for example `page.route`) and assert on the requested URL and language. That counts as "goes to that language's article".
- **Gemini seats** can't start Chrome in their sandbox. They take source reading, reviews, FEATURES.md and KNOWN-ISSUES.md checks and test code that a Claude seat runs; their PRs say "not run" and name the seat that ran it.
- **Freeze at 11:20.** After 11:20 no new feature PRs. Seat 5 (challenger) runs the final pair of full runs on `main`, alone under the lock, and posts both summaries and run times in one PR that ticks the "One command" and "Stable" lines. If seat 5 is down, seat 1 does it. Other seats only review and fix what those runs show.
- **Check-in and retro:** reuse `Check-in` (#29). Seat 1 opens `Retro — round 2`; every seat posts a round-2 retro there.
- Write budget: `writes_per_event` is now 300 and counts round 1 writes too.

## Owner update: round 3, patch compare (14:00–17:00, Sunday 2026-11-08)
Rounds 1–2 met every line above (final runs: #58 and `docs/final-runs.md`; retro: Discussion #59). Round 3 adds one new goal to the same suite. The owner reviews ULS patches by checking them out on the agent wiki and comparing by hand. The suite already answers "what passes"; now it should also answer "what changed between two versions of the code".

**What you can and can't switch.** The ULS code on the wiki is the owner's checkout. Agents never change it (rules below). For a real before/after inside this event, use the wiki's QA cookies: same code, old and new language selector. `qa_t439715=old` turns the new selector off for Timeless, `qa_t439718=old` for MonoBook and Vector legacy, `qa_t439851=old` for Modern and Cologne Blue (owner checked: with `qa_t439715=old` Timeless gets `wgULSLanguageSelectorV2Enabled: false`). Vector 2022 and Minerva don't change. For a real Gerrit patch, the owner switches the checkout after the event and runs the same commands.

### Done when (round 3)
- [ ] **Saved runs.** `ULS_RUN=<name> npm test` (subset filters still work) saves the run in `runs/<name>/` (in `.gitignore`): one machine-readable results file with, per test, the row (skin, device, user), feature group, title, outcome (the summary reporter's kinds: pass, FAIL, xfail, n/a, skip), whether it passed only after a re-login or retry, and the first error line; plus the run info (ULS commit, core commit, the suite's own commit and whether the clone had local changes, skins, wiki, QA cookies, filters, start time, run time) and the coverage table. Without `ULS_RUN` the run works as today and is not slower.
- [ ] **QA cookies.** `ULS_COOKIES='qa_t439715=old;qa_t439718=old'` sets those cookies on the wiki host for every page the suite opens, anonymous and logged in, and the run info records them.
- [ ] **Compare.** `npm run compare -- <before> <after>` prints a summary and writes `compare/<before>-vs-<after>/` (in `.gitignore`) with `index.html`, `summary.md` and `phab-draft.txt`. It shows: new failures (pass → FAIL), fixed rows (FAIL → pass), known issues that now pass (name the KI), rows still failing, tests added or removed, n/a changes, and rows that passed only after a re-login or retry, counted apart. It exits non-zero when there are new failures. At the top it warns when the suite commits differ (a test change, not a code change), when the filters differ (rows in only one run are "not compared", not "removed"), and when ULS, core and cookies are all the same ("no code change between these runs").
- [ ] **Screenshots side by side.** With `ULS_SHOTS=1` the suite saves one screenshot of the open selector per row (skin × device × user) in the saved run. The compare page shows before and after next to each other for every row that changed. Off by default, so the normal full run stays under 15 minutes.
- [ ] **Phabricator draft.** `phab-draft.txt` in Remarkup, ready for the owner to paste: what was compared (two ULS commits, or the cookies), counts per category, a table of the changed rows, and where the screenshots are. Plain language a product manager can read (`SKILLS/de-ai/`). Nothing is posted or uploaded anywhere.
- [ ] **Proof in `docs/DONE.md`**, every full run under the `matrix` lock:
  1. No-change pair: two full runs on the same code and cookies. Expect 0 changes; name and fix any flaky row.
  2. Cookie pair: a full run with no cookies against a full run with `qa_t439715=old;qa_t439718=old;qa_t439851=old`, with `ULS_SHOTS=1`. The changes appear on the five skins the cookies affect and are explained; any change on Vector 2022 or Minerva is explained too.
  3. Compare can fail: a copy of a saved run with one row edited from pass to FAIL gives exit code 1 and the row at the top.
  Post the compare summaries, the run times and the commands.
- [ ] `README.md` has a "Compare two versions" section with the owner's steps for a real patch: `ULS_RUN=before ULS_SHOTS=1 npm test`, check out the patch on the wiki, `ULS_RUN=after ULS_SHOTS=1 npm test`, `npm run compare -- before after`.
- [ ] Every agent signs off in `Check-in — round 3` and posts a retro in `Retro — round 3`.

### Round 3 rules (from retro #59; also in `SKILLS/ai-hackathon/`)
- Seat 1 opens `Kickoff — round 3` (who does what), `Check-in — round 3` and `Retro — round 3`.
- **Shared contract first:** one early PR fixes the saved-run folder layout and the results file format (the fields above). Compare, screenshots and the draft build on it. After it merges, change it only by a `DECISION:`.
- Full runs go through `SKILLS/background-run/` with the lock name `matrix` in the run folder (`/Users/hueitan/projects/ai-hackathon/runs/ai-hackathon-only__uls-ui-tests`). One full run at a time.
- **Gemini seats (2 and 4) are `browser: no`.** They write code that works on saved results files (compare, HTML page, Phabricator draft, README) and test it on small fixture files committed under `tests/fixtures/`. When a real run is needed they post a `RUN REQUEST` with the exact command, and a browser seat runs it and posts the output.
- Seat 5 (challenger) has reviewer rights and can't push. It runs the proof pairs; seat 1 commits `docs/DONE.md` from its output.
- **Freeze at 16:15.** After it no new feature PRs, only the proof runs and fixes for what they show.
- Agents never edit `GOALS.md`. The evidence for each line goes in `docs/DONE.md`.
- "Same result" means every row has the same outcome kind (pass, FAIL, xfail, n/a, skip) in both runs.
- When a seat is down (usage limit), its `backup` in the yaml below signs off for it and writes its retro note.
- At most 2 open feature PRs at once, counting PRs already open.
- Stay off the wiki's code: the earlier rules still apply (no docker, no git or file changes under `mediawiki-agents`, read `LocalSettings.php` only).
- Write budget: `writes_per_event` stays 300 and counts rounds 1 and 2.

### Stretch (round 3, only after every round-3 line is done)
1. `npm run compare -- --gerrit <change> <before> <after>`: read the Gerrit REST API (read-only, no login) and name the change and patch set whose commit matches the after run's ULS commit in the draft.
2. A pixel-difference percentage per changed screenshot pair, with a threshold.

## The test wiki and the machine (read this before you run anything)
- Wiki: the owner's local **agent wiki**, `http://en.mediawiki-agents.mwdd.localhost:8081` (scripts at `/w/index.php`, pages at `/wiki/<title>`), on this Mac. It already has ULS, MobileFrontend and all seven skins.
- Credentials: the file `/Users/hueitan/projects/ai-hackathon/runs/ai-hackathon-only__uls-ui-tests/wiki.env` sets `ULS_WIKI`, `ULS_USERS` (8 test accounts, `UlsTest1`…`UlsTest8`) and `ULS_PASSWORD`. The suite reads these environment variables. **Never commit this file or the password, and never paste it in a post.** Use a different account per parallel worker so preference changes don't collide. **Owner update 00:25: each seat uses its own accounts.** Seat N loads `/Users/hueitan/projects/ai-hackathon/runs/ai-hackathon-only__uls-ui-tests/wiki-seat<N>.env` (6 accounts `UlsSeat<N>w1`…`UlsSeat<N>w6`, same variables), so runs by two seats at the same time never share a user. `wiki.env` (`UlsTest1`…`UlsTest8`) is for the owner's runs. The suite must take the account list from `ULS_USERS` and run at most as many logged-in workers as there are accounts.
- **Use the wiki only through a browser or its web API, as the test accounts.** Never run `docker`, restart anything, run maintenance scripts, edit `LocalSettings.php`, or run git or change files under `/Users/hueitan/Desktop/mediawiki-agents` (reading the ULS source there is fine). If the wiki is down or you need a config change, open an `ask-human` issue.
- **Never use port 8080 and never a public wiki** (Wikipedia, beta cluster, test.wikipedia). The suite's base-URL check must refuse any URL that is not `*.localhost` or `127.0.0.1` unless `ULS_ALLOW_REMOTE=1` is set, and must always refuse `:8080`. Don't create pages; the suite may only change the test accounts' own preferences.
- Gemini seats (agy sandbox): the sandbox sets `HTTP_PROXY`, and the proxy answers 403 for the local wiki. Bypass it for local addresses: `curl --noproxy '*'`, and launch Chrome with `--no-proxy-server` (or `NO_PROXY=localhost,127.0.0.1,.localhost`). Tested by the owner: `curl --noproxy '*'` gets 200 from the wiki inside the sandbox. If Chrome still can't reach it, say so in Kickoff and take work that doesn't need the wiki (feature inventory from source, report and coverage code, README, reviews); a Claude seat runs the suite and posts the output.

## Constraints
- Toolchain (fixed; don't let each seat pick its own): Node 24, `@playwright/test`, the installed Google Chrome (`channel: 'chrome'`, `chromiumSandbox: true`), `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` (no bundled browsers). See `SKILLS/browser-check/`. `node_modules/`, `test-results/` and reports go in `.gitignore`; a few small PNGs for `KNOWN-ISSUES.md` may be committed under `docs/`.
- **Shared contract first:** one early PR sets the folder layout, the matrix config, the login helper, the base-URL check, the console-error collector and the test naming. After it merges, change these only by a `DECISION:`.
- **Evidence for every PR:** the exact command you ran, the summary table (or the part your PR touches) and the run time. For new tests, show that the test can fail (for example, break the selector name locally and paste the failure), so we know it checks something. "Should work" is not evidence; write "not run" if you could not run it.
- Challenge rule: seat 5 is the challenger (`SKILLS/challenger/SKILL.md`). A PR may not merge while it has an open challenger question; answer with evidence. If the challenger has not replied within **15 minutes** of your answer (comment timestamps), you may merge. The challenger cannot veto. If the challenger seat is down (usage limit), the reviewer of the other AI family does its checks.
- Must not: add CI or workflows, post outside this repo, put real people's data in tests or screenshots (use the test accounts and the QA page), commit secrets.

## Stretch from rounds 1–2 (after the round-3 stretch; claim items in `Stretch`)
1. The old selector and the `personal` ULS position as extra matrix rows, using the wiki's QA cookies (`qa_t439715=old` for Timeless, `qa_t439718=old` for MonoBook and Vector legacy, `qa_t439851=old` or `personal` for Modern and Cologne Blue). Read `LocalSettings.php` to see what each does; don't edit it.
2. Screenshot comparison of the open selector per skin × device against baselines committed by the suite (with a threshold), so layout changes show up.
3. Run the suite against the German and French agent wikis (`de.`, `fr.` hosts) with one setting.
4. Accessibility scan of the open selector (axe-core from npm) with the results in the report.

```yaml
ai-hackathon:
  repo: ai-hackathon-only/uls-ui-tests
  owner: hueitan            # the human who is responsible
  start: 2026-11-08T14:00+01:00
  end:   2026-11-08T17:00+01:00
  freeze: 2026-11-08T16:15+01:00 # no new feature PRs after this
  round_minutes: 5                # how often each agent wakes up
  when_done_early: stretch          # stop | stretch | polish-until-end
  seats:                          # identities = GitHub Apps; roles are chosen by the agents
    # agent: claude (Claude Code, Anthropic) | agy (Antigravity CLI, Google Gemini). Keep in sync with "AI agents" above.
    # backup: the seat that signs off + writes the retro if this one is down. browser: can it start Chrome? (agy: no)
    - { seat: 1, app: aho-builder-1,  agent: claude, model: claude-opus-5-5,       perms: builder,  backup: 3, browser: yes }
    - { seat: 2, app: aho-builder-2,  agent: agy,    model: gemini-4-argon-medium, perms: builder,  backup: 4, browser: no }
    - { seat: 3, app: aho-reviewer-1, agent: claude, model: claude-sonnet-5-5,     perms: reviewer, backup: 1, browser: yes }
    - { seat: 4, app: aho-reviewer-2, agent: agy,    model: gemini-4-argon-medium, perms: builder,  backup: 2, browser: no }
    - { seat: 5, app: aho-challenger, agent: claude, model: claude-sonnet-5-5,     perms: reviewer, backup: 3, browser: yes }
  budget:                         # may only be stricter than the skill defaults
    writes_per_round: 6
    writes_per_hour: 40
    writes_per_event: 300
  local_runs_allowed: true        # may agents run the code locally to check it?
```
