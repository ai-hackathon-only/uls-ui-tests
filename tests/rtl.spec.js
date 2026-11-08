// Feature 9: Right-to-Left (RTL) Layout (@rtl)
// User-facing requirements from GOALS.md & FEATURES.md:
// - With an RTL interface language ('ar' or 'he' via uselang), selector layout is mirrored.
// - Nothing overflows horizontally at 390 px viewport.
'use strict';
const { test, expect } = require( './support/fixtures' );
const { markKnownIssues } = require( './support/known-issues' );
const {
	getCloseButton,
	openSelector,
	waitForStableBox
} = require( './support/uls-helpers' );

test.describe( 'Right-to-Left (RTL) layout @rtl', () => {

	test.beforeEach( ( { uls } ) => {
		markKnownIssues( test, uls, 'rtl' );
	} );

	test( 'Selector mirrors correctly in RTL interface @rtl', async ( { page, gotoWiki, uls } ) => {
		// Open page in Arabic (RTL interface language)
		await gotoWiki( 'QA ULS search codes', { uselang: 'ar' } );

		// Verify page document direction is rtl
		const pageDir = await page.evaluate( () => document.documentElement.getAttribute( 'dir' ) || document.body.getAttribute( 'dir' ) );
		expect( pageDir, 'Page root has dir="rtl"' ).toBe( 'rtl' );

		const dialog = await openSelector( page, uls.skin );

		// 1. Assert computed direction of selector dialog is explicitly rtl
		const dialogDir = await dialog.evaluate( ( el ) => window.getComputedStyle( el ).direction );
		expect( dialogDir, 'Selector computed direction is rtl' ).toBe( 'rtl' );

		// 2. Check ULS search input mirroring:
		// Hard assert that search input is visible in the selector
		const searchInput = dialog.locator( 'input.uls-languagefilter, .cdx-search-input input, input[type="search"]' ).first();
		await expect( searchInput, 'Search input is visible in selector dialog' ).toBeVisible();

		// In RTL, text alignment computes to 'right' or 'start', and computed direction is 'rtl'
		const inputDir = await searchInput.evaluate( ( el ) => window.getComputedStyle( el ).direction );
		expect( inputDir, 'Search input computed direction is rtl' ).toBe( 'rtl' );
		const textAlign = await searchInput.evaluate( ( el ) => window.getComputedStyle( el ).textAlign );
		expect( [ 'start', 'right' ], 'Search input text-align is start or right in RTL' ).toContain( textAlign );

		// Codex search start-icon position check: in RTL, start icon is on the right side of the input
		const searchIcon = dialog.locator( '.cdx-search-input__start-icon, .uls-search-icon' ).first();
		if ( await searchIcon.isVisible() ) {
			const iconBox = await searchIcon.boundingBox();
			const input = await searchInput.boundingBox();
			if ( iconBox && input ) {
				expect( iconBox.x, 'Search icon is mirrored to the right side of input in RTL' ).toBeGreaterThan( input.x + input.width / 2 );
			}
		}

		// Close button positioning in RTL:
		if ( uls.skin === 'minerva' && uls.device === 'mobile' ) {
			const closeButton = getCloseButton( page );
			await expect( closeButton, 'Close button is visible in Minerva mobile dialog' ).toBeVisible();
			const closeBox = await closeButton.boundingBox();
			const dialogBox = await dialog.boundingBox();
			expect( closeBox, 'Close button has bounding box' ).not.toBeNull();
			expect( dialogBox, 'Dialog has bounding box' ).not.toBeNull();
		} else {
			test.info().annotations.push( {
				type: 'n/a',
				description: `Close button not rendered in ${ uls.skin } ${ uls.device } (dismissed via Esc or click-outside)`
			} );
		}
	} );

	test( 'No horizontal overflow at 390px viewport in RTL @rtl', async ( { page, gotoWiki, uls } ) => {
		if ( uls.device !== 'mobile' ) {
			test.skip( true, 'n/a: Applies specifically to mobile 390px viewport' );
		}

		await gotoWiki( 'QA ULS search codes', { uselang: 'ar' } );

		const dialog = await openSelector( page, uls.skin );
		await waitForStableBox( dialog );

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
