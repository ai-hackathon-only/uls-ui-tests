# ULS Feature Inventory

This document maps every user-facing UniversalLanguageSelector (ULS) feature across skins, devices, and user states, linking each feature to its test suite coverage.

## Matrix Overview

- **Skins (7):** Vector 2022 (`vector-2022`), Vector legacy (`vector`), MonoBook (`monobook`), Timeless (`timeless`), Modern (`modern`), Cologne Blue (`cologneblue`), Minerva (`minerva`).
- **Devices (3):** Desktop (1280×800), Tablet (820×1180, touch), Mobile (390×844, touch).
- **Users (2):** Anonymous (`anon`), Logged in (`user`).
- **Total Matrix Rows:** 40 projects (Minerva on tablet & mobile; desktop skins on desktop, tablet, and mobile; each × anon & user).
- **Selector Architecture on Local Wiki:**
  - On this wiki patch (`review/1363211`), all 7 skins run **ULS V2 (rewrite)** (`resources/ext.uls.rewrite/`, DOM root `.uls-rewrite`) by default. `minerva` and `vector-2022` are configured in `extension.json` (`ULSLanguageSelectorV2SupportedSkins`), while `timeless`, `monobook`, `vector`, `modern`, and `cologneblue` are appended via `$wgULSLanguageSelectorV2SupportedSkins` in `LocalSettings.php` (lines 476, 486, 487, 496, 497).
  - Legacy ULS (`resources/js/`, DOM root `.uls-menu` for selector and `#languagesettings` for dialog) is loaded when QA override cookies (`qa_t439715=old`, `qa_t439718=old`, `qa_t439851=old`) are explicitly supplied.
  - **DOM Roots & Search Elements:**
    - **ULS V2 Rewrite:** Root `.uls-rewrite` (or `.uls-rewrite.uls-rewrite--mobile` on viewports < 768px). Search input is `.uls-rewrite__search-active input[type="search"]`.
    - **Legacy ULS:** Root `.uls-menu` / `#languagesettings`. Search input is `#languagefilter` or `.uls-languagefilter`.
  - **Desktop & Tablet (viewport >= 768px):** Renders as an anchored dialog/popup overlay; does not modify the URL hash.
  - **Mobile (viewport < 768px, e.g. 390×844):** Renders as a fullscreen mobile overlay bound to the URL route `#/languages` (`ext.uls.interface.js:429-525`). Opening pushes `#/languages` with history state `{ ulsRoute: true }`; closing via Esc, close button, or browser back pops history/replaces state and restores focus to trigger.

---

## 1. Trigger & Dialog Lifecycle (`@open`)

- **Description:** Entry button opens the language selector dialog; Esc, close button, or click-outside closes it; focus returns to the entry button upon closing.
- **Per-skin trigger placement:**
  - `vector-2022`: Header dropdown button `#p-lang-btn` / `.vector-dropdown`.
  - `vector`: Left sidebar `#p-lang` trigger or cog trigger (`.uls-settings-trigger`, `.mw-interlanguage-selector`).
  - `monobook`: Left sidebar `#p-lang` trigger / `.uls-settings-trigger`, `.mw-interlanguage-selector`. Expected failure on mobile: KI-5 (sidebar navigation overlaps and intercepts trigger).
  - `timeless`: Sidebar / page tools portlet `#p-lang` / `.uls-settings-trigger`. Expected failure on tablet & mobile: KI-4 (trigger portlet hidden by skin CSS under 851px).
  - `modern`: Left sidebar portlet `#p-lang` / `.uls-settings-trigger`.
  - `cologneblue`: Expected failure: KI-1 (no ULS trigger; `#p-lang` absent, `ext.uls.rewrite.entrypoints` remains registered).
  - `minerva`: Header / page language icon `.minerva-icon--language` or `.minerva-icon--language-switcher`.
