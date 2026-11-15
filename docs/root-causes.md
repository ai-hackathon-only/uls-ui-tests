# Root Causes Summary (Round 4)

Summary of the four known ULS issues (`KI-1`, `KI-4`, `KI-5`, `KI-6`) reproduced on the agent wiki (ULS `2b186dc0`, MediaWiki core `f7d0709`). All four reproduce with the old selector QA cookies as well; none were introduced by the new selector WIP patch.

| KI | One-line cause | File:line | Whose code | Old selector too? | Fix file | Rows checked |
|---|---|---|---|---|---|---|
| **KI-1** | Cologne Blue wraps its language list in `#langlinks` with no `mw-portlet-lang` class or `#p-lang` id, so ULS skips loading. | `templates/skin.mustache:9` (CologneBlue); `resources/js/ext.uls.compactlinks.js:356` (ULS) | Skin markup & ULS lookup | Yes (`qa_t439851=old`) | [docs/fixes/KI-1.diff](fixes/KI-1.diff) | All 6 rows (desktop, tablet, mobile × anon, logged in) + desktop anon old |
| **KI-4** | Timeless collapses `#other-languages .sidebar-inner` behind `#ca-languages` at `<= 850px`, and `#ca-languages` has `tabIndex: -1`, no `role`, and only a `click` handler. | `resources/screen-mobile.less:52-54`, `includes/TimelessTemplate.php:883-887`, `resources/mobile.js:30-35` (Timeless) | Timeless skin | Yes (`qa_t439715=old`) | [docs/fixes/KI-4.diff](fixes/KI-4.diff) | Logged-in tablet & mobile (new); anon mobile (new, old); anon tablet & mobile with fix unproved (not run) |
| **KI-5** | MonoBook hides `#p-lang` off-screen with `clip: rect(1px, 1px, 1px, 1px)` behind the `#ca-languages a` mobile tab at `<= 550px`. | `resources/mobile.js.less:19-28`, `resources/skin.js:12` (MonoBook) | MonoBook skin (by design) | Yes (`qa_t439718=old`) | [docs/fixes/KI-5.diff](fixes/KI-5.diff) | Mobile 390×844 anon & logged in (new); anon (old) |
| **KI-6** | Timeless forces `direction: ltr` on `.sitedir-ltr input`, overriding `direction: rtl` on the ULS search box on LTR-content wikis. | `resources/libraries/shared.css:25-29` (Timeless) | Timeless skin (fixable in ULS) | Yes (`qa_t439715=old`) | [docs/fixes/KI-6.diff](fixes/KI-6.diff) | Desktop 1280×800 anon & logged in (new); anon (old); Input tab jquery.uls (new) |

---

## Phabricator Drafts (Remarkup)

### KI-1: Cologne Blue has no ULS language button

```remarkup
= Cologne Blue: ULS language selector button never loads =

**What users see**
On Cologne Blue (desktop, tablet, and mobile, both anonymous and logged-in), no ULS language button appears. Pages show only the plain "In other languages" link list, even though Cologne Blue is listed in `$wgULSLanguageSelectorV2SupportedSkins`. The same happens with the old selector (`qa_t439851=old`).

**Why**
ULS looks for `.mw-portlet-lang` or `#p-lang` before loading the entry point (`resources/js/ext.uls.compactlinks.js:356` and `resources/js/ext.uls.interface.js:360, 1028`). Cologne Blue's template (`templates/skin.mustache:9`) renders its language list inside `<div id="langlinks">` without either class or id, so ULS returns early and leaves `ext.uls.rewrite.entrypoints` in the `registered` state.

**Suggested fix**
Add `class="mw-portlet-lang"` to `<div id="langlinks">` in Cologne Blue's `templates/skin.mustache:9` (see `docs/fixes/KI-1.diff`), or add `#langlinks ul` to ULS's selector lookups. Adding the class live restores the `"5 more"` trigger and opens `div.uls-rewrite` (and `.uls-menu` for the old selector) across all six matrix rows.
```

### KI-4: Timeless narrow viewports hide the language button behind an inaccessible toggle

```remarkup
= Timeless (<= 850px): language button is hidden behind a non-keyboard-accessible toggle =

