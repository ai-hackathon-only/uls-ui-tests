# GOALS — uls-ui-tests (one command that UI-tests the Universal Language Selector)

> 🤖 **This repository is a fully AI-run hackathon.** Every issue, pull request, comment, review, discussion and commit here was written by AI agents acting through GitHub Apps (accounts ending in `[bot]`). No human writes code or text here. The AI tools and models used are listed under **AI agents** below. Before the start the owner added only this GOALS.md and the `SKILLS/` folder: the skills every agent uses, beginning with the rules in `SKILLS/ai-hackathon/` (prepared by the owner with Claude Code). Skills the agents add during the event are AI-written. Responsible human / owner: @hueitan. This is an experiment in giving AI agents clear tasks. Please don't open issues or PRs here. Contributions from outside are closed during the event.

## AI agents
Which AI does the work (each agent also names its tool and model in every post and commit):
- Seat 1 — Claude Code (Anthropic), model `claude-opus-5-5`, GitHub App `aho-builder-1[bot]`
- Seat 2 — Antigravity CLI `agy` (Google), model `gemini-3.8-flash-medium`, GitHub App `aho-builder-2[bot]`
- Seat 3 — Claude Code (Anthropic), model `claude-sonnet-5-5`, GitHub App `aho-reviewer-1[bot]`
- Seat 4 — Antigravity CLI `agy` (Google), model `gemini-3.8-flash-medium`, GitHub App `aho-reviewer-2[bot]` (builder permissions; role chosen at Kickoff)
- Seat 5 — Claude Code (Anthropic), model `claude-opus-5-5`, GitHub App `aho-challenger[bot]` (role: challenger, see `SKILLS/challenger/`)
- Humans: none in the repo. @hueitan wrote this file, started the run, and can stop it.

## Goal
Build an automated **browser UI test suite** for the MediaWiki extension **UniversalLanguageSelector (ULS)**: every user-facing ULS feature, in every skin, on desktop, tablet and mobile, as an anonymous visitor and as a logged-in user. **One command runs all of it** and says what passed and what failed. These are end-to-end tests that click, type and read the page in a real browser. No unit tests.

The owner works on ULS and the new language selector and today checks each skin by hand. This suite should replace that.

**Owner override of the rules:** `SKILLS/ai-hackathon/` says "don't write tests". For this event the UI test suite **is the product**, so write it. The CI ban still applies: no Actions, no workflows; the suite is run by hand.

## Done when
- [ ] **One command.** From a fresh clone on the test machine: `npm install` once, then **one command** (`npm test`, or a script it calls) runs the whole matrix, prints a pass/fail table (rows: skin × device × user; columns: feature groups), writes an HTML report, and exits non-zero if anything unexpected failed. The full run takes **15 minutes or less** on the test machine (MacBook Pro, Apple M2 Max, 64 GB; give the measured time). Options to run a subset (one skin, one device, one feature, anon or logged-in) exist and are in the README.
- [ ] **Stable.** Two full runs in a row give the same pass/fail list (post both summaries in the PR that claims this line). A test that passes only sometimes is fixed or removed, never retried until green.
- [ ] **The matrix**, all of it, at the wiki's current config:
  - Skins: Vector 2022 (`vector-2022`), Vector legacy (`vector`), MonoBook (`monobook`), Timeless (`timeless`), Modern (`modern`), Cologne Blue (`cologneblue`), and Minerva (`minerva`, mobile view via MobileFrontend `useformat=mobile`).
  - Devices: desktop 1280 × 800; tablet 820 × 1180 (touch); mobile 390 × 844 (touch, mobile user agent). Every desktop skin runs at all three sizes; Minerva runs at mobile and tablet.
  - Users: anonymous, and logged in (test accounts below).
  - Decide the exact device presets, how the skin is chosen (`useskin=` or preference) and how Minerva is reached in a `Decision: matrix` discussion **before** writing feature tests.
- [ ] **The feature list comes first:** `FEATURES.md` lists every user-facing ULS feature, found by reading the ULS source (read-only: `/Users/hueitan/Desktop/mediawiki-agents/extensions/UniversalLanguageSelector`, or the public repo https://gerrit.wikimedia.org/r/mediawiki/extensions/UniversalLanguageSelector) and by using the wiki, with where it appears per skin and which test covers it. The challenger questions it before most tests are written. At least these:
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
- [ ] **Coverage table:** `COVERAGE.md` (generated by the suite, not by hand) shows, for every skin × device × user, which features were tested and the result. Features a skin does not offer are marked "n/a" with the reason, not left blank.
- [ ] **Real bugs stay visible.** When a test finds a real ULS bug, keep the test and mark it as an expected failure that names its entry in `KNOWN-ISSUES.md` (skin, device, user, steps, expected vs actual, a screenshot, and the ULS and core commits from `Special:Version`). Never weaken an assertion to turn a test green. Report bugs only in this repo; don't post anywhere else (no Phabricator, no Gerrit).
- [ ] **Every run records what it tested:** the ULS commit, the MediaWiki core commit and the skin list, read from `Special:Version` at the start of each run, at the top of the report. ULS on this wiki is on a work-in-progress patch, so the results describe that code, not ULS master.
- [ ] `README.md`: what this is, how to run it (the one command and the subset options), how to add a test for a new feature or skin, how to point it at another wiki (environment variables), and how to read the report; plain language per `SKILLS/de-ai/`. Licence GPL-2.0-or-later (same as ULS), stated in README and a `LICENSE` file.
- [ ] Every agent signed off in `Check-in` and posted its retro in `Retro`.

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

## Stretch (only when every line above is done; claim items in `Stretch`)
1. The old selector and the `personal` ULS position as extra matrix rows, using the wiki's QA cookies (`qa_t439715=old` for Timeless, `qa_t439718=old` for MonoBook and Vector legacy, `qa_t439851=old` or `personal` for Modern and Cologne Blue). Read `LocalSettings.php` to see what each does; don't edit it.
2. Screenshot comparison of the open selector per skin × device against baselines committed by the suite (with a threshold), so layout changes show up.
3. Run the suite against the German and French agent wikis (`de.`, `fr.` hosts) with one setting.
4. Accessibility scan of the open selector (axe-core from npm) with the results in the report.

```yaml
ai-hackathon:
  repo: ai-hackathon-only/uls-ui-tests
  owner: hueitan            # the human who is responsible
  start: 2026-11-08T08:20+01:00
  end:   2026-11-08T12:20+01:00
  round_minutes: 5                # how often each agent wakes up
  when_done_early: stretch          # stop | stretch | polish-until-end
  seats:                          # identities = GitHub Apps; roles are chosen by the agents
    # agent: claude (Claude Code, Anthropic) | agy (Antigravity CLI, Google Gemini). Keep in sync with "AI agents" above.
    - { seat: 1, app: aho-builder-1,  agent: claude, model: claude-opus-5-5,        perms: builder }
    - { seat: 2, app: aho-builder-2,  agent: agy,    model: gemini-3.8-flash-medium, perms: builder }
    - { seat: 3, app: aho-reviewer-1, agent: claude, model: claude-sonnet-5-5,      perms: reviewer }
    - { seat: 4, app: aho-reviewer-2, agent: agy,    model: gemini-3.8-flash-medium, perms: builder }
    - { seat: 5, app: aho-challenger, agent: claude, model: claude-opus-5-5,        perms: reviewer }
  budget:                         # may only be stricter than the skill defaults
    writes_per_round: 6
    writes_per_hour: 40
    writes_per_event: 300
  local_runs_allowed: true        # may agents run the code locally to check it?
```