- **Selector dialog DOM roots:**
  - Rewrite ULS: `.uls-rewrite` (with `.uls-rewrite--mobile` on mobile viewports < 768px, managing the `#/languages` route).
  - Legacy ULS: `.uls-menu` overlay.
- **Covering spec:** `tests/open.spec.js`
  - `Language button opens selector dialog @open`
  - `Esc key closes selector and restores focus @open`
  - `Close button closes selector and restores focus @open`
  - `Click outside closes selector and restores focus @open`
  - `Mobile route #/languages syncs with open/close and browser back @open`

---

## 2. Language Search (`@search`)

- **Description:** Search input in selector allows finding languages by English name, autonym, ISO language code, typo/prefix match, or other scripts; displays "no results" state when no match is found.
- **Search criteria:**
  - By English name: e.g. "German", "Japanese".
  - By autonym: e.g. "Deutsch", "日本語".
  - By language code: e.g. "de", "zh-yue", "be-tarask", "simple".
  - By prefix/partial match or typo tolerance.
  - In other scripts: e.g. Cyrillic, Arabic, Hanzi.
  - Empty state: entering a non-existent language query displays `EmptySearchEntrypoint.vue` / "no results found" state (`.uls-rewrite__no-results` or `.uls-no-results-found`).
- **Covering spec:** `tests/search.spec.js`
  - `Search by name, autonym, code, typo and script, and the no-results state @search` (one test per matrix row; one step per query: English name, autonym, codes `de`/`zh-yue`/`be-x-old`, typo, non-Latin script, no results)

---

## 3. Interlanguage Navigation (`@interlanguage`)

- **Description:** On pages with interlanguage links (e.g. `QA ULS search codes`), selecting a language navigates to that language's article. On pages with no interlanguage links, selector displays `EmptyListEntrypoint.vue` / the empty links state. When language links are missing, `MissingLanguagesEntrypoint.vue` provides entry to `MissingLanguagesPanel.vue`.
- **Test page:** `QA ULS search codes` (contains links for `simple`, `als`, `zh-yue`, `be-x-old`, etc.).
- **Covering spec:** `tests/interlanguage.spec.js`
  - `Selecting interlanguage link navigates to target article @interlanguage`
  - `Page without interlanguage links shows empty interlanguage state @interlanguage`
  - `Missing languages panel trigger functions when available @interlanguage`

---

## 4. Suggested Languages (`@suggested`)

- **Description:** Previously selected or browser-suggested languages appear prominently in the "Suggested" / "Common languages" section on subsequent openings.
- **Mechanism & Source Files:**
  - Old ULS: `resources/js/ext.uls.common.js:45` (`mw.uls.previousLanguagesStorageKey = 'uls-previous-languages'`).
  - Rewrite ULS: `resources/ext.uls.rewrite/composables/useLanguageHistory.js:26` (`const PREVIOUS_LANGUAGE_STORAGE_KEY = 'uls-previous-languages'`).
  - Both persist recent language codes as JSON arrays in `window.localStorage['uls-previous-languages']`.
- **Covering spec:** `tests/suggested.spec.js`
  - `Previously selected language appears in suggested section @suggested`

---

## 5. Interface Language Change & Setlang Prompt (`@uilang`)

- **Description:** Switching the interface language updates UI messages. For anonymous users, persists via cookie or URL (`uselang=`); for logged-in users, updates user preferences via API/options and survives a page reload. Accessing a page with `?setlang=<langcode>` displays a confirmation dialog asking the user whether to switch the interface language. Tests must restore the initial language preference.
- **Teardown contract:** Tests reset user preference to English (`en`) via `action=options` API after testing.
- **Covering spec:** `tests/uilang.spec.js`
  - `Anon interface language change via cookie/query @uilang`
  - `Logged-in interface language preference persists and restores @uilang`
  - `setlang query parameter triggers language switch prompt @uilang`

---

## 6. Language Settings Cog (`@settings`)

