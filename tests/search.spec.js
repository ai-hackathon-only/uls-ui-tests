// Feature 2: Language Search (@search)
// User-facing requirements from GOALS.md & FEATURES.md:
// - Search by English name (e.g. "German")
// - Search by autonym (e.g. "Deutsch")
// - Search by language code (e.g. "de", "zh-yue", "be-x-old")
// - Search by partial word or typo tolerance (e.g. "Germn" -> German)
// - Search in another script (e.g. "日本語")
// - No results empty state (.uls-rewrite__no-results or .uls-no-results-found)
'use strict';
const { test, expect } = require( './support/fixtures' );

/**
 * Returns the locator for the skin's language entry trigger.
 * Pinned to exact interactive trigger elements per skin.
 * @param {import('@playwright/test').Page} page
 * @param {string} skin
 */
function getLanguageTrigger( page, skin ) {
	switch ( skin ) {
		case 'vector-2022':
			return page.locator( '#p-lang-btn-checkbox, #p-lang-btn' ).first();
		case 'minerva':
			return page.locator( '#language-selector a.language-selector, #language-selector a, #language-selector' ).first();
		case 'vector':
		case 'monobook':
		case 'timeless':
		case 'modern':
			return page.locator( 'button.mw-interlanguage-selector, .uls-settings-trigger' ).first();
		case 'cologneblue':
			// Cologne Blue does not integrate ULS trigger (Known Issue KI-1)
			return page.locator( '#p-lang-btn-nonexistent' );
		default:
			throw new Error( `Unknown skin: ${ skin }` );
	}
}

/**
 * Opens the selector dialog and returns { dialog, searchInput }.
 * @param {import('@playwright/test').Page} page
 * @param {string} skin
 */
async function openSelectorAndGetSearch( page, skin ) {
	const trigger = getLanguageTrigger( page, skin );
	await expect( trigger, `Language trigger visible for ${ skin }` ).toBeVisible();
	await trigger.click();

	const dialog = page.locator( '.uls-rewrite:visible, .uls-menu:visible, #languagesettings:visible, .mw-language-selector:visible' ).first();
	await expect( dialog, 'Selector dialog visible' ).toBeVisible();

	const searchInput = dialog.locator( 'input.uls-languagefilter, .cdx-search-input input, input[type="search"]' ).first();
	await expect( searchInput, 'Search input visible in open selector' ).toBeVisible();
	return { dialog, searchInput };
}

/**
 * Finds matching language result in dialog by language code attribute.
 * Targets specific option elements with data-code or data-language-code.
 * @param {import('@playwright/test').Locator} dialog
 * @param {string} code
 */
function getLanguageResult( dialog, code ) {
	return dialog.locator(
		`li[role="option"][data-code="${ code }"], ` +
		`li[role="option"][data-language-code="${ code }"], ` +
		`[data-language-code="${ code }"], ` +
		`[data-code="${ code }"], ` +
		`a.uls-languagefilter-link[data-code="${ code }"]`
	).first();
}

test.describe( 'Language search functionality @search', () => {

	test.beforeEach( async ( { uls } ) => {
		if ( uls.skin === 'cologneblue' ) {
			test.fixme( true, 'Known issue KI-1: Cologne Blue has no visible ULS trigger (#17)' );
		}
	} );

	test( 'Search by English name displays target language @search', async ( { page, gotoWiki, uls } ) => {
		await gotoWiki( 'QA ULS search codes' );
		const { dialog, searchInput } = await openSelectorAndGetSearch( page, uls.skin );

		await searchInput.fill( 'German' );
		const germanItem = getLanguageResult( dialog, 'de' );
		await expect( germanItem, 'German language item displayed in search results' ).toBeVisible();
		await expect( germanItem ).toContainText( /Deutsch|German/ );
	} );

	test( 'Search by autonym displays target language @search', async ( { page, gotoWiki, uls } ) => {
		await gotoWiki( 'QA ULS search codes' );
		const { dialog, searchInput } = await openSelectorAndGetSearch( page, uls.skin );

		await searchInput.fill( 'Deutsch' );
		const germanItem = getLanguageResult( dialog, 'de' );
		await expect( germanItem, 'Autonym Deutsch displayed in search results' ).toBeVisible();
		await expect( germanItem ).toContainText( /Deutsch|German/ );
	} );

	test( 'Search by language code displays target language @search', async ( { page, gotoWiki, uls } ) => {
		await gotoWiki( 'QA ULS search codes' );
		const { dialog, searchInput } = await openSelectorAndGetSearch( page, uls.skin );

		// Test 'de' code
		await searchInput.fill( 'de' );
		const deItem = getLanguageResult( dialog, 'de' );
		await expect( deItem, 'de language code matches Deutsch' ).toBeVisible();
		await expect( deItem ).toContainText( /Deutsch|German/ );

		// Test 'zh-yue' code
		await searchInput.fill( 'zh-yue' );
		const yueItem = getLanguageResult( dialog, 'zh-yue' );
		await expect( yueItem, 'zh-yue language code matches Cantonese' ).toBeVisible();
		await expect( yueItem ).toContainText( /粵語|Cantonese/ );

		// Test 'be-x-old' code (be-tarask)
		await searchInput.fill( 'be-x-old' );
		const beItem = dialog.locator(
			'[data-language-code="be-tarask"], [data-language-code="be-x-old"], ' +
			'[data-code="be-tarask"], [data-code="be-x-old"]'
		).first();
		await expect( beItem, 'be-x-old language code matches be-tarask' ).toBeVisible();
		await expect( beItem ).toContainText( /тарашкевіца|be-tarask/ );
	} );

	test( 'Search with typo or prefix tolerance displays matches @search', async ( { page, gotoWiki, uls } ) => {
		await gotoWiki( 'QA ULS search codes' );
		const { dialog, searchInput } = await openSelectorAndGetSearch( page, uls.skin );

		await searchInput.fill( 'Germn' );
		const germanItem = getLanguageResult( dialog, 'de' );
		await expect( germanItem, 'Typo query "Germn" successfully matches German' ).toBeVisible();
		await expect( germanItem ).toContainText( /Deutsch|German/ );
	} );

	test( 'Search in non-Latin script displays matching language @search', async ( { page, gotoWiki, uls } ) => {
		await gotoWiki( 'QA ULS search codes' );
		const { dialog, searchInput } = await openSelectorAndGetSearch( page, uls.skin );

		// Japanese (ja) is present on QA page langlinks; autonym is 日本語
		await searchInput.fill( '日本語' );
		const jaItem = getLanguageResult( dialog, 'ja' );
		await expect( jaItem, 'Non-Latin query "日本語" matches Japanese' ).toBeVisible();
		await expect( jaItem ).toContainText( /日本語|Japanese/ );
	} );

	test( 'Search with non-matching query displays empty state @search', async ( { page, gotoWiki, uls } ) => {
		await gotoWiki( 'QA ULS search codes' );
		const { dialog, searchInput } = await openSelectorAndGetSearch( page, uls.skin );

		await searchInput.fill( 'xyznonexistentlang999' );
		const emptyState = dialog.locator( '.uls-rewrite__no-results, .uls-no-results-found, .cdx-menu__no-results' ).first();
		await expect( emptyState, 'Empty search results state is displayed' ).toBeVisible();
	} );

} );
