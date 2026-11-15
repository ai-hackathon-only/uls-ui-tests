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
- Still there (round 4, 2026-11-15): yes. `Special:Version` shows ULS `2b186dc0`, core `f7d0709`
  (17:22, 6 November 2026), Cologne Blue `6d46c5f`: the same code as above.

### Root cause (KI-1)
1. ULS builds the language button only after it finds the skin's language list by the class
   `mw-portlet-lang` or the id `p-lang`. Cologne Blue wraps its list in `<div id="langlinks">` with
   neither, so ULS finds nothing, stops quietly, and never loads the entry point.
2. Code:
   - ULS `resources/js/ext.uls.compactlinks.js:356`:
     `document.querySelector( '.mw-portlet-lang ul, #p-lang ul' )` returns `null`, and `:357-360`
     returns early ("Not all namespaces will have a list of languages").
   - Cologne Blue `templates/skin.mustache:9`: `<div id="langlinks">{{#data-portlets.data-languages}}…`
     (no `mw-portlet-lang` class, no `#p-lang`).
   - The same lookup is in ULS `ext.uls.interface.js:360` (`$( '#p-lang' )`) and `:1026`
     (`.mw-portlet-lang, #p-lang`).
3. Live proof (MCP, seat 1, `…/w/index.php?title=QA_ULS_search_codes&useskin=cologneblue&useformat=desktop`,
   `evaluate_script` after 2.5 s): desktop 1280×800 anon gives
   `{"skin":"cologneblue","v2":true,"entry":"registered","compact":"ready","plang":false,"portlet":false,"langlinks":true,"triggers":0,"links":24}`.
   Tablet 820×1180 and mobile 390×844 (touch), anon and logged in as `UlsSeat1w1`: `"entry":"registered","triggers":0`.
4. Whose code: the skin's markup and ULS's lookup together. The WIP patch lists Cologne Blue in
   `$wgULSLanguageSelectorV2SupportedSkins`, but the lookup is older than the patch (see 5).
5. Old selector: with `qa_t439851=old` (`"v2":false`), desktop anon gives `"triggers":0` too, and
   compact links are `ready` with no button. The new selector did not bring this in.

### Fix (KI-1)
[`docs/fixes/KI-1.diff`](docs/fixes/KI-1.diff): one line in Cologne Blue `templates/skin.mustache:9`,
`<div id="langlinks" class="mw-portlet-lang">`. Checked with `git apply --check` on a copy of the skin.
Applied live with an MCP `initScript` that adds the class to `#langlinks` before ULS runs, then the same
check, then a click on the button:

| Row (viewport, user, selector) | Before | With fix |
|---|---|---|
| desktop 1280×800, anon, new | 0 triggers | 1 (`5 more`, box 1121,49 71×32), opens `div.uls-rewrite` |
| desktop 1280×800, logged in, new | not rerun | 1 (box 1201,49 71×32), opens `div.uls-rewrite` |
| tablet 820×1180 touch, anon, new | 0 | 1 (box 1041,49 71×32), opens `div.uls-rewrite` |
| tablet 820×1180 touch, logged in, new | 0 | 1 (box 1041,49 71×32), opens `div.uls-rewrite` |
| mobile 390×844 touch, anon, new | 0 | 1 (box 1041,49 71×32), opens `div.uls-rewrite` |
| mobile 390×844 touch, logged in, new | not rerun | 1, opens `div.uls-rewrite`, cog button present |
| desktop 1280×800, anon, old (`qa_t439851=old`) | 0 | 1 (`5 more`), opens `.uls-menu.interlanguage-uls-menu` |

Cologne Blue has no mobile viewport tag, so the page lays out at 1120 px on tablet and mobile
(`innerWidth` 1120); that is the skin's own behaviour and the fix does not change it. A ULS-side fix
(add `#langlinks ul` to the lookups above) would also work but was not tested live.
The expected-failure marks stay: the wiki code has not changed.

