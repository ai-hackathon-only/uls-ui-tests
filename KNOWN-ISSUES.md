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
   - The same lookup is in ULS `ext.uls.interface.js:360` (`$( '#p-lang' )`) and `:1028`
     (`.mw-portlet-lang, #p-lang`).
3. Live proof (MCP, seat 1, `…/w/index.php?title=QA_ULS_search_codes&useskin=cologneblue&useformat=desktop`,
   `evaluate_script` after 2.5 s): desktop 1280×800 anon gives
   `{"skin":"cologneblue","v2":true,"entry":"registered","compact":"ready","plang":false,"portlet":false,"langlinks":true,"triggers":0,"links":24}`.
   Tablet 820×1180 and mobile 390×844 (touch), anon and logged in as `UlsSeat1w1`: `"entry":"registered","triggers":0`.
   Desktop logged in (12:10): `{"w":1200,"user":"UlsSeat1w1","skin":"cologneblue","v2":true,"entry":"registered","langlinks":true,"portlet":false,"triggers":0}`;
   mobile logged in: same with `"w":1120`. Triggers = `.mw-interlanguage-selector, .uls-rewrite-trigger, [data-uls-rewrite-trigger]`.
4. Whose code: the skin's markup and ULS's lookup together. The WIP patch lists Cologne Blue in
   `$wgULSLanguageSelectorV2SupportedSkins`, but the lookup is older than the patch: `git log -S` puts `#p-lang ul` in 2014 (`b8517a2a1`), line 356 last changed 2024-11-06 (`ed2609507`), before the WIP commit `2b186dc0` (2026-11-04) (see 5).
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
| desktop 1280×800, logged in, new | 0 | 1 (box 1201,49 71×32), opens `div.uls-rewrite` |
| tablet 820×1180 touch, anon, new | 0 | 1 (box 1041,49 71×32), opens `div.uls-rewrite` |
| tablet 820×1180 touch, logged in, new | 0 | 1 (box 1041,49 71×32), opens `div.uls-rewrite` |
| mobile 390×844 touch, anon, new | 0 | 1 (box 1041,49 71×32), opens `div.uls-rewrite` |
| mobile 390×844 touch, logged in, new | 0 | 1, opens `div.uls-rewrite`, cog button present |
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
- Still there (round 4, 2026-11-15): yes (`Special:Version`: core `f7d0709`, Timeless `5bbbfd0`, ULS `2b186dc0`).

### Root cause (KI-4: Timeless narrow keyboard/AT access & collapsed trigger)
1. At viewport widths `<= 850px`, Timeless intentionally collapses `#other-languages .sidebar-inner` (`display: none`) behind the header `#ca-languages` ("Languages") dropdown toggle; tapping or clicking `#ca-languages` reveals `#p-lang button.mw-interlanguage-selector` and opens `div.uls-rewrite`. The actual Timeless skin defect is keyboard/AT access: `#ca-languages` is rendered as `<li class="dropdown-toggle"><span>Languages</span></li>` with `tabIndex: -1`, no `role`, and only a `click` handler, so keyboard users cannot open it. The suite's direct-trigger tests still fail on Timeless tablet/mobile rows because they expect `button.mw-interlanguage-selector` to be visible without opening `#ca-languages` first; updating the suite to open `#ca-languages` first belongs in a separate test PR (out of scope for this root-cause PR, so `xfail` marks stay for now).
2. Code:
   - Timeless `resources/screen-mobile.less:52-54` (loaded via `skin.json:113-114` with `media: "screen and (max-width: 850px)"`): `.sidebar-inner, .dropdown { display: none; }` hides `#other-languages .sidebar-inner` (rendered by `includes/TimelessTemplate.php:1123-1128`).
   - Timeless `includes/TimelessTemplate.php:883-887`: `$pileOfTools['languages']` has no `'href'`, producing `<li><span>Languages</span></li>` (`tabIndex: -1`, `role: null`).
   - Timeless `resources/mobile.js:30-35`: binds only `click` on `$( '#ca-languages' )` to `fadeToggle` `#other-languages .sidebar-inner`.
