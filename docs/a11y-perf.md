# Accessibility and performance of the open selector (round 4, stretch 1)

Wiki code: ULS `2b186dc0`, core `f7d0709` (Special:Version). Page: `/wiki/QA_ULS_search_codes?useskin=<skin>`, anonymous, new selector (no QA cookies). Tool: the Chrome DevTools MCP (headless Chrome, one fresh browser per turn).

How each number was taken:
- **click→visible**: `evaluate_script` with `test-results/a11y-open.js` (seat 1, gitignored): click the trigger, poll every 25 ms until a visible `div.uls-rewrite`, time with `performance.now()`. One sample per row, so treat ±50 ms as noise.
- **long tasks**: a `PerformanceObserver` for `longtask` in the same script, from click to visible. This is not a full `performance_start_trace` recording; that was not run.
- **RL modules added**: ResourceLoader modules in state `ready` after open minus before open.
- **dialog / label / focus**: DOM attributes of `div.uls-rewrite`, `take_snapshot` (verbose) for the accessible name, and `document.activeElement` after open.
- Desktop = 1280×800. Mobile = `emulate` 390×844×3, mobile, touch, iPhone user agent.

Raw posts with the copied output: issue #90 (seat 1, seat 4 source checks) and Discussion #89 (seat 3).

## Vector 2022

| device | trigger | click→visible | long tasks | RL added | dialog | search box name | focus after open |
|---|---|---|---|---|---|---|---|
| desktop | `#p-lang-btn-checkbox` | 288 ms | none | 19 | role=dialog, aria-label "Languages", aria-modal=false | placeholder only | search input |
| mobile 390 (`innerWidth` 1120, no responsive viewport) | same | 178 ms | none | 17 | same, box 402×314 | placeholder only | search input |

Shift+Tab from the search input moves focus out of the dialog (to `a.cdx-button`) and the dialog stays open. The dialog is `aria-modal=false` on desktop, so this matches the code (`UniversalLanguageSelector.vue:6-8`, trap only when `isMobile`, `:888`).

## Vector legacy

| device | trigger | click→visible | long tasks | RL added | dialog | search box name | focus after open |
|---|---|---|---|---|---|---|---|
| desktop | `.mw-interlanguage-selector` | 190 ms | none | 15 | role=dialog, "Languages", aria-modal=false | placeholder only | search input |
| mobile 390 (`innerWidth` 1120) | same | 159 ms | none | 15 | same | placeholder only | search input |

## MonoBook, Timeless, Modern

| skin | device | click→visible | long tasks | RL added | dialog | search box name | focus after open |
|---|---|---|---|---|---|---|---|
| monobook | desktop | 152 ms | none | 15 | role=dialog, "Languages", aria-modal=false | placeholder only | search input |
| timeless | desktop | 102 ms | none | 15 | same (seat 3 confirmed; trigger has no aria-haspopup / aria-expanded) | placeholder only | search input |
| modern | desktop | 135 ms | none | 15 | same | placeholder only | search input |
| all three | mobile 390 | not run (seat 3 took these; add rows when posted) | | | | | |

## Cologne Blue

n/a on every device: there is no language button (KI-1), so the selector can't be opened.

## Minerva (`useformat=mobile`)

| device | click→visible | long tasks | RL added | dialog | search box name | focus after open |
|---|---|---|---|---|---|---|
| mobile 390 | 263 ms | none | 11 | `uls-rewrite--mobile`, role=dialog, **aria-modal=true**, "Languages", 390×844 | placeholder only | **stays on the trigger** (outside the dialog) |

Focus check with real input events (MCP `click` on "Language", then `press_key`): after the tap, `document.activeElement` is the trigger `a.mw-interlanguage-selector`, `inside: false`. Tab → Close button (inside). Shift+Tab → search input (inside, so the trap wraps). With a script `.click()` the active element was `BODY`; either way focus never reaches the search input.

## Lighthouse (accessibility)

| page | score | failing audits |
|---|---|---|
| Minerva mobile, on load | 95 | `label` on `#main-menu-input` (Minerva skin, not ULS) |
| Minerva mobile, snapshot with selector open | 95 | same, plus `heading-order` on `h3.uls-rewrite__section-title` "Variants for English" (ULS) |
| desktop skins | not run | |

The search input passes Lighthouse's `label` audit only through its placeholder.

## Findings

1. **Minerva: focus does not move into the modal dialog.** The dialog says `aria-modal=true`, but after opening, focus stays outside. Seat 4's source reading: `UniversalLanguageSelector.vue:477-479` sets `floatingReference` to `null` when `isMobile`, so `isPositioned` (`:481`) never turns true and `focusInput()` (`:939-945`) waits forever. Candidate KI; not filed yet.
2. **Heading order** (all skins, seen by Lighthouse on Minerva): the dialog's section titles are `h3` (`:106`) with no `h2` above them in the dialog. Minor.
3. **Search box has no label**, only a placeholder (`:38-56`), on every skin. Screen readers read the placeholder; it disappears once you type. Minor.
4. **Performance:** opening takes 100–290 ms on this machine (MacBook Pro M2 Max), with no long tasks on any row measured.

Written by seat 1 (builder), with rows and source checks from seats 3 and 4.
