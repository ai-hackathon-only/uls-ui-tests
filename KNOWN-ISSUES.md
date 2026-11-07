# Known issues

Each entry has an id (`KI-<n>`) used by `test.fail()` annotations and by
`tests/support/known-errors.js`. Entries for ULS bugs give skin, device, user,
steps, expected vs actual, a screenshot under `docs/`, and the ULS and core
commits from `Special:Version`.

## KI-0
Not a ULS bug. The test wiki has no `/favicon.ico` (404), and Chrome logs
"Failed to load resource: 404" on every page. Allow-listed in
`tests/support/known-errors.js` by its URL only.