- **Description:** Language Settings dialog with two primary tabs:
  1. **Display tab:** Interface language switcher and webfonts configuration.
  2. **Input tab:** Enable/disable input methods (IME), select input layout, type in search box and verify transliterated output.
- **Per-skin availability & entrypoints:**
  - **Legacy ULS:** Opened via `.uls-settings-trigger` cog icon in sidebar/interlanguage.
  - **ULS V2 Rewrite:** Opened via `ext.uls.rewrite.languagesettings.entrypoint` (`LanguageSettingsEntrypoint.js`), which registers `id: 'language-settings-quick-action'` in the Quick Actions panel at the bottom of `.uls-rewrite` and in empty list view. When activated, it mounts `$settingsAnchor.languagesettings({ autoOpen: true })` displaying `#languagesettings`.
  - **Minerva:** Available in ULS V2 rewrite via the Quick Action entrypoint inside `.uls-rewrite`. (The legacy standalone desktop sidebar cog does not appear on Minerva, but the settings panel is accessible via the quick action trigger).
- **Covering spec:** `tests/settings.spec.js`
  - `Settings cog opens settings dialog @settings`
  - `Display tab shows interface and webfont settings @settings`
  - `Input tab enables IME and transliterates input @settings`

---

## 7. Special:Preferences Language Field (`@prefs`)

- **Description:** Logged-in user can view and change language settings directly in `Special:Preferences#mw-prefsection-personal`. Renders the user interface language setting and `PreferredLanguagesTab.vue` (`ext.uls.preferredlanguages` multi-select lookup).
- **Row restriction:** Logged-in users only (`ULS_USER=user`). Anon rows mark this as `n/a: anon user`.
- **Covering spec:** `tests/uilang.spec.js` / `tests/prefs.spec.js`
  - `User can view and change language setting in Special:Preferences @prefs`
  - `Preferred languages tab renders multi-select lookup @prefs`

---

## 8. Keyboard Accessibility (`@keyboard`)

- **Description:** Full keyboard navigation inside the language selector. Focus enters search input, Tab cycles through actionable elements, Arrow keys navigate language list, Enter selects language, and focus outline is clearly visible.
- **Scope:** Applies across all skins. On tablet viewports (820×1180, including Minerva tablet) keyboard navigation operates via hardware keyboard or virtual input and must focus DOM interactive elements correctly. Mobile touch taps are tested under `@viewport`.
- **Covering spec:** `tests/keyboard.spec.js`
  - `Tab and arrow navigation through language list @keyboard`
  - `Enter key activates selected language @keyboard`
  - `Active element has visible focus indicator @keyboard`

---

## 9. Right-to-Left (RTL) Layout (`@rtl`)

- **Description:** With an RTL interface language (e.g. `ar` or `he` via `uselang=ar`), the ULS selector is properly mirrored (tabs on right, close button on left, text aligned right) and does not overflow horizontally at 390px viewport.
- **Covering spec:** `tests/rtl.spec.js`
  - `Selector mirrors correctly in RTL interface @rtl`
  - `No horizontal overflow at 390px viewport in RTL @rtl`
- **Known issues:**
  - `cologneblue`: Expected failure: KI-1 (no trigger).
  - `timeless`: Expected failure on tablet & mobile: KI-4 (no trigger); expected failure on desktop: KI-6 (search input direction overridden to LTR by skin CSS).
  - `monobook`: Expected failure on mobile: KI-5 (trigger intercepted).

---

## 10. Small Screens & Viewport Responsiveness (`@viewport`)

- **Description:** On mobile (390×844) and tablet (820×1180) viewports, selector dialog fits within the viewport width without page horizontal scrolling, and touch tap interactions function properly.
- **Covering spec:** `tests/viewport.spec.js`
  - `Selector fits mobile viewport without horizontal scroll @viewport`
  - `Touch tap interactions open and select languages @viewport`

---

## 11. Compact Interlanguage Links (`@compact-links`)