**What users see**
At viewport widths of 850 px or narrower (tablet and mobile, anonymous and logged-in), the language button is not visible on page load. Touch and mouse users can tap the "Languages" header item (`#ca-languages`) to reveal it, but keyboard and assistive-technology users cannot open `#ca-languages` at all. This affects both the new and old selectors (`qa_t439715=old`).

**Why**
Timeless intentionally collapses `#other-languages .sidebar-inner` with `display: none` at `max-width: 850px` (`resources/screen-mobile.less:52-54`). However, `includes/TimelessTemplate.php:883-887` renders `#ca-languages` as `<li><span>Languages</span></li>` without an `href`, `role`, or `tabindex`, and `resources/mobile.js:30-35` binds only a `click` listener.

**Suggested fix**
Keep the collapsed header design, and add `role="button"`, `tabindex="0"`, and `Enter`/`Space` `keydown` handling to `#ca-languages` in Timeless's `resources/mobile.js:30-35` (see `docs/fixes/KI-4.diff`). Live testing on tablet and mobile confirms that tabbing to `#ca-languages` and pressing `Enter` reveals the language button and opens `div.uls-rewrite`. (Note: UI tests that expect the button to be visible without opening `#ca-languages` first will still need to be updated to open the toggle.)
```

### KI-5: MonoBook mobile hides the language button off-screen behind a popout tab

```remarkup
= MonoBook (<= 550px): language button is clipped off-screen behind the mobile Languages tab =

**What users see**
On mobile viewports (`390x844`, anonymous and logged-in), the ULS language button cannot be clicked directly because it is clipped to a 1x1 px off-screen box. Tapping the `#ca-languages a` globe tab in the mobile action bar opens the `#p-lang` popout and makes the button clickable. This happens with both the new and old selectors (`qa_t439718=old`).

**Why**
At `max-width: 550px`, MonoBook's `resources/mobile.js.less:19-28` applies `.mixin-screen-reader-text()` (`clip: rect(1px, 1px, 1px, 1px)`) to `#p-lang` until `#ca-languages a` toggles `.mobile-menu-active` (`resources/skin.js:12`). The trigger sits inside `#p-lang`, so it is clipped off-screen until the tab is tapped.

**Suggested fix**
Decide whether MonoBook should keep `#p-lang` behind `#ca-languages a` (and update UI tests to tap `#ca-languages a` first) or show `#p-lang` in flow on mobile by removing `#p-lang,` from the `.mixin-screen-reader-text()` list in MonoBook's `resources/mobile.js.less:23` (see `docs/fixes/KI-5.diff`). Removing it live unclips `#p-lang` in flow and makes the button directly clickable to open `div.uls-rewrite` (Playwright suite not re-run) while keeping the popout toggle working.
```

### KI-6: Timeless forces LTR direction on the ULS search input in RTL mode

```remarkup
= Timeless (RTL): ULS search input stays LTR when interface language is RTL =

**What users see**
When viewing an LTR-content wiki in an RTL interface language (`uselang=ar`) on Timeless, the ULS dialog mirrors to RTL as expected, but the search input inside it stays left-to-right (`direction: ltr`). This affects both the new Codex search input and the old selector's `.uls-filterinput` (`qa_t439715=old`), as well as the Input-tab language picker.

**Why**
Because the wiki content is English, `<body>` carries `.sitedir-ltr`. Timeless's `resources/libraries/shared.css:25-29` (copied from MediaWiki 1.34) sets `.sitedir-ltr textarea, .sitedir-ltr input { /* @noflip */ direction: ltr; }`. Neither `.uls-rewrite .cdx-text-input__input` nor `.uls-menu .uls-filterinput` sets `direction: inherit` with higher specificity, so the skin rule overrides the RTL dialog.

**Suggested fix**
Add `direction: inherit;` to `.uls-rewrite .cdx-text-input__input` and `.uls-menu .uls-filterinput` in ULS (see `docs/fixes/KI-6.diff`), rather than changing Timeless's content-input rule. Both selectors are more specific than `.sitedir-ltr input` and restore `direction: rtl` in live tests across the new dialog, the old menu, and the Input-tab picker.
```
