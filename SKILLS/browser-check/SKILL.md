---
name: browser-check
description: Drive a real Chrome headless with Playwright on this Mac to click, type and read a page, collect console errors and failed requests, and emulate tablet/mobile. Use for any UI evidence or browser test instead of writing your own CDP script.
---

# browser-check

All five seats asked for this in the zoo-assets round-2 retro (each seat wrote its own CDP script, so evidence could not be compared). It was used for the whole uls-ui-tests event. Use this setup. Improve it by PR if something is missing.

## Setup (once per clone)
```sh
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install -D @playwright/test
```
Never run `npx playwright install`: we use the installed Google Chrome, not a downloaded browser.

## Launch settings (playwright.config)
- `use: { channel: 'chrome', headless: true, launchOptions: { chromiumSandbox: true } }`
- agy sandbox only (Chrome does not start there in practice, so agy seats are `browser: no`; this line is for curl-like checks): add `args: ['--no-proxy-server']` to `launchOptions` (the sandbox's HTTP proxy returns 403 for local hosts). For curl use `--noproxy '*'`.
- Local servers you start yourself bind `127.0.0.1`, never `localhost` or `::`.
- Device presets: start from Playwright's `devices` list (e.g. an iPad and an iPhone preset) and set the viewport sizes from GOALS.md, so the user agent, touch and device scale factor come with them. Desktop: no `isMobile`, no touch.

## Patterns
- **Safe base URL.** Before any navigation, parse the URL. Refuse port 8080 always. Refuse hosts that are not `*.localhost` or `127.0.0.1` unless `ULS_ALLOW_REMOTE=1`. Fail the run with a clear message, don't skip.
- **Console errors and failed requests.** Attach `page.on('console')` (type `error`), `page.on('pageerror')` and `page.on('response')` (status ≥ 400) before the first `goto`. Store them per test and assert at the end of the test, with an allow-list for known entries that names its `KNOWN-ISSUES.md` line.
- **Login once per worker (MediaWiki).** Log in with a storage-state file per account (`testInfo.parallelIndex` picks the account from the users env file named in GOALS.md), so each worker has its own user and the login page isn't hit for every test. Login form: `/w/index.php?title=Special:UserLogin`, fields `#wpName1`, `#wpPassword1`, button `#wpLoginAttempt`. Check `mw.config.get('wgUserName')` afterwards.
- **Wait for the thing, not for time.** Use locators with auto-wait (`await expect(locator).toBeVisible()`), never `waitForTimeout`. Lazy-loaded UI (e.g. a dialog): wait for its element after the click, not for `networkidle`.
- **Re-login is not a pass.** If a test had to log in again because the session dropped, tag it (e.g. `testInfo.annotations.push({type: "relogin"})`) and count those rows apart from clean passes in the summary.
- **Put preferences back.** A test that changes a preference restores it in `afterEach` (UI or `action=options` API with the user's token), even when the test failed.
- **Prove a test can fail.** Before you post, break the thing it checks (wrong selector, wrong expected text) and paste the failure line.
- **Screenshots** go to `test-results/`; only images used in `KNOWN-ISSUES.md` are committed (under `docs/`, small PNGs).
- **Timing.** Give wall-clock time of the full command and name the machine (MacBook Pro M2 Max, 64 GB). Runs longer than about 8 minutes go through `SKILLS/background-run/`.

## Quick one-off check (no test file)
`hk-shot <url> [width] [height]` takes a screenshot. That only shows how the page looks; it does not prove that anything works.

Written by the owner with Claude Code before the start (from the zoo-assets round-2 retro).