- **Description:** For skins configured with compact interlanguage links (`ext.uls.compactlinks`), excessive interlanguage links are folded into a compact trigger (e.g. "9 more languages") that triggers ULS.
- **Per-skin availability:**
  - Supported: `vector`, `monobook`, `timeless`, `modern`, `cologneblue`.
  - `vector-2022`: Integrated into the unified language dropdown button.
  - `minerva`: `n/a: minerva` uses MobileFrontend native interlanguage list.
- **Covering spec:** `tests/compact-links.spec.js` (deferred / stretch item; not in core 11 feature specs).
  - `Compact interlanguage trigger opens selector on long language list @compact-links`

---

## 12. Console & Network Request Health (`@errors`)

- **Description:** Automated collection of browser console errors, unhandled exceptions, and HTTP >= 400 responses across all executed tests. Unexpected errors fail the test. Known harmless errors (such as missing `/favicon.ico` KI-0) are allow-listed in `tests/support/known-errors.js`.
- **Known issues reporting:** Any real bug uncovered by tests must remain covered by an active test, marked as an expected failure, and documented in `KNOWN-ISSUES.md`. Each entry records: issue ID, skin, device, user, reproduction steps, expected vs actual behavior, screenshot under `docs/`, and ULS + core git commit hashes from `Special:Version`.
- **Covering fixture:** `tests/support/fixtures.js` (evaluated after each test run).

---

## Skin Feature Support Matrix

| Feature Group | Vector 2022 | Vector legacy | MonoBook | Timeless | Modern | Cologne Blue | Minerva |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **@open** (Trigger & Dialog) | Yes (`#p-lang-btn`) | Yes (`#p-lang`) | Yes (KI-5 mobile fail) | Yes (KI-4 tablet/mobile fail) | Yes (`#p-lang`) | Expected fail: KI-1 | Yes (Mobile trigger) |
| **@search** (Search & Autonyms) | Yes | Yes | Yes (KI-5 mobile fail) | Yes (KI-4 tablet/mobile fail) | Yes | Expected fail: KI-1 | Yes |
| **@interlanguage** (Navigation) | Yes | Yes | Yes (KI-5 mobile fail) | Yes (KI-4 tablet/mobile fail) | Yes | Expected fail: KI-1 | Yes |
| **@suggested** (Recent langs) | Yes | Yes | Yes (KI-5 mobile fail) | Yes (KI-4 tablet/mobile fail) | Yes | Expected fail: KI-1 | Yes |
| **@uilang** (Interface & ?setlang=) | Yes | Yes | Yes | Yes | Yes | Expected fail: KI-1 | Yes |
| **@settings** (Cog / IME / Webfonts)| Yes | Yes | Yes (KI-5 mobile fail) | Yes (KI-4 tablet/mobile fail) | Yes | Expected fail: KI-1 | Yes (quick action) |
| **@prefs** (Special:Preferences) | Yes (user) | Yes (user) | Yes (user) | Yes (user) | Yes (user) | Yes (user) | Yes (user) |
| **@keyboard** (Full navigation) | Yes | Yes | Yes (KI-5 mobile fail) | Yes (KI-4 tablet/mobile fail) | Yes | Expected fail: KI-1 | Yes |
| **@rtl** (Mirroring & 390px) | Yes | Yes | Yes (KI-5 mobile fail) | Yes (KI-4 tablet/mobile fail; KI-6 desktop fail) | Yes | Expected fail: KI-1 | Yes |
| **@viewport** (Responsive tap) | Yes | Yes | Yes (KI-5 mobile fail) | Yes (KI-4 tablet/mobile fail) | Yes | Expected fail: KI-1 | Yes |
| **@compact-links** (Compacted) | `n/a: v2022 dropdown` | Yes | Yes | Yes | Yes | Expected fail: KI-1 | `n/a: minerva` |
| **@errors** (No 4xx/5xx/console) | Yes | Yes | Yes | Yes | Yes | Expected fail: KI-1 | Yes |
