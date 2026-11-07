# ULS Feature Inventory

This document maps every user-facing UniversalLanguageSelector (ULS) feature across skins, devices, and user states, linking each feature to its test suite coverage.

## Matrix Overview

- **Skins (7):** Vector 2022 (`vector-2022`), Vector legacy (`vector`), MonoBook (`monobook`), Timeless (`timeless`), Modern (`modern`), Cologne Blue (`cologneblue`), Minerva (`minerva`).
- **Devices (3):** Desktop (1280×800), Tablet (820×1180, touch), Mobile (390×844, touch).
- **Users (2):** Anonymous (`anon`), Logged in (`user`).
- **Total Matrix Rows:** 40 projects (Minerva on tablet & mobile; desktop skins on desktop, tablet, and mobile; each × anon & user).
- **Selector Architecture on Local Wiki:**
  - On this wiki patch, all 7 skins run **ULS V2** (`resources/ext.uls.rewrite/`, `.uls-rewrite`). `minerva` and `vector-2022` are configured in `extension.json`, while `timeless`, `monobook`, `vector`, `modern`, and `cologneblue` are appended via `$wgULSLanguageSelectorV2SupportedSkins` in `LocalSettings.php` (lines 476, 486, 487, 496, 497). Legacy `.uls-menu` is used only when QA override cookies (`qa_t439715=old`, etc.) are explicitly supplied.
  - **Desktop & Tablet (viewport >= 768px):** Renders as an anchored dialog/popup overlay; does not modify the URL hash.
  - **Mobile (viewport < 768px, e.g. 390×844):** Renders as a fullscreen mobile overlay bound to the URL route `#/languages` (`ext.uls.interface.js:429-525`). Opening pushes `#/languages` with history state `{ ulsRoute: true }`; closing via Esc, close button, or browser back pops history/replaces state and restores focus to trigger.

---

## 1. Trigger & Dialog Lifecycle (`@open`)

- **Description:** Entry button opens the language selector dialog; Esc, close button, or click-outside closes it; focus returns to the entry button upon closing.
- **Per-skin trigger placement:**
  - `vector-2022`: Header dropdown button `#p-lang-btn` / `.vector-dropdown`.
  - `vector`: Left sidebar `#p-lang` trigger or cog trigger (`.uls-settings-trigger`).
  - `monobook`: Left sidebar `#p-lang` trigger / `.uls-settings-trigger`.
  - `timeless`: Sidebar / page tools portlet `#p-lang`.
  - `modern`: Left sidebar portlet `#p-lang`.
  - `cologneblue`: Left sidebar navigation `#p-lang`.
  - `minerva`: Header / page language icon `#language-selector .mw-interlanguage-selector`.
- **Selector dialog:** `#languagesettings` / `.uls-rewrite` (or legacy `.uls-menu`). On mobile (< 768px), manages the `#/languages` route.
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
  - `Search by English name @search`
  - `Search by autonym @search`
  - `Search by language code @search`
  - `Search with typo tolerance @search`
  - `Search no results empty state @search`

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
- **Mechanism:** Stored in local storage / session cookies (`uls-previous-languages`).
- **Covering spec:** `tests/suggested.spec.js`
  - `Previously selected language appears in suggested section @suggested`

---

## 5. Interface Language Change (`@interface-language`)

- **Description:** Switching the interface language updates UI messages. For anonymous users, persists via cookie or URL (`uselang=`); for logged-in users, updates user preferences via API/options and survives a page reload. Tests must restore the initial language preference.
- **Teardown contract:** Tests reset user preference to English (`en`) via `action=options` API after testing.
- **Covering spec:** `tests/interface-language.spec.js`
  - `Anon interface language change via cookie/query @interface-language`
  - `Logged-in interface language preference persists and restores @interface-language`

---

## 6. Language Settings Cog (`@settings`)

- **Description:** Cog icon opens Language Settings dialog with two primary tabs:
  1. **Display tab:** Interface language switcher and webfonts configuration.
  2. **Input tab:** Enable/disable input methods (IME), select input layout, type in search box and verify transliterated output.