3. Live proof (MCP, seat 1, `…/w/index.php?title=QA_ULS_search_codes&useskin=timeless`, `evaluate_script`, box = `x,y,w,h`):
   - Tablet 820×1180 touch, anon, new (`v2: true`): `{"v2":true,"siDisplay":"none","btn":[0,0,0,0],"hideRules":["@media screen and (max-width: 850px) .sidebar-inner, .dropdown"]}`; after `#ca-languages.click()`: `siDisplay "block"`, `btn [651,675,76,32]`, opens `div.uls-rewrite` `[325,715,402,314]`.
   - Mobile 390×844 touch + iPhone UA, anon, new: same `display: none`; `elementFromPoint` on `#ca-languages` = `LI#ca-languages`; after toggle `btn [221,675,76,32]`, opens `div.uls-rewrite` `[0,0,390,844]` (`scrollWidth` 390).
   - Logged in (`UlsSeat1w1`, seat 1, new): tablet `{"before":"none","toggle":{"tabIndex":-1,"role":null},"afterClick":"block","btn":[651,675,76,32],"dialog":{"vis":true,"box":[325,715,402,314]}}`; mobile `{"before":"none","toggle":{"tabIndex":-1,"role":null},"afterClick":"block","btn":[221,675,76,32],"dialog":{"vis":true,"box":[0,0,390,844]}}`.
4. Whose code: Timeless skin (`screen-mobile.less`, `TimelessTemplate.php`, `mobile.js`), not ULS and not the WIP patch.
5. Old selector: with `qa_t439715=old` (`v2: false`, seat 1, anon mobile): same `display: none` before toggle; after `#ca-languages` click → `"5 more"` → `uls-menu interlanguage-uls-menu uls-narrow` visible `[27,480,265,366]` (logged-in old selector not run). The new selector did not bring this in.