## KI-2
Not a ULS bug. MediaWiki's EventLogging / WikimediaEvents sends telemetry to
`http://localhost:8192/v1/events` (EventGate), which is not running on the local
development wiki, resulting in `net::ERR_CONNECTION_REFUSED [http://localhost:8192/v1/events]`.
Allow-listed in `tests/support/known-errors.js`.

## KI-4
**Timeless hides language selector trigger in collapsed navigation on viewports narrower than 851px.**

- Skins: `timeless`. Devices: tablet (820px), mobile (390px). Users: anonymous and logged in.
- Steps:
  1. Open page `QA ULS search codes` with Timeless (`useskin=timeless`) at viewport width < 851px.
  2. Inspect the visibility of `#p-lang` / `#other-languages`.
- Expected: A visible language selector trigger is directly accessible on the screen.
- Actual: Timeless CSS applies `@media (max-width: 850px) { #other-languages { display: none; } }`, hiding the language trigger portlet unless the user opens the slide-out navigation drawer.
- Screenshot: [docs/ki-4-timeless-tablet-anon.png](docs/ki-4-timeless-tablet-anon.png) (tablet 820 × 1180, anon): no language button in the header or page tools.
- Found on: ULS `2b186dc023e278d88bf91d4713ae021ce2306515`, MediaWiki core 1.48.0-alpha `f7d0709ef0c28166422137c3167b0a992b999afd`.
- In the suite: `tests/support/known-issues.js` marks trigger-based feature groups on Timeless tablet and mobile rows as expected failures.

## KI-5
**MonoBook fixed sidebar navigation overlaps and intercepts language trigger on mobile viewports.**

- Skins: `monobook`. Devices: mobile (390px). Users: anonymous and logged in.
- Steps:
  1. Open page `QA ULS search codes` with MonoBook (`useskin=monobook`) on a mobile viewport (390 × 844).
  2. Locate language trigger (`button.mw-interlanguage-selector`).
  3. Attempt to click trigger.
- Expected: Trigger is actionable and opens the language selector.
- Actual: MonoBook's fixed-position desktop sidebar navigation (`#column-one`, `#p-navigation`) overlaps `#p-lang`, intercepting pointer events.
- Screenshot: [docs/ki-5-monobook-mobile-anon.png](docs/ki-5-monobook-mobile-anon.png) (mobile 390 × 844, anon). Measured 09:55: the trigger box is at x = -39, y = 328 (76 × 32, half off-screen), and `document.elementFromPoint` at its centre returns `#p-navigation .pBody`.
- Found on: ULS `2b186dc023e278d88bf91d4713ae021ce2306515`, MediaWiki core 1.48.0-alpha `f7d0709ef0c28166422137c3167b0a992b999afd`.
- In the suite: `tests/support/known-issues.js` marks trigger-based feature groups on MonoBook mobile rows as expected failures.

## KI-6
**Timeless skin stylesheet overrides ULS search input direction to LTR in RTL mode.**

- Skins: `timeless`. Devices: desktop (also tablet and mobile, masked by KI-4). Users: anonymous and logged in.
- Steps:
  1. Open page `QA ULS search codes` with Timeless (`useskin=timeless`) in an RTL interface language (`uselang=ar`).
  2. Open ULS selector dialog (`button.mw-interlanguage-selector`).
  3. Inspect computed direction of search input (`input.uls-languagefilter`).
- Expected: Search input computes to `direction: rtl` matching the mirrored RTL dialog.
- Actual: Timeless skin form input styles override inheritance with `direction: ltr`, causing the search input to remain LTR in RTL mode.
- Screenshot: [docs/ki-6-timeless-desktop-anon-rtl.png](docs/ki-6-timeless-desktop-anon-rtl.png) (desktop, anon, `uselang=ar`). Measured 09:52: dialog `direction` = `rtl`, search input `direction` = `ltr`.
- Found on: ULS `2b186dc023e278d88bf91d4713ae021ce2306515`, MediaWiki core 1.48.0-alpha `f7d0709ef0c28166422137c3167b0a992b999afd`.
- In the suite: `tests/support/known-issues.js` marks the `rtl` feature group on Timeless desktop rows as an expected failure.
