// Feature 9: Right-to-Left (RTL) Layout (@rtl)
// User-facing requirements from GOALS.md & FEATURES.md:
// - With an RTL interface language ('ar' or 'he' via uselang), selector layout is mirrored.
// - Nothing overflows horizontally at 390 px viewport.
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

test.describe( 'Right-to-Left (RTL) layout (@rtl)', () => {

	test.beforeEach( ( { uls } ) => {
		if ( uls.skin === 'cologneblue' ) {
			test.fixme( true, 'KI-1: Cologne Blue has no ULS trigger' );
		}
	} );

	test( 'Selector mirrors correctly in RTL interface @rtl', async ( { page, gotoWiki, uls } ) => {
		// Open page in Arabic (RTL interface language)
		await gotoWiki( 'QA ULS search codes', { uselang: 'ar' } );

		// Verify page document direction is rtl
		const pageDir = await page.evaluate( () => document.documentElement.getAttribute( 'dir' ) || document.body.getAttribute( 'dir' ) );
		expect( pageDir, 'Page root has dir="rtl"' ).toBe( 'rtl' );

		const trigger = getLanguageTrigger( page, uls.skin );
		await expect( trigger, `Language trigger visible for ${ uls.skin }` ).toBeVisible();
		await trigger.click();

		const dialog = getSelectorDialog( page );
		await expect( dialog, 'Selector dialog is visible in RTL mode' ).toBeVisible();

		// Assert computed direction of the selector dialog or inner panel is rtl
		const dialogDir = await dialog.evaluate( ( el ) => window.getComputedStyle( el ).direction );
		expect( dialogDir, 'Selector computed direction is rtl' ).toBe( 'rtl' );
	} );

	test( 'No horizontal overflow at 390px viewport in RTL @rtl', async ( { page, gotoWiki, uls } ) => {
		if ( uls.device !== 'mobile' ) {
			test.skip( true, 'Applies specifically to mobile 390px viewport' );
		}

		await gotoWiki( 'QA ULS search codes', { uselang: 'ar' } );

		const trigger = getLanguageTrigger( page, uls.skin );
		await expect( trigger ).toBeVisible();
		await trigger.click();

		const dialog = getSelectorDialog( page );
		await expect( dialog ).toBeVisible();

		// Check for horizontal overflow beyond the viewport width
		const hasOverflow = await page.evaluate( () => {
			return document.documentElement.scrollWidth > window.innerWidth;
		} );
		expect( hasOverflow, 'No horizontal overflow beyond viewport at 390px' ).toBe( false );

		// Check selector bounding box width does not exceed viewport width
		const box = await dialog.boundingBox();
		expect( box, 'Dialog has valid bounding box' ).not.toBeNull();
		const viewportWidth = await page.evaluate( () => window.innerWidth );
		expect( box.width, 'Selector width fits inside 390px viewport' ).toBeLessThanOrEqual( viewportWidth + 2 );
	} );

} );
