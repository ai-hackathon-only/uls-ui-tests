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
 * Returns the locator for the skin's language trigger.
 * @param {import('@playwright/test').Page} page
 * @param {string} skin
 */
function getLanguageTrigger( page, skin ) {
	switch ( skin ) {
		case 'vector-2022':
			return page.locator( '#p-lang-btn' );
		case 'minerva':
			return page.locator( '#language-selector' );
		case 'vector':
		case 'monobook':
		case 'timeless':
		case 'modern':
		case 'cologneblue':
			return page.locator( 'button.mw-interlanguage-selector, #p-lang .uls-settings-trigger, #p-lang' ).first();
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

	const dialog = page.locator( '.uls-rewrite:visible, .uls-menu:visible, #languagesettings:visible' ).first();
	await expect( dialog, 'Selector dialog visible' ).toBeVisible();

	const searchInput = dialog.locator( 'input.uls-languagefilter, .cdx-search-input input, input[type="search"]' ).first();
	await expect( searchInput, 'Search input visible in open selector' ).toBeVisible();
	return { dialog, searchInput };
}

/**
 * Finds matching language result in dialog by code or text regex.
 * Uses .filter({ hasText }) and [data-language-code]/[data-code] locators.
 * @param {import('@playwright/test').Locator} dialog
 * @param {string} code
 * @param {RegExp} textRegex
 */
function getLanguageResult( dialog, code, textRegex ) {
	const byAttr = dialog.locator( `[data-language-code="${ code }"], [data-code="${ code }"]` );
	const byText = dialog.locator( '[role="option"], .autonym, .cdx-menu-item, .uls-language-list a, .uls-languagefilter-link' ).filter( { hasText: textRegex } );
	return byAttr.or( byText ).first();
}

test.describe( 'Language search functionality @search', () => {

	test( 'Search by English name displays target language @search', async ( { page, gotoWiki, uls } ) => {
		await gotoWiki( 'QA ULS search codes' );
		const { dialog, searchInput } = await openSelectorAndGetSearch( page, uls.skin );

		await searchInput.fill( 'German' );
		const germanItem = getLanguageResult( dialog, 'de', /Deutsch|German/ );
		await expect( germanItem, 'German language item displayed in search results' ).toBeVisible();
	} );

	test( 'Search by autonym displays target language @search', async ( { page, gotoWiki, uls } ) => {
		await gotoWiki( 'QA ULS search codes' );
		const { dialog, searchInput } = await openSelectorAndGetSearch( page, uls.skin );

		await searchInput.fill( 'Deutsch' );
		const germanItem = getLanguageResult( dialog, 'de', /Deutsch|German/ );
		await expect( germanItem, 'Autonym Deutsch displayed in search results' ).toBeVisible();
	} );

	test( 'Search by language code displays target language @search', async ( { page, gotoWiki, uls } ) => {
		await gotoWiki( 'QA ULS search codes' );
		const { dialog, searchInput } = await openSelectorAndGetSearch( page, uls.skin );

		// Test 'de' code
		await searchInput.fill( 'de' );
		const deItem = getLanguageResult( dialog, 'de', /Deutsch|German/ );
		await expect( deItem, 'de language code matches Deutsch' ).toBeVisible();

		// Test 'zh-yue' code
		await searchInput.fill( 'zh-yue' );
		const yueItem = getLanguageResult( dialog, 'zh-yue', /粵語|Cantonese/ );
		await expect( yueItem, 'zh-yue language code matches Cantonese' ).toBeVisible();

		// Test 'be-x-old' code (be-tarask)
		await searchInput.fill( 'be-x-old' );
		const beItem = dialog.locator( '[data-language-code="be-tarask"], [data-language-code="be-x-old"], [data-code="be-tarask"], [data-code="be-x-old"]' )
			.or( dialog.locator( '[role="option"], .autonym, .cdx-menu-item, .uls-language-list a' ).filter( { hasText: /тарашкевіца|be-tarask/ } ) )
			.first();
		await expect( beItem, 'be-x-old language code matches be-tarask' ).toBeVisible();
	} );

	test( 'Search with typo or prefix tolerance displays matches @search', async ( { page, gotoWiki, uls } ) => {
		await gotoWiki( 'QA ULS search codes' );
		const { dialog, searchInput } = await openSelectorAndGetSearch( page, uls.skin );

		await searchInput.fill( 'Germn' );
		const germanItem = getLanguageResult( dialog, 'de', /Deutsch|German/ );
		await expect( germanItem, 'Typo query "Germn" successfully matches German' ).toBeVisible();
	} );

	test( 'Search in non-Latin script displays matching language @search', async ( { page, gotoWiki, uls } ) => {
		await gotoWiki( 'QA ULS search codes' );
		const { dialog, searchInput } = await openSelectorAndGetSearch( page, uls.skin );

		// Japanese (ja) is present on QA page langlinks; autonym is 日本語
		await searchInput.fill( '日本語' );
		const jaItem = getLanguageResult( dialog, 'ja', /日本語|Japanese/ );
		await expect( jaItem, 'Non-Latin query "日本語" matches Japanese' ).toBeVisible();
	} );

	test( 'Search with non-matching query displays empty state @search', async ( { page, gotoWiki, uls } ) => {
		await gotoWiki( 'QA ULS search codes' );
		const { dialog, searchInput } = await openSelectorAndGetSearch( page, uls.skin );

		await searchInput.fill( 'xyznonexistentlang999' );
		const emptyState = dialog.locator( '.uls-rewrite__no-results, .uls-no-results-found, .cdx-menu__no-results' ).first();
		await expect( emptyState, 'Empty search results state is displayed' ).toBeVisible();
	} );

} );
