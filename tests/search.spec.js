// Feature 2: Language Search (@search)
// User-facing requirements from GOALS.md & FEATURES.md:
// - Search by English name (e.g. "German")
// - Search by autonym (e.g. "Deutsch")
// - Search by language code (e.g. "de", "zh-yue", "be-x-old")
// - Search by partial word or typo tolerance (e.g. "Germn" -> German)
// - Search in another script (e.g. "日本語")
// - No results empty state (.uls-rewrite__no-results, .uls-no-results-view, or .uls-no-results)
'use strict';
const { test, expect } = require( './support/fixtures' );
const { markKnownIssues } = require( './support/known-issues' );

/**
 * Returns the locator for the skin's language entry trigger.
 * Pinned to exact interactive trigger elements per skin.
 * @param {import('@playwright/test').Page} page
 * @param {string} skin
 */
function getLanguageTrigger( page, skin ) {
	switch ( skin ) {
		case 'vector-2022':
			return page.locator( '#p-lang-btn-checkbox' );
		case 'minerva':
			return page.locator( 'a.language-selector, #page-actions-languages a, a.minerva-icon--language-switcher' ).first();
		case 'vector':
		case 'monobook':
		case 'timeless':
		case 'modern':
			return page.locator( 'button.mw-interlanguage-selector' ).first();
		case 'cologneblue':
			// Cologne Blue does not integrate ULS trigger (Known Issue KI-1)
			return page.locator( '#p-lang-btn-nonexistent' );
		default:
			throw new Error( `Unknown skin: ${ skin }` );
	}
}

/**
 * Opens the selector dialog and returns { dialog, searchInput }.
 * Supports Codex rewrite dialog, Minerva overlay, and legacy ULS settings/menu dialogs.
 * @param {import('@playwright/test').Page} page
 * @param {string} skin
 */
async function openSelectorAndGetSearch( page, skin ) {
	const trigger = getLanguageTrigger( page, skin );
	await expect( trigger, `Language trigger visible for ${ skin }` ).toBeVisible();
	await trigger.scrollIntoViewIfNeeded();
	await trigger.click();

	const dialog = page.locator( [
		'.uls-rewrite:visible',
		'.uls-menu:visible',
		'#language-settings-dialog:visible',
		'#languagesettings:visible',
		'.language-overlay:visible',
		'.overlay-languages:visible',
		'#languages-selector:visible'
	].join( ', ' ) ).first();
	await expect( dialog, 'Selector dialog visible' ).toBeVisible();

	// In legacy dialog (MonoBook, etc.), expand '...' to reveal search filter
	const moreBtn = dialog.locator( '.uls-more-languages:visible' );
	if ( await moreBtn.isVisible() ) {
		await moreBtn.click();
	}

	const searchInput = dialog.locator( [
		'input.uls-languagefilter:visible',
		'.cdx-search-input input:not([disabled]):not([aria-hidden="true"]):visible',
		'input[type="search"]:not([disabled]):not([aria-hidden="true"]):visible',
		'input[role="combobox"]:not([disabled]):not([aria-hidden="true"]):visible'
	].join( ', ' ) ).first();
	await expect( searchInput, 'Search input visible in open selector' ).toBeVisible();
	return { dialog, searchInput };
}

/**
 * Finds matching language result in dialog by language code attribute.
 * Targets specific option elements with data-code or data-language-code,
 * handling standard language code aliases (e.g. zh-yue -> yue, be-x-old -> be-tarask).
 * @param {import('@playwright/test').Locator} dialog
 * @param {string} code
 */
function getLanguageResult( dialog, code ) {
	const codes = [ code ];
	if ( code === 'zh-yue' ) codes.push( 'yue' );
	if ( code === 'be-x-old' ) codes.push( 'be-tarask' );
	const selectors = codes.flatMap( ( c ) => [
		`li[role="option"][data-code="${ c }"]`,
		`li[role="option"][data-language-code="${ c }"]`,
		`[data-language-code="${ c }"]`,
		`[data-code="${ c }"]`,
		`a.uls-languagefilter-link[data-code="${ c }"]`,
		`a[lang="${ c }"]`,
		`li.interwiki-${ c }`
	] );
	return dialog.locator( selectors.join( ', ' ) ).first();
}

// One test per matrix row: the page loads and the selector opens once, then each
// query runs as its own step with soft assertions, so every failing query is still
// listed in the report. Eight separate tests spent ~2200 s of a 20 min full run
// reloading the same page.
const QUERIES = [
	{ step: 'English name "German"', query: 'German', code: 'de', text: /Deutsch|German/, absent: 'ja' },
	{ step: 'autonym "Deutsch"', query: 'Deutsch', code: 'de', text: /Deutsch|German/, absent: 'ja' },
	{ step: 'language code "de"', query: 'de', code: 'de', text: /Deutsch|German/, absent: 'ja' },
	{ step: 'language code "zh-yue"', query: 'zh-yue', code: 'zh-yue', text: /粵語|Cantonese/, absent: 'de' },
	{ step: 'language code "be-x-old"', query: 'be-x-old', code: 'be-x-old', text: /тарашкевіца|be-tarask/, absent: 'de' },
	{ step: 'typo "Germn"', query: 'Germn', code: 'de', text: /Deutsch|German/, absent: 'ja' },
	// Japanese (ja) is in the QA page langlinks; its autonym is 日本語.
	{ step: 'non-Latin script "日本語"', query: '日本語', code: 'ja', text: /日本語|Japanese/, absent: 'de' }
];

test.describe( 'Language search functionality @search', () => {

	test.beforeEach( async ( { uls } ) => {
		markKnownIssues( test, uls, 'search' );
	} );

	test( 'Search by name, autonym, code, typo and script, and the no-results state @search', async ( { page, gotoWiki, uls } ) => {
		await gotoWiki( 'QA ULS search codes' );
		const { dialog, searchInput } = await openSelectorAndGetSearch( page, uls.skin );

		for ( const q of QUERIES ) {
			await test.step( `Search by ${ q.step }`, async () => {
				await searchInput.fill( q.query );
				const item = getLanguageResult( dialog, q.code );
				await expect.soft( item, `"${ q.query }" shows ${ q.code } in the results` ).toBeVisible();
				await expect.soft( item ).toContainText( q.text );
				await expect.soft( getLanguageResult( dialog, q.absent ),
					`Non-matching language ${ q.absent } is hidden for "${ q.query }"` ).toBeHidden();
			} );
		}

		await test.step( 'Search with a non-matching query shows the empty state', async () => {
			await searchInput.fill( 'xyznonexistentlang999' );
			const emptyState = dialog.locator( [
				'.uls-rewrite__no-results',
				'.uls-no-results-view',
				'.uls-no-results',
				'.uls-no-results-found',
				'.cdx-menu__no-results'
			].join( ', ' ) ).first();
			await expect.soft( emptyState, 'Empty search results state is displayed' ).toBeVisible();
		} );
	} );

} );
