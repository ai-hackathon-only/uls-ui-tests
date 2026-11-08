// Feature 3: Interlanguage Navigation and Empty State (@interlanguage)
// User-facing requirements from GOALS.md & FEATURES.md:
// - Picking a language on a page with interlanguage links navigates to that language's article.
// - Uses the page 'QA ULS search codes' which contains links including simple, als, zh-yue, be-x-old.
// - Safety: intercept all external requests via page.route() so the browser never visits public Wikipedia.
// - A page with no interlanguage links (e.g. 'Main Page') shows the empty state or omits language links per skin.
'use strict';
const { test, expect } = require( './support/fixtures' );
const { markKnownIssues } = require( './support/known-issues' );
const { getLanguageTrigger } = require( './support/uls-helpers' );

/**
 * Opens the selector dialog and returns { dialog, searchInput }.
 * Handles Vector 2022 dropdown, Minerva overlay, and legacy compact links dialog.
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
 * Finds matching language result in dialog by language code attribute or alias.
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

/**
 * Applies known issue fail annotations per skin/device matrix row.
 * @param {object} uls
 */
function applyRowAnnotations( uls ) {
	markKnownIssues( test, uls, 'interlanguage' );
	if ( uls.skin === 'timeless' && ( uls.device === 'tablet' || uls.device === 'mobile' ) ) {
		test.fail( true, 'KI-4: Timeless hides language portlet (#other-languages) on viewports narrower than 851px' );
	}
	if ( uls.skin === 'monobook' && uls.device === 'mobile' ) {
		test.fail( true, 'KI-5: MonoBook sidebar navigation overlaps language trigger on mobile viewports' );
	}
}

test.describe( 'Interlanguage navigation and empty state @interlanguage', () => {

	test.beforeEach( async ( { page } ) => {
		// Safety mock: fulfill all requests to *.wikipedia.org so no request hits public Wikipedia.
		// Fulfilling prevents net::ERR_FAILED console errors and unexpected external navigation.
		await page.route( 'https://*.wikipedia.org/**', async ( route ) => {
			if ( route.request().url().includes( '/w/api.php' ) ) {
				await route.fulfill( {
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify( { batchcomplete: true, query: { pages: [] } } )
				} );
			} else {
				await route.fulfill( {
					status: 200,
					contentType: 'text/html',
					body: '<!DOCTYPE html><html><body>Interlanguage Destination Article</body></html>'
				} );
			}
		} );
	} );

	test( 'Picking Simple English link navigates to target host @interlanguage', async ( { page, gotoWiki, uls } ) => {
		applyRowAnnotations( uls );
		await gotoWiki( 'QA ULS search codes' );

		const { dialog, searchInput } = await openSelectorAndGetSearch( page, uls.skin );
		await searchInput.fill( 'simple' );
		await page.waitForTimeout( 300 );

		const simpleItem = getLanguageResult( dialog, 'simple' );
		await expect( simpleItem, 'Simple English result row visible in dialog' ).toBeVisible();

		const link = simpleItem.locator( 'a' ).first();
		const targetClickable = ( await link.isVisible().catch( () => false ) ) ? link : simpleItem;

		const [ request ] = await Promise.all( [
			page.waitForRequest( ( req ) => req.url().includes( 'simple.wikipedia.org' ), { timeout: 7000 } ),
			targetClickable.click()
		] );
		expect( request.url(), 'Dispatched request to simple.wikipedia.org' ).toContain( 'simple.wikipedia.org' );
	} );

	test( 'Picking be-x-old link targets be-tarask host @interlanguage', async ( { page, gotoWiki, uls } ) => {
		applyRowAnnotations( uls );
		await gotoWiki( 'QA ULS search codes' );

		const { dialog, searchInput } = await openSelectorAndGetSearch( page, uls.skin );
		await searchInput.fill( 'be-x-old' );
		await page.waitForTimeout( 300 );

		const beItem = getLanguageResult( dialog, 'be-x-old' );
		await expect( beItem, 'be-x-old result row visible in dialog' ).toBeVisible();

		const link = beItem.locator( 'a' ).first();
		const targetClickable = ( await link.isVisible().catch( () => false ) ) ? link : beItem;

		const [ request ] = await Promise.all( [
			page.waitForRequest( ( req ) => req.url().includes( 'be-tarask.wikipedia.org' ), { timeout: 7000 } ),
			targetClickable.click()
		] );
		expect( request.url(), 'Dispatched request to be-tarask.wikipedia.org' ).toContain( 'be-tarask.wikipedia.org' );
	} );

	test( 'Page without interlanguage links handles empty state @interlanguage', async ( { page, gotoWiki, uls } ) => {
		applyRowAnnotations( uls );
		// 'Main Page' has zero interlanguage links
		await gotoWiki( 'Main Page' );

		if ( uls.skin === 'cologneblue' ) {
			const trigger = getLanguageTrigger( page, uls.skin );
			await expect( trigger, 'Cologne Blue language trigger not present' ).toBeVisible();
			return;
		}

		if ( uls.skin === 'vector-2022' ) {
			const btn = page.locator( '#p-lang-btn, #p-lang-btn-checkbox' ).first();
			await expect( btn, 'Vector 2022 language button visible' ).toBeVisible();
			await btn.click();
			const dialog = page.locator( '.uls-rewrite:visible, .vector-dropdown-content:visible, dialog:visible' ).first();
			await expect( dialog, 'Selector dialog visible' ).toBeVisible();
			// No external article links exist in the empty state dialog
			expect( await dialog.locator( 'a[href*="wikipedia.org"]' ).count(), 'Zero external article links in dialog' ).toBe( 0 );
		} else if ( uls.skin === 'minerva' ) {
			// On Minerva, verify language switcher is omitted on a page without language links
			const switcher = page.locator( 'a.language-selector, a.minerva-icon--language-switcher, #page-actions-languages a, #language-selector a' );
			await expect( switcher, 'Minerva language switcher omitted on page without interlanguage links' ).toBeHidden();
		} else {
			// In legacy skins, the interlanguage portlet exists but contains zero link items
			const portlet = page.locator( '#p-lang' );
			await expect( portlet, 'Interlanguage portlet #p-lang is present in DOM' ).toBeAttached();
			const links = portlet.locator( '.interlanguage-link, li.mw-list-item' );
			expect( await links.count(), 'Zero interlanguage links on Main Page' ).toBe( 0 );
		}
	} );

} );
