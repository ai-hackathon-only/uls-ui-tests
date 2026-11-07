// Feature 2: Language Search (@search)
// User-facing requirements from GOALS.md & FEATURES.md:
// - Search by English name (e.g. "German")
// - Search by autonym (e.g. "Deutsch")
// - Search by language code (e.g. "de", "zh-yue", "simple")
// - Search by partial word or typo tolerance
// - Search in another script (e.g. Cyrillic / Arabic)
// - No results empty state
'use strict';
const { test, expect } = require( './support/fixtures' );

/**
 * Returns the locator for the skin's language trigger.
 * @param {import('@playwright/test').Page} page
 * @param {string} skin
 */
function getLanguageTrigger( page, skin ) {
	if ( skin === 'vector-2022' ) {
		return page.locator( '#p-lang-btn, #p-lang-btn-checkbox, .vector-dropdown' ).first();
	}
	if ( skin === 'minerva' ) {
		return page.locator( '#ca-languages, .language-selector, a[data-event-name="menu.languages"], .minerva-icon--language-switcher' ).first();
	}
	return page.locator( '#p-lang .uls-settings-trigger, #p-lang .mw-interlanguage-selector, #pt-uls a, #p-lang' ).first();
}

/**
 * Opens the selector dialog and returns the search input locator.
 * @param {import('@playwright/test').Page} page
 * @param {string} skin
 */
async function openSelectorAndGetSearch( page, skin ) {
	const trigger = getLanguageTrigger( page, skin );
	await expect( trigger, `Language trigger visible for ${ skin }` ).toBeVisible();
	await trigger.click();

	const searchInput = page.locator( 'input.uls-languagefilter, .uls-rewrite__search-active input, input[type="search"]' ).first();
	await expect( searchInput, 'Search input visible in open selector' ).toBeVisible();
	return searchInput;
}

test.describe( 'Language search functionality @search', () => {

	test( 'Search by English name displays target language @search', async ( { page, gotoWiki, uls } ) => {
		await gotoWiki( 'QA ULS search codes' );
		const searchInput = await openSelectorAndGetSearch( page, uls.skin );

		await searchInput.fill( 'German' );
		// Verify result contains German / Deutsch
		const resultItem = page.locator( '.uls-language-list, .uls-rewrite__body' ).locator( 'text=Deutsch, text=German, [data-code="de"]' ).first();
		await expect( resultItem, 'German language item displayed in search results' ).toBeVisible();
	} );

	test( 'Search by autonym displays target language @search', async ( { page, gotoWiki, uls } ) => {
		await gotoWiki( 'QA ULS search codes' );
		const searchInput = await openSelectorAndGetSearch( page, uls.skin );

		await searchInput.fill( 'Deutsch' );
		const resultItem = page.locator( '.uls-language-list, .uls-rewrite__body' ).locator( 'text=Deutsch, [data-code="de"]' ).first();
		await expect( resultItem, 'Autonym Deutsch displayed in search results' ).toBeVisible();
	} );

	test( 'Search by language code displays target language @search', async ( { page, gotoWiki, uls } ) => {
		await gotoWiki( 'QA ULS search codes' );
		const searchInput = await openSelectorAndGetSearch( page, uls.skin );

		await searchInput.fill( 'zh-yue' );
		const resultItem = page.locator( '.uls-language-list, .uls-rewrite__body' ).locator( 'text=粵語, text=Cantonese, [data-code="zh-yue"]' ).first();
		await expect( resultItem, 'Cantonese (zh-yue) displayed when searching language code' ).toBeVisible();
	} );

	test( 'Search with typo or prefix tolerance displays matches @search', async ( { page, gotoWiki, uls } ) => {
		await gotoWiki( 'QA ULS search codes' );
		const searchInput = await openSelectorAndGetSearch( page, uls.skin );

		await searchInput.fill( 'Germn' );
		const resultItem = page.locator( '.uls-language-list, .uls-rewrite__body' ).locator( 'text=Deutsch, text=German, [data-code="de"]' ).first();
		await expect( resultItem, 'Typo query "Germn" successfully matches German' ).toBeVisible();
	} );

	test( 'Search in non-Latin script displays matching language @search', async ( { page, gotoWiki, uls } ) => {
		await gotoWiki( 'QA ULS search codes' );
		const searchInput = await openSelectorAndGetSearch( page, uls.skin );

		// Searching in Cyrillic for Russian / German
		await searchInput.fill( 'Русский' );
		const resultItem = page.locator( '.uls-language-list, .uls-rewrite__body' ).locator( 'text=Русский, [data-code="ru"]' ).first();
		await expect( resultItem, 'Cyrillic query matches Russian language' ).toBeVisible();
	} );

	test( 'Search with non-matching query displays empty state @search', async ( { page, gotoWiki, uls } ) => {
		await gotoWiki( 'QA ULS search codes' );
		const searchInput = await openSelectorAndGetSearch( page, uls.skin );

		await searchInput.fill( 'xyznonexistentlang999' );
		const emptyState = page.locator( '.uls-no-results-found, .uls-rewrite__no-results, .uls-rewrite__empty, [data-testid="empty-search"]' ).first();
		await expect( emptyState, 'Empty search results state is displayed' ).toBeVisible();
	} );

} );
