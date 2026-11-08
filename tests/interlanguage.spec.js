// Feature 3: Interlanguage Navigation and Empty State (@interlanguage)
// User-facing requirements from GOALS.md & FEATURES.md:
// - Picking a language on a page with interlanguage links navigates to that language's article.
// - Uses the page 'QA ULS search codes' which contains links including simple, als, zh-yue, be-x-old.
// - Safety: intercept all external requests via page.route() so the browser never visits public Wikipedia.
// - A page with no interlanguage links (e.g. 'Main Page') shows the empty state or omits language links per skin.
'use strict';
const { test, expect } = require( './support/fixtures' );
const { markKnownIssues } = require( './support/known-issues' );

/**
 * Ensures the target language link is visible and accessible for the given skin.
 * In Vector 2022 and Minerva, opens the ULS selector dialog/overlay.
 * In legacy skins (Vector, MonoBook, Timeless, Modern), if compact links collapsed
 * the list, clicks the compact button (button.mw-interlanguage-selector) to open the dialog.
 * In Cologne Blue, attempts to locate the missing portlet (fails as expected by KI-1).
 * @param {import('@playwright/test').Page} page
 * @param {string} skin
 * @param {string} hostPart e.g. 'simple.wikipedia.org'
 */
async function ensureLanguageLinkVisible( page, skin, hostPart ) {
	if ( skin === 'cologneblue' ) {
		// Cologne Blue has no ULS trigger or portlet (Known Issue KI-1)
		await expect( page.locator( '#p-lang, #p-lang-btn' ), 'Language portlet in Cologne Blue' ).toBeVisible();
		return;
	}

	if ( skin === 'vector-2022' ) {
		const trigger = page.locator( '#p-lang-btn, #p-lang-btn-checkbox' ).first();
		await expect( trigger, 'Vector 2022 language button visible' ).toBeVisible();
		await trigger.click();
		await expect( page.locator( '.uls-rewrite:visible, .vector-dropdown-content:visible, dialog:visible' ).first(), 'Selector dialog visible' ).toBeVisible();
	} else if ( skin === 'minerva' ) {
		const trigger = page.locator( 'a.language-selector, a.minerva-icon--language-switcher, #page-actions-languages a, #language-selector a' ).first();
		await expect( trigger, 'Minerva language switcher visible' ).toBeVisible();
		await trigger.click();
		await expect( page.locator( '.uls-rewrite:visible, .overlay:visible, .language-overlay:visible, #languages' ).first(), 'Minerva languages overlay visible' ).toBeVisible();
	} else {
		// Legacy desktop skins (vector, monobook, timeless, modern)
		const targetLink = page.locator( `#p-lang a[href*="${ hostPart }"]` ).first();
		const compactBtn = page.locator( 'button.mw-interlanguage-selector, #p-lang button.mw-interlanguage-selector, #p-lang button.uls-more-languages' ).first();

		const hasDirect = await targetLink.isVisible().catch( () => false );
		if ( !hasDirect ) {
			if ( await compactBtn.isVisible().catch( () => false ) ) {
				await compactBtn.click();
				await expect( page.locator( '.uls-rewrite:visible, .uls-menu:visible, dialog:visible' ).first(), 'Compact links selector dialog visible' ).toBeVisible();
			}
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

	test( 'Picking Simple English link navigates to target host @interlanguage', async ( { page, gotoWiki, uls } ) => {
		applyRowAnnotations( uls );

		let interceptedUrl = null;
		await page.route( 'https://simple.wikipedia.org/**', async ( route ) => {
			interceptedUrl = route.request().url();
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
					body: '<!DOCTYPE html><html><body>Simple English Destination Article</body></html>'
				} );
			}
		} );

		await gotoWiki( 'QA ULS search codes' );
		await ensureLanguageLinkVisible( page, uls.skin, 'simple.wikipedia.org' );

		const simpleLink = getInterlanguageLink( page, 'simple.wikipedia.org' );
		await expect( simpleLink, 'Simple English link visible' ).toBeVisible();
		const href = await simpleLink.getAttribute( 'href' );
		expect( href, 'Simple English destination href targets simple.wikipedia.org' ).toContain( 'simple.wikipedia.org' );

		await simpleLink.click();
		await expect.poll( () => interceptedUrl, {
			message: 'Expected navigation request to simple.wikipedia.org',
			timeout: 7000
		} ).toContain( 'simple.wikipedia.org' );
	} );

	test( 'Picking be-x-old link targets be-tarask host @interlanguage', async ( { page, gotoWiki, uls } ) => {
		applyRowAnnotations( uls );

		let interceptedUrl = null;
		await page.route( 'https://be-tarask.wikipedia.org/**', async ( route ) => {
			interceptedUrl = route.request().url();
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
					body: '<!DOCTYPE html><html><body>be-tarask Destination Article</body></html>'
				} );
			}
		} );

		await gotoWiki( 'QA ULS search codes' );
		await ensureLanguageLinkVisible( page, uls.skin, 'be-tarask.wikipedia.org' );

		const beLink = getInterlanguageLink( page, 'be-tarask.wikipedia.org' );
		await expect( beLink, 'be-x-old (be-tarask) link visible' ).toBeVisible();
		const href = await beLink.getAttribute( 'href' );
		expect( href, 'be-x-old destination href targets be-tarask.wikipedia.org' ).toContain( 'be-tarask.wikipedia.org' );

		await beLink.click();
		await expect.poll( () => interceptedUrl, {
			message: 'Expected navigation request to be-tarask.wikipedia.org',
			timeout: 7000
		} ).toContain( 'be-tarask.wikipedia.org' );
	} );

	test( 'Page without interlanguage links handles empty state @interlanguage', async ( { page, gotoWiki, uls } ) => {
		applyRowAnnotations( uls );
		// 'Main Page' has zero interlanguage links (verified via prop=langlinks API)
		await gotoWiki( 'Main Page' );

		if ( uls.skin === 'cologneblue' ) {
			const trigger = page.locator( '#p-lang, #p-lang-btn' );
			await expect( trigger, 'Cologne Blue language trigger not present' ).toBeVisible();
			return;
		}

		if ( uls.skin === 'vector-2022' ) {
			const btn = page.locator( '#p-lang-btn, #p-lang-btn-checkbox' ).first();
			await expect( btn, 'Vector 2022 language button visible' ).toBeVisible();
			await btn.click();
			const dialog = page.locator( '.uls-rewrite:visible, .vector-dropdown-content:visible, dialog:visible' ).first();
			await expect( dialog, 'Selector dialog or dropdown visible' ).toBeVisible();
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
