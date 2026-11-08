# Known issues

Each entry has an id (`KI-<n>`) used by `test.fail()` annotations and by
`tests/support/known-errors.js`. Entries for ULS bugs give skin, device, user,
steps, expected vs actual, a screenshot under `docs/`, and the ULS and core
commits from `Special:Version`.

## KI-0
Not a ULS bug. The test wiki has no `/favicon.ico` (404), and Chrome logs
"Failed to load resource: 404" on every page. Allow-listed in
`tests/support/known-errors.js` by its URL only.

## KI-1
**Cologne Blue has no ULS language button.**

- Skin: Cologne Blue (`cologneblue`). Devices: desktop, tablet, mobile. Users: anonymous and logged in (all six rows).
- Steps: open `/w/index.php?title=QA_ULS_search_codes&useskin=cologneblue&useformat=desktop`, look for the language button.
- Expected: a ULS language button, as in the other desktop skins. The wiki lists Cologne Blue in
  `$wgULSLanguageSelectorV2SupportedSkins` (`LocalSettings.php:497`).
- Actual: no button. `mw.loader.getState( 'ext.uls.rewrite.entrypoints' )` stays `registered` (never loads),
  there is no `#p-lang`, `#p-lang-btn`, `.mw-interlanguage-selector`, `.uls-trigger` or `.uls-settings-trigger`.
  The page shows only the plain "In other languages" links (24 `.interlanguage-link`, each list shown twice).
- Also with the QA cookie `qa_t439851=personal` (`wgULSPosition` = `personal`) and `=old`: no `#pt-uls`, no
  `.uls-settings-trigger` (browser count 0 after `networkidle`, anon desktop), so the `settings` group is
  covered too.
- Likely cause (seat 5's source read): Cologne Blue puts its language list in `#langlinks`, but ULS looks only
  for `.mw-portlet-lang, #p-lang` (`ext.uls.interface.js:1024`) and `#p-lang-btn` (`:64`). So the WIP patch
  lists the skin as supported without handling its markup.
- Screenshot: [docs/ki-1-cologneblue-desktop-anon.png](docs/ki-1-cologneblue-desktop-anon.png) (desktop, anon).
- Found on: ULS `2b186dc023e278d88bf91d4713ae021ce2306515` (13:54, 6 November 2026),
  MediaWiki core 1.48.0-alpha `f7d0709ef0c28166422137c3167b0a992b999afd`.
- In the suite: `tests/support/known-issues.js` marks the trigger-based groups (open, search,
  interlanguage, suggested, settings, keyboard, rtl, small-screen) on Cologne Blue rows as expected failures.

## KI-2
Not a ULS bug. MediaWiki's EventLogging / WikimediaEvents sends telemetry to
`http://localhost:8192/v1/events` (EventGate), which is not running on the local
development wiki, resulting in `net::ERR_CONNECTION_REFUSED [http://localhost:8192/v1/events]`.
Allow-listed in `tests/support/known-errors.js`.

## KI-3
**Focus is not restored to the language trigger upon selector dismissal in legacy skins.**

- Skins: `vector`, `monobook`, `timeless`, `modern`. Devices: desktop, tablet. Users: anonymous and logged in.
- Steps:
  1. Open page `QA ULS search codes` with a legacy skin (`useskin=vector`, `monobook`, `timeless`, or `modern`).
  2. Click the language trigger (`button.mw-interlanguage-selector`).
  3. Close the selector dialog via Esc key or close button (`.uls-icon-close` / `.ui-dialog-titlebar-close`).
  4. Inspect `document.activeElement`.
- Expected: Focus is restored to `button.mw-interlanguage-selector` that opened the dialog.
- Actual: Focus is not restored to the trigger element (active element remains on an internal button or body).
- Likely cause: Legacy ULS popup / jQuery UI dialog implementation does not cache the active trigger before open or invoke `.focus()` on dismissal.
- Found on: ULS `2b186dc023e278d88bf91d4713ae021ce2306515`, MediaWiki core 1.48.0-alpha `f7d0709ef0c28166422137c3167b0a992b999afd`.
- In the suite: Marked with `test.fail( true, 'KI-3: Focus is not restored to trigger on dialog dismiss in legacy skins' )` in `tests/open.spec.js`.

## KI-4
**Timeless hides language selector trigger in collapsed navigation on viewports narrower than 851px.**

- Skins: `timeless`. Devices: tablet (820px), mobile (390px). Users: anonymous and logged in.
- Steps:
  1. Open page `QA ULS search codes` with Timeless (`useskin=timeless`) at viewport width < 851px.
  2. Inspect the visibility of `#p-lang` / `#other-languages`.
- Expected: A visible language selector trigger is directly accessible on the screen.
- Actual: Timeless CSS applies `@media (max-width: 850px) { #other-languages { display: none; } }`, hiding the language trigger portlet unless the user opens the slide-out navigation drawer.
- Found on: ULS `2b186dc023e278d88bf91d4713ae021ce2306515`, MediaWiki core 1.48.0-alpha `f7d0709ef0c28166422137c3167b0a992b999afd`.
- In the suite: Marked with `test.fail( true, 'KI-4: Timeless hides language portlet on viewports narrower than 851px' )` in `tests/open.spec.js`.
