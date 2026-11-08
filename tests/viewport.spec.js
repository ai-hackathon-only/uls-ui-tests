// Feature 10: Small Screens & Viewport Responsiveness (@viewport)
// User-facing requirements from GOALS.md & FEATURES.md:
// - Small screens: the selector fits the viewport (no horizontal scroll).
// - Works by touch tap on mobile and tablet touch devices.
'use strict';
const { test, expect } = require( './support/fixtures' );
const {
	getLanguageTrigger,
	getSelectorDialog,
	openSelector,
	getLanguageOption
} = require( './support/uls-helpers' );

test.describe( 'Small screens & viewport responsiveness (@viewport)', () => {

	test.beforeEach( ( { uls } ) => {
		if ( uls.skin === 'cologneblue' ) {
			test.fail( true, 'KI-1: Cologne Blue has no ULS language button' );
		}
	} );

	test( 'Selector fits mobile and tablet viewport without horizontal scroll @viewport', async ( { page, gotoWiki, uls } ) => {
		if ( uls.device !== 'mobile' && uls.device !== 'tablet' ) {
			test.skip( true, 'Applies to mobile and tablet viewports' );
		}

		await gotoWiki( 'QA ULS search codes' );

		const dialog = await openSelector( page, uls.skin );

		// Wait for animation and rendering to settle
		await page.waitForTimeout( 300 );

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

		// Prevent leaving test wiki on link selection
		await page.route( '**/*', ( route ) => {
			if ( route.request().isNavigationRequest() && !route.request().url().includes( 'localhost' ) ) {
				return route.fulfill( {
					status: 200,
					contentType: 'text/html',
					body: '<!DOCTYPE html><html><body>Navigated</body></html>'
				} );
			}
			return route.continue();
		} );

		await gotoWiki( 'QA ULS search codes' );

		const trigger = getLanguageTrigger( page, uls.skin );
		await expect( trigger, `Trigger visible for touch tap on ${ uls.skin }` ).toBeVisible();

		// Use tap instead of click to verify touch event handling
		await trigger.tap();

		const dialog = getSelectorDialog( page );
		await expect( dialog, 'Selector opens upon touch tap' ).toBeVisible();

		// Wait for dialog animations
		await page.waitForTimeout( 300 );

		// Assert language item is visible and tap it
		const languageItem = getLanguageOption( dialog, 'de' );
		await expect( languageItem, 'German language item visible in open selector' ).toBeVisible();

		await languageItem.tap();

		// Selector dialog closes or navigates after tapping language item
		await expect( dialog, 'Selector closes after tapping language item' ).toBeHidden( { timeout: 5000 } );
	} );

} );
