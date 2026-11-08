// Feature 9: Right-to-Left (RTL) Layout (@rtl)
// User-facing requirements from GOALS.md & FEATURES.md:
// - With an RTL interface language ('ar' or 'he' via uselang), selector layout is mirrored.
// - Nothing overflows horizontally at 390 px viewport.
'use strict';
const { test, expect } = require( './support/fixtures' );
const {
	getLanguageTrigger,
	getSelectorDialog,
	getCloseButton,
	openSelector
} = require( './support/uls-helpers' );

test.describe( 'Right-to-Left (RTL) layout (@rtl)', () => {

	test.beforeEach( ( { uls } ) => {
		if ( uls.skin === 'cologneblue' ) {
			test.fail( true, 'KI-1: Cologne Blue has no ULS language button' );
		}
	} );

	test( 'Selector mirrors correctly in RTL interface @rtl', async ( { page, gotoWiki, uls } ) => {
		// Open page in Arabic (RTL interface language)
		await gotoWiki( 'QA ULS search codes', { uselang: 'ar' } );

		// Verify page document direction is rtl
		const pageDir = await page.evaluate( () => document.documentElement.getAttribute( 'dir' ) || document.body.getAttribute( 'dir' ) );
		expect( pageDir, 'Page root has dir="rtl"' ).toBe( 'rtl' );

		const dialog = await openSelector( page, uls.skin );

		// 1. Assert computed direction of selector dialog
		const dialogDir = await dialog.evaluate( ( el ) => window.getComputedStyle( el ).direction );
		expect( dialogDir, 'Selector computed direction is rtl' ).toBe( 'rtl' );

		// 2. Check ULS-specific layout mirroring:
		// Search input text alignment is right/start in RTL
		const searchInput = dialog.locator( 'input.uls-languagefilter, .cdx-search-input input, input[type="search"]' ).first();
		if ( await searchInput.isVisible() ) {
			const textAlign = await searchInput.evaluate( ( el ) => window.getComputedStyle( el ).textAlign );
			expect( [ 'right', 'start' ], 'Search input text-align is mirrored' ).toContain( textAlign );
		}

		// Close button positioning in RTL: positioned on the inline-start (left side of dialog)
		const closeButton = getCloseButton( page );
		if ( await closeButton.isVisible() ) {
			const closeBox = await closeButton.boundingBox();
			const dialogBox = await dialog.boundingBox();
			if ( closeBox && dialogBox ) {
				expect( closeBox.x, 'Close button is mirrored to the left side in RTL' ).toBeLessThan( dialogBox.x + dialogBox.width / 2 );
			}
		}
	} );

	test( 'No horizontal overflow at 390px viewport in RTL @rtl', async ( { page, gotoWiki, uls } ) => {
		if ( uls.device !== 'mobile' ) {
			test.skip( true, 'Applies specifically to mobile 390px viewport' );
		}

		await gotoWiki( 'QA ULS search codes', { uselang: 'ar' } );

		const dialog = await openSelector( page, uls.skin );

		// Wait for animation and rendering to settle
		await page.waitForTimeout( 300 );

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