### Fix (KI-4)
[`docs/fixes/KI-4.diff`](docs/fixes/KI-4.diff): adds `role="button"`, `tabindex="0"`, and Enter/Space `keydown` handling to `#ca-languages` in Timeless `resources/mobile.js:30-35` so keyboard and assistive-tech users can open the language dropdown (preserving Timeless's collapsed header design; `display: block` on `.sidebar-inner` was rejected because it would undo the dropdown).
Applied live via MCP (`evaluate_script` + `press_key Enter`, seat 1, logged in `UlsSeat1w1`, new selector):

| Row (viewport, user, selector) | Before | With fix (`#ca-languages` focused → `Enter`) |
|---|---|---|
| tablet 820×1180 touch, logged in, new | `si: "none"`, `tabIndex: -1`, `role: null` | `si: "block"`, `btn [651,675,76,32]`, opens `div.uls-rewrite` `[325,715,402,314]` |
| mobile 390×844 touch, logged in, new | `si: "none"`, `tabIndex: -1`, `role: null` | `si: "block"`, `btn [221,675,76,32]`, opens `div.uls-rewrite` `[0,0,390,844]` |
| tablet 820×1180 touch, anon, new | `si: "none"`, `tabIndex: -1`, `role: null` | `Tab` → `ca-languages` (`:focus-visible`), `Enter` → `si: "block"`, `btn [651,675,76,32]`, opens `div.uls-rewrite` `[325,715,402,314]`, scrollWidth 820 ([run](https://github.com/ai-hackathon-only/uls-ui-tests/pull/83#issuecomment-6888841622)) |
| mobile 390×844 touch, anon, new | `si: "none"`, `tabIndex: -1`, `role: null` | `Tab` → `ca-languages` (`:focus-visible`), `Enter` → `si: "block"`, `btn [221,675,76,32]`, opens `div.uls-rewrite` `[0,0,390,844]` ([run](https://github.com/ai-hackathon-only/uls-ui-tests/pull/83#issuecomment-6888788556)) |

All four rows the issue lists pass with the fix. Anon rows: seat 1, real `press_key` events. Focus ring: Chrome's default `auto 1px rgb(0, 95, 204)` outline shows on `#ca-languages`; Timeless sets no focus style of its own. Note: even with this fix applied, the suite's current direct-trigger tests would still fail on Timeless tablet/mobile rows unless updated in a separate PR to open `#ca-languages` first; expected-failure marks stay because the wiki code has not changed.

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
- Still there (round 4, 2026-11-15): yes (`Special:Version`: core `f7d0709`, MonoBook `154734b`, ULS `2b186dc0`). Note: the earlier symptom note ("fixed sidebar overlaps") was stale—`#p-lang` is clipped off-screen by MonoBook's mobile popout CSS, not overlapped by `#p-navigation`.

### Root cause (KI-5)
1. At viewport widths `<= 550px` (`resources/skin.js.less:3` and `resources/skin.js:3`, so tablet 820px is unaffected), MonoBook hides `#p-lang` on purpose behind the mobile globe tab (`#ca-languages a`) using `.mixin-screen-reader-text()` (`clip: rect(1px, 1px, 1px, 1px)`, `1×1` px) until the user taps that tab to add `.mobile-menu-active`. Because `button.mw-interlanguage-selector` sits inside `#p-lang`, it is clipped and `document.elementFromPoint` at its coordinates hits `HTML`. A user who taps `#ca-languages a` first reaches the button and opens `div.uls-rewrite`, so the user-facing issue is that the button is not reachable without the extra tap (not that the selector cannot be opened). Open question for the owner: keep KI-5 as a skin bug, or treat it as a test that should tap `#ca-languages a` first (any test change would be its own PR).
2. Code:
   - MonoBook `resources/mobile.js.less:19-28`: `#p-lang` is in the popout selector list `#p-cactions, #p-personal, #p-tb, #p-lang, #sidebar-mobilejs` with `&:not( .mobile-menu-active ) { .mixin-screen-reader-text(); }`.
   - MonoBook `includes/Hooks.php:109-117` and `resources/skin.js:12`: `#ca-languages a` in `#p-cactions-mobile` toggles `.mobile-menu-active` on `#p-lang`.
3. Live proof (MCP, `…/w/index.php?title=QA_ULS_search_codes&useskin=monobook&useformat=desktop`, 390×844 mobile+touch):
   - Anon (seat 3, 390×844×2): `#p-lang` has `position:absolute; clip:rect(1px,1px,1px,1px); 1x1 at x=-1,y=343` (no `mobile-menu-active`); `button.mw-interlanguage-selector` box `x=17,y=546, 76x32`; `elementFromPoint` at centre returns `HTML`. After `#ca-languages a.click()`: `#p-lang` gets `mobile-menu-active`, `clip:auto`, box `200x425 at y=32`, trigger at `y=386`, `elementFromPoint` returns the button, and clicking opens `div.uls-rewrite` (`390x844`).
   - Logged in (`UlsSeat1w1`, seat 1, 390×844×3): `#p-lang` `clip: rect(1px, 1px, 1px, 1px)`, rect `[-1,344,1,1]`; button `[17,546,76,32]`, hit `HTML`. After `#ca-languages a` click: `mobile-menu-active`, `clip: auto`, button `[47,386,76,32]`, hit `BUTTON.mw-interlanguage-selector`, tap opens `div.uls-rewrite` (`[0,0,390,844]`).
4. Whose code: MonoBook skin (`resources/mobile.js.less`), by design for its mobile popout menu—not ULS and not the WIP patch.
5. Old selector: with `qa_t439718=old` (`wgULSLanguageSelectorV2Enabled: false`, seat 3, anon), `#p-lang` has the same `clip: rect(1px…)` and `HTML` hit at the trigger centre. The new selector did not bring this in.

### Fix (KI-5)
[`docs/fixes/KI-5.diff`](docs/fixes/KI-5.diff): removes `#p-lang,` from the `.mixin-screen-reader-text()` popout list in MonoBook `resources/mobile.js.less:23`, leaving `#p-lang` visible in flow on mobile (note: alternatively, tests can tap `#ca-languages a` first to open the popout, since MonoBook hides `#p-lang` behind that tab by design). Note that `resources/mobile.js.less:30-34` (`.mobile-menu-active { position: absolute; top: 2em; left: 0; z-index: 10000; ... }`) is still active, so tapping `#ca-languages a` still pulls `#p-lang` into a popout (two states: in flow by default, popout after a tap).

Applied live via MCP:
- Exact diff equivalent (seat 5, 390×844×2 touch, anon, `#p-lang` stripped from the 10 matching `cssRules` selector lists): before tap `#p-lang` `position: static`, `clip: auto`, box `[0,345,390,190]`, button `[18,494,76,32]`, `elementFromPoint = BUTTON`, `scrollWidth 390`; after `#ca-languages a.click()`, `#p-lang` gets `mobile-menu-active` (`position: absolute`, `[0,32,201,425]`), button `[47,386,76,32]`, hit `BUTTON`.
- CSS injection (`body.skin--responsive #p-lang:not(.mobile-menu-active){position:static!important;clip:auto;width:auto;height:auto;overflow:visible;margin:1em}`, seat 1, 390×844 touch):

| Row (viewport, user, selector) | Before | With fix |
|---|---|---|
| mobile 390×844, anon, new | `#p-lang` clipped, hit `HTML` | `clip: auto`, `#p-lang` `[13,357,365,190]`, button `[31,507,76,32]`, hit `BUTTON`, opens `div.uls-rewrite` |
| mobile 390×844, logged in (`UlsSeat1w1`), new | `#p-lang` clipped, hit `HTML` | `clip: auto`, `#p-lang` `[13,357,365,190]`, button `[31,507,76,32]`, hit `BUTTON`, opens `div.uls-rewrite` |

Expected-failure marks stay: the wiki code has not changed.

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

### Root cause (KI-6)
1. The page content on this wiki is English, so `<body>` has class `sitedir-ltr` even with `uselang=ar`.
   Timeless ships an old core stylesheet that makes every `input` under `.sitedir-ltr` left-to-right.
   The ULS search box is an `input` inside the dialog, so it turns LTR while the dialog around it is RTL.
2. Code:
   - Timeless `resources/libraries/shared.css:25-29` (module `skins.timeless`, `skin.json:89`):
     `.sitedir-ltr textarea, .sitedir-ltr input { /* @noflip */ direction: ltr; }`
     (the file says it was copied from MediaWiki 1.34).
   - ULS sets no direction on its search inputs: `lib/jquery.uls/css/jquery.uls.css:78` (`.uls-filterinput`, old
     selector) and the Codex input in `resources/ext.uls.rewrite/` (new selector) inherit nothing over that rule.
3. Live proof (MCP, seat 1, 12:16, `…/w/index.php?title=QA_ULS_search_codes&useskin=timeless&uselang=ar`, desktop
   1280×800, anon, `evaluate_script`: click `button.mw-interlanguage-selector`, wait 2.5 s, walk `document.styleSheets`
   for rules with `direction` that match the input):
   `{"v2":true,"htmlDir":"rtl","dlg":"uls-rewrite uls-rewrite--density-medium","dlgDir":"rtl","inp":"<input class=\"cdx-text-input__input\" …>","inpDir":"ltr","rules":[[".sitedir-ltr textarea, .sitedir-ltr input","ltr","…/w/load.php?lang=ar&modules=…%7Cskins.timeless&only=styl…","screen"]]}`.
   It is the only matching `direction` rule. Logged in as `UlsSeat1w1`: same (`"dlgDir":"rtl","inpDir":"ltr"`).
4. Whose code: the skin's stylesheet (Timeless). ULS could protect its own dialog; that is the smaller,
   safer change because the Timeless rule is right for content inputs. Not the WIP patch (see 5).
5. Old selector: with `qa_t439715=old` (`"v2":false`), the old menu `uls-menu interlanguage-uls-menu` is
   `rtl` and its input `uls-filterinput uls-filtersuggestion` is `ltr`. The new selector did not bring this in.
   (Note: the entry above names `input.uls-languagefilter`; the new selector's input is `input.cdx-text-input__input`.)

### Fix (KI-6)
[`docs/fixes/KI-6.diff`](docs/fixes/KI-6.diff): in ULS, `direction: inherit` on `.uls-menu .uls-filterinput`
(old) and `.uls-rewrite .cdx-text-input__input` (new). Both selectors are more specific than `.sitedir-ltr input`.
Checked with `git apply --check` on a copy of the two files. Applied live by adding the same rules in a
`<style>` element with `evaluate_script`, then reading `getComputedStyle(input).direction` again:

| Row (viewport, user, selector) | Before | With fix |
|---|---|---|
| desktop 1280×800, anon, new | input `ltr`, dialog `rtl` | input `rtl` |
| desktop 1280×800, logged in, new | input `ltr`, dialog `rtl` | input `rtl` |
| desktop 1280×800, anon, old (`qa_t439715=old`) | input `ltr`, menu `rtl` | input `rtl` |
| desktop 1280×800, anon, new; cog → Input tab → more languages (jquery.uls menu, two `.uls-filterinput`) | both inputs `ltr`, menu `rtl` | both `rtl` |

Tablet and mobile not checked (the button is hidden there by KI-4). A skin-side fix (scope the
`shared.css` rule to content) was not tested live. The expected-failure marks stay: the wiki code has not changed.

## KI-7
**New selector does not move focus into the full-screen dialog under 768 px.**

- Skins: `minerva` (mobile). Also `timeless` and `monobook` at mobile 390, where KI-4 and KI-5 already make the row fail. Tablet rows (820 px) are fine. Users: anonymous and logged in.
- Steps:
  1. Open `QA ULS search codes` with `useskin=minerva&useformat=mobile` at 390×844 (touch, mobile UA).
  2. Tap the language button.
  3. Read `document.activeElement`.
- Expected: focus is inside the open dialog (`div.uls-rewrite`, `role=dialog`, `aria-modal=true`), on the search input as on desktop.
- Actual: focus stays on the trigger (Minerva) or on `<body>` (Timeless, MonoBook). A screen reader starts outside a dialog that says it is modal. The first Tab goes inside and the focus trap then holds.
- Found on: ULS `2b186dc023e278d88bf91d4713ae021ce2306515`, MediaWiki core 1.48.0-alpha `f7d0709ef0c28166422137c3167b0a992b999afd`. Found in the stretch 1 a11y pass (`docs/a11y-perf.md`, finding 1).
- In the suite: `tests/viewport.spec.js` "Focus moves into the selector when it opens by tap"; `tests/support/known-issues.js` marks group `focus-on-open` on Minerva, Timeless and MonoBook mobile rows.

### Root cause (KI-7)
1. Under 768 px the new selector does not use Floating UI, so its `isPositioned` flag never turns true.
   `focusInput()` waits for that flag before it focuses the search box, so on mobile it waits forever.
2. Code (`resources/ext.uls.rewrite/UniversalLanguageSelector.vue`): `:477-479` sets the floating reference to
   `null` when `isMobile`; `:481` takes `isPositioned` from `useFloating`; `:939-942` awaits `watch( isPositioned )`
   before `searchInputRef.value.focus()` (`:945`). The same hang hits the return from a sub-panel (`:983-985`).
   Source reading by seat 4 on #90.
3. Live proof (MCP, seat 1, 13:4x, `/wiki/QA_ULS_search_codes?useskin=minerva&useformat=mobile`, `emulate`
   390×844×3 mobile touch, iPhone UA, anon): `click` the "Language" button, wait 800 ms, `evaluate_script` →
   `{"open":true,"modal":"true","active":"A.cdx-button ... language-selector mw-interlanguage-selector","inside":false}`
   ([#90](https://github.com/ai-hackathon-only/uls-ui-tests/issues/90#issuecomment-6889287481)). Timeless 390 and
   MonoBook 390: `aria-modal=true`, focus on `BODY`
   ([#92](https://github.com/ai-hackathon-only/uls-ui-tests/pull/92#issuecomment-6889392983)).
   Playwright, seat 1, 14:2x, KI-7 mark removed: `npx playwright test tests/viewport.spec.js -g "Focus moves"
   --project=minerva-mobile-anon --project=minerva-mobile-user` → 2 failed, `Focus is inside the open selector`,
   Expected: true, Received: false.
4. Whose code: ULS, new selector (`ext.uls.rewrite`), on the WIP patch.
5. Old selector: not checked live. The waiting code is only in `ext.uls.rewrite`; the old jquery.uls menu has no
   `isPositioned` step.

### Fix (KI-7)
[`docs/fixes/KI-7.diff`](docs/fixes/KI-7.diff): skip the wait when `isMobile` (no floating reference, nothing to
position, and the dialog is `position: fixed` full screen so no scroll jump, which is what T426954 guards against).
`git apply --check` passes on a copy of `resources/`. Not shown live: the change is inside the Vue component's setup
closure, which `evaluate_script` can't reach on the built page. Not checked: whether focusing the input on mobile
opens the on-screen keyboard right away (a product choice; focusing the dialog itself is the other option).
