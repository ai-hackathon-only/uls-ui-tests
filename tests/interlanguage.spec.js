// Feature 3: Interlanguage Navigation (@interlanguage)
// User-facing requirements from GOALS.md & FEATURES.md:
// - Picking a language on a page with interlanguage links navigates to that language's article
// - Uses the page 'QA ULS search codes' which contains links including simple, als, zh-yue, be-x-old
// - Safety: intercept all external requests via page.route() so browser never visits public Wikipedia
// - A page with no interlanguage links (e.g. 'Main Page') shows the empty state or suppresses language links per skin
'use strict';
const { test, expect } = require( './support/fixtures' );
const { markKnownIssues } = require( './support/known-issues' );

/**
 * Ensures the language entrypoint or dialog is open for the given skin when needed.
 * In Vector 2022 and Minerva, opens the ULS selector dialog/overlay.
 * In legacy skins (Vector, MonoBook, Timeless, Modern), if compact links collapsed
 * the list, clicks the compact button (button.mw-interlanguage-selector) to open the dialog.
 * @param {import('@playwright/test').Page} page
 * @param {string} skin
 */
async function openLanguageSelectorIfNeeded( page, skin ) {
	if ( skin === 'cologneblue' ) {
		return;
	}

	if ( skin === 'vector-2022' ) {
		const trigger = page.locator( '#p-lang-btn-checkbox, #p-lang-btn' ).first();
		await expect( trigger, 'Vector 2022 language button visible' ).toBeVisible();
		await trigger.click();
		await expect(
			page.locator( '.uls-rewrite:visible, .vector-dropdown-content:visible, dialog:visible' ).first(),
			'Selector dialog or dropdown visible'
		).toBeVisible();
	} else if ( skin === 'minerva' ) {
		const trigger = page.locator( 'a.language-selector, #page-actions-languages a, a.minerva-icon--language-switcher' ).first();
		await expect( trigger, 'Minerva language switcher visible' ).toBeVisible();
		await trigger.click();
		await expect(
			page.locator( '.uls-rewrite:visible, .overlay:visible, #languages' ).first(),
			'Minerva languages overlay visible'
		).toBeVisible();
	} else {
		// Legacy desktop skins (vector, monobook, timeless, modern)
		const compactBtn = page.locator( 'button.mw-interlanguage-selector' ).first();
		if ( await compactBtn.isVisible().catch( () => false ) ) {
			await compactBtn.click();
			await expect(
				page.locator( '.uls-rewrite:visible, .uls-menu:visible, dialog:visible' ).first(),
				'Compact links dialog visible'
			).toBeVisible();
		}
	}
}

/**
 * Returns a locator for the visible interlanguage link matching hostPart.
 * @param {import('@playwright/test').Page} page
 * @param {string} hostPart
 */
function getInterlanguageLink( page, hostPart ) {
	return page.locator( [
		`a[href*="${ hostPart }"]:visible`,
		`.uls-rewrite a[href*="${ hostPart }"]`,
		`.vector-dropdown-content a[href*="${ hostPart }"]`,
		`#p-lang a[href*="${ hostPart }"]`
	].join( ', ' ) ).first();
}

test.describe( 'Interlanguage navigation and empty state @interlanguage', () => {

	test.beforeEach( async ( { page, uls } ) => {
		markKnownIssues( test, uls, 'interlanguage' );

		// Safety mock: fulfill all requests to *.wikipedia.org so no request hits public Wikipedia.
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
					body: '<!DOCTYPE html><html><body>Interlanguage Destination</body></html>'
				} );
			}
		} );
	} );

	test( 'Picking Simple English link navigates to target host @interlanguage', async ( { page, gotoWiki, uls } ) => {
		await gotoWiki( 'QA ULS search codes' );
		await openLanguageSelectorIfNeeded( page, uls.skin );

		const simpleLink = getInterlanguageLink( page, 'simple.wikipedia.org' );
		await expect( simpleLink, 'Simple English link visible' ).toBeVisible();
		const href = await simpleLink.getAttribute( 'href' );
		expect( href, 'Simple English destination href targets simple.wikipedia.org' ).toContain( 'simple.wikipedia.org' );

		// Click the link and verify the navigation request is dispatched
		const [ request ] = await Promise.all( [
			page.waitForRequest( ( req ) => req.url().includes( 'simple.wikipedia.org' ), { timeout: 5000 } ),
			simpleLink.click()
		] );
		expect( request.url(), 'Intercepted request to simple.wikipedia.org' ).toContain( 'simple.wikipedia.org' );
	} );

	test( 'Picking be-x-old link targets be-tarask host @interlanguage', async ( { page, gotoWiki, uls } ) => {
		await gotoWiki( 'QA ULS search codes' );
		await openLanguageSelectorIfNeeded( page, uls.skin );

		const beLink = getInterlanguageLink( page, 'be-tarask.wikipedia.org' );
		await expect( beLink, 'be-x-old (be-tarask) link visible' ).toBeVisible();
		const href = await beLink.getAttribute( 'href' );
		expect( href, 'be-x-old destination href targets be-tarask.wikipedia.org' ).toContain( 'be-tarask.wikipedia.org' );

		const [ request ] = await Promise.all( [
			page.waitForRequest( ( req ) => req.url().includes( 'be-tarask.wikipedia.org' ), { timeout: 5000 } ),
			beLink.click()
		] );
		expect( request.url(), 'Intercepted request to be-tarask.wikipedia.org' ).toContain( 'be-tarask.wikipedia.org' );
	} );

	test( 'Page without interlanguage links handles empty state @interlanguage', async ( { page, gotoWiki, uls } ) => {
		// 'Main Page' has zero interlanguage links (verified via prop=langlinks API)
		await gotoWiki( 'Main Page' );

		if ( uls.skin === 'cologneblue' ) {
			await expect( page.locator( '#p-lang, #p-lang-btn' ), 'Language portlet in Cologne Blue' ).toBeVisible();
			return;
		}

		if ( uls.skin === 'vector-2022' ) {
			const btn = page.locator( '#p-lang-btn, #p-lang-btn-checkbox' ).first();
			await expect( btn, 'Vector 2022 language button visible' ).toBeVisible();
			await btn.click();
			const dialog = page.locator( '.uls-rewrite:visible, .vector-dropdown-content:visible, dialog:visible' ).first();
			await expect( dialog, 'Selector dialog or dropdown visible' ).toBeVisible();
			// No external article links exist in the dialog
			expect( await dialog.locator( 'a[href*="wikipedia.org"]' ).count(), 'Zero external article links in dialog' ).toBe( 0 );
		} else if ( uls.skin === 'minerva' ) {
			// On Minerva, verify the page actions toolbar is present, but language switcher is omitted
			const pageActions = page.locator( '#page-actions, .page-actions-menu' );
			await expect( pageActions, 'Minerva page actions toolbar visible' ).toBeVisible();
			const trigger = pageActions.locator( 'a.language-selector, a.minerva-icon--language-switcher' );
			expect( await trigger.count(), 'Language switcher omitted on page without interlanguage links' ).toBe( 0 );
		} else {
			// In legacy skins, the interlanguage portlet exists but contains zero link items
			const portlet = page.locator( '#p-lang' );
			await expect( portlet, 'Interlanguage portlet #p-lang is present in DOM' ).toBeAttached();
			const links = portlet.locator( '.interlanguage-link, li.mw-list-item' );
			expect( await links.count(), 'Zero interlanguage links on Main Page' ).toBe( 0 );
		}
	} );

} );