- **Per-skin availability:**
  - Supported: `vector-2022`, `vector`, `monobook`, `timeless`, `modern`, `cologneblue`.
  - Not available (`n/a: minerva`): Minerva uses MobileFrontend mobile UI; desktop ULS cog settings dialog is not loaded on mobile format.
- **Covering spec:** `tests/settings.spec.js`
  - `Settings cog opens settings dialog @settings`
  - `Display tab shows interface and webfont settings @settings`
  - `Input tab enables IME and transliterates input @settings`

---

## 7. Special:Preferences Language Field (`@preferences`)

- **Description:** Logged-in user can view and change language settings directly in `Special:Preferences#mw-prefsection-personal`. Renders the user interface language setting and `PreferredLanguagesTab.vue` (`ext.uls.preferredlanguages` multi-select lookup).
- **Row restriction:** Logged-in users only (`ULS_USER=user`). Anon rows mark this as `n/a: anon user`.
- **Covering spec:** `tests/preferences.spec.js`
  - `User can view and change language setting in Special:Preferences @preferences`
  - `Preferred languages tab renders multi-select lookup @preferences`

---

## 8. Keyboard Accessibility (`@keyboard`)

- **Description:** Full keyboard navigation inside the language selector. Focus enters search input, Tab cycles through actionable elements, Arrow keys navigate language list, Enter selects language, and focus outline is clearly visible.
- **Scope:** Applies to desktop (1280×800) and tablet (820×1180, including Minerva tablet) viewports where keyboard input is available. Mobile viewports (390×844) are tested for touch interaction under `@viewport`.
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
- **Covering spec:** `tests/compact-links.spec.js`
  - `Compact interlanguage trigger opens selector on long language list @compact-links`

---

## 12. Set Language Parameter (`@setlang`)

- **Description:** Accessing a page with `?setlang=<langcode>` displays a confirmation dialog asking the user whether to switch the interface language.
- **Covering spec:** `tests/setlang.spec.js`
  - `setlang query parameter triggers language switch prompt @setlang`

---

## 13. Console & Network Request Health (`@errors`)

- **Description:** Automated collection of browser console errors, unhandled exceptions, and HTTP >= 400 responses across all executed tests. Unexpected errors fail the test. Known harmless errors (such as missing `/favicon.ico` KI-0) are allow-listed in `tests/support/known-errors.js`.
- **Covering fixture:** `tests/support/fixtures.js` (evaluated after each test run).

---

## Skin Feature Support Matrix

| Feature Group | Vector 2022 | Vector legacy | MonoBook | Timeless | Modern | Cologne Blue | Minerva |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **@open** (Trigger & Dialog) | Yes (`#p-lang-btn`) | Yes (`#p-lang`) | Yes (`#p-lang`) | Yes (`#p-lang`) | Yes (`#p-lang`) | Yes (`#p-lang`) | Yes (Mobile trigger) |
| **@search** (Search & Autonyms) | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| **@interlanguage** (Navigation) | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| **@suggested** (Recent langs) | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| **@interface-language** (Persist) | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| **@settings** (Cog / IME / Webfonts)| Yes | Yes | Yes | Yes | Yes | Yes | `n/a: minerva` (no cog) |
| **@preferences** (Special:Prefs) | Yes (user) | Yes (user) | Yes (user) | Yes (user) | Yes (user) | Yes (user) | Yes (user) |
| **@keyboard** (Full navigation) | Yes | Yes | Yes | Yes | Yes | Yes | Yes (tablet) / `n/a: touch` (mobile) |
| **@rtl** (Mirroring & 390px) | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| **@viewport** (Responsive tap) | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| **@compact-links** (Compacted) | `n/a: v2022 dropdown` | Yes | Yes | Yes | Yes | Yes | `n/a: minerva` |
| **@setlang** (?setlang= dialog) | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| **@errors** (No 4xx/5xx/console) | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
