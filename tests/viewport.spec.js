// Feature 10: Small Screens & Viewport Responsiveness (@viewport)
// User-facing requirements from GOALS.md & FEATURES.md:
// - Small screens: the selector fits the viewport (no horizontal scroll).
// - Works by touch tap on mobile and tablet touch devices.
'use strict';
const { test, expect } = require( './support/fixtures' );

/**
 * Returns the locator for the skin's language entry trigger.
 * @param {import('@playwright/test').Page} page
 * @param {string} skin
 */
function getLanguageTrigger( page, skin ) {
	switch ( skin ) {
		case 'vector-2022':
			return page.locator( '#p-lang-btn-checkbox' );
		case 'minerva':
			return page.locator( '#language-selector a.language-selector, #language-selector a' ).first();
		case 'vector':
		case 'monobook':
		case 'timeless':
		case 'modern':
			return page.locator( 'button.mw-interlanguage-selector, .uls-settings-trigger' ).first();
		case 'cologneblue':
			return page.locator( '#p-lang-btn-nonexistent' );
		default:
			throw new Error( `Unknown skin: ${ skin }` );
	}
}

/**
 * Returns the locator for the open language selector dialog.
 * @param {import('@playwright/test').Page} page
 */
function getSelectorDialog( page ) {
	return page.locator( '.uls-rewrite:visible, .uls-menu:visible, #languagesettings:visible' ).first();
}

test.describe( 'Small screens & viewport responsiveness (@viewport)', () => {

	test.beforeEach( ( { uls } ) => {
		if ( uls.skin === 'cologneblue' ) {
			test.fixme( true, 'KI-1: Cologne Blue has no ULS trigger' );
		}
	} );

	test( 'Selector fits mobile and tablet viewport without horizontal scroll @viewport', async ( { page, gotoWiki, uls } ) => {
		if ( uls.device !== 'mobile' && uls.device !== 'tablet' ) {
			test.skip( true, 'Applies to mobile and tablet viewports' );
		}

		await gotoWiki( 'QA ULS search codes' );

		const trigger = getLanguageTrigger( page, uls.skin );
		await expect( trigger ).toBeVisible();
		await trigger.click();

		const dialog = getSelectorDialog( page );
		await expect( dialog, 'Selector dialog is visible' ).toBeVisible();

		// Check document has no horizontal scrollbar/overflow
		const hasOverflow = await page.evaluate( () => {
			return document.documentElement.scrollWidth > window.innerWidth;
		} );
		expect( hasOverflow, 'Document has no horizontal overflow' ).toBe( false );

		// Check bounding box fits viewport width
		const box = await dialog.boundingBox();
		expect( box, 'Dialog has valid bounding box' ).not.toBeNull();
		const viewportWidth = await page.evaluate( () => window.innerWidth );
		expect( box.width, 'Selector width does not exceed viewport width' ).toBeLessThanOrEqual( viewportWidth + 2 );
	} );

	test( 'Touch tap interactions open selector and allow selecting language @viewport', async ( { page, gotoWiki, uls } ) => {
		if ( uls.device !== 'mobile' && uls.device !== 'tablet' ) {
			test.skip( true, 'Touch interactions apply to mobile and tablet devices' );
		}

		// Prevent leaving test wiki
		await page.route( 'https://*.wikipedia.org/**', ( route ) => route.abort() );

		await gotoWiki( 'QA ULS search codes' );

		const trigger = getLanguageTrigger( page, uls.skin );
		await expect( trigger ).toBeVisible();

		// Use tap instead of click to verify touch event handling
		await trigger.tap();

		const dialog = getSelectorDialog( page );
		await expect( dialog, 'Selector opens upon touch tap' ).toBeVisible();

		// Tap a language link if available
		const languageItem = page.locator( '.uls-rewrite [data-code="de"], .uls-language-list a[data-code="de"], [lang="de"]' ).first();
		if ( await languageItem.isVisible() ) {
			await languageItem.tap();
			// After tapping, selector dialog closes or page navigates
			await expect( dialog, 'Selector closes after tapping language item' ).toBeHidden( { timeout: 5000 } );
		}
	} );

} );
