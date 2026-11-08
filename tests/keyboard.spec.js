// Feature 8: Keyboard Accessibility (@keyboard)
// User-facing requirements from GOALS.md & FEATURES.md:
// - Full keyboard navigation inside the language selector.
// - Focus enters search input or Tab cycles through actionable elements.
// - Arrow keys navigate the language list.
// - Enter selects the highlighted language (navigates or triggers action).
// - Active/focused element has a visible focus indicator.
'use strict';
const { test, expect } = require( './support/fixtures' );
const { markKnownIssues } = require( './support/known-issues' );

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
			return page.locator( 'a.minerva-icon--language-switcher, #page-actions-languages a, a.language-selector, #language-selector a' ).first();
		case 'vector':
		case 'monobook':
		case 'timeless':
		case 'modern':
			return page.locator( 'button.mw-interlanguage-selector, #p-lang .mw-interlanguage-selector' ).first();
		case 'cologneblue':
			// Cologne Blue does not integrate ULS trigger (Known Issue KI-1)
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
	return page.locator( [
		'.uls-rewrite:visible',
		'.uls-menu:visible',
		'#languagesettings:visible',
		'.uls-rewrite--mobile:visible',
		'.language-overlay:visible',
		'.overlay.overlay-languages:visible',
		'#languages-selector:visible'
	].join( ', ' ) ).first();
}

/**
 * Applies known issue fail annotations per skin/device matrix row.
 * @param {object} uls
 */
function applyRowSkips( uls ) {
	markKnownIssues( test, uls, 'keyboard' );
	if ( uls.skin === 'timeless' && ( uls.device === 'tablet' || uls.device === 'mobile' ) ) {
		test.fail( true, 'KI-4: Timeless hides language portlet (#other-languages) on viewports narrower than 851px' );
	}
	if ( uls.skin === 'monobook' && uls.device === 'mobile' ) {
		test.fail( true, 'KI-5: MonoBook sidebar navigation overlaps language trigger on mobile viewports' );
	}
	if ( uls.device === 'mobile' ) {
		test.skip( true, 'n/a: mobile devices test touch tap under @viewport; keyboard navigation applies to desktop and tablet' );
	}
}

test.describe( 'Keyboard accessibility (@keyboard)', () => {

	test( 'Tab and arrow navigation through language list @keyboard', async ( { page, gotoWiki, uls } ) => {
		applyRowSkips( uls );
		await gotoWiki( 'QA ULS search codes' );

		const trigger = getLanguageTrigger( page, uls.skin );
		await expect( trigger, `Language trigger visible for skin ${ uls.skin }` ).toBeVisible();
		await trigger.click( { timeout: 5000 } );

		const dialog = getSelectorDialog( page );
		await expect( dialog, 'Selector dialog visible' ).toBeVisible();

		// Search input inside dialog
		const searchInput = dialog.locator( 'input[type="search"], .uls-languagefilter, .uls-filterinput' ).first();
		await expect( searchInput, 'Search input visible in selector' ).toBeVisible();

		// Ensure search input is focused
		await searchInput.focus();
		await expect( searchInput ).toBeFocused();

		// Press ArrowDown or Tab to navigate to results
		await page.keyboard.press( 'ArrowDown' );
		await page.waitForTimeout( 200 );

		// Check active/highlighted item or focused element
		const activeItem = dialog.locator( '.active, :focus, [aria-selected="true"], li.highlighted' ).first();
		await expect( activeItem, 'An item is highlighted or focused after ArrowDown' ).toBeVisible();

		// Press ArrowDown again to move to next item
		await page.keyboard.press( 'ArrowDown' );
		await page.waitForTimeout( 200 );
		const secondItem = dialog.locator( '.active, :focus, [aria-selected="true"], li.highlighted' ).first();
		await expect( secondItem, 'An item remains highlighted or focused after subsequent ArrowDown' ).toBeVisible();
	} );

	test( 'Enter key activates selected language @keyboard', async ( { page, gotoWiki, uls } ) => {
		applyRowSkips( uls );

		let interceptedUrl = null;
		await page.route( '**/*', ( route ) => {
			const url = route.request().url();
			if ( url.includes( 'simple.wikipedia.org' ) || url.includes( 'de.wikipedia.org' ) || url.includes( 'zh-yue.wikipedia.org' ) ) {
				interceptedUrl = url;
				return route.abort( 'blockedbyclient' );
			}
			return route.continue();
		} );

		await gotoWiki( 'QA ULS search codes' );

		const trigger = getLanguageTrigger( page, uls.skin );
		await expect( trigger, `Language trigger visible for skin ${ uls.skin }` ).toBeVisible();
		await trigger.click( { timeout: 5000 } );

		const dialog = getSelectorDialog( page );
		await expect( dialog, 'Selector dialog visible' ).toBeVisible();

		const searchInput = dialog.locator( 'input[type="search"], input[role="combobox"], .uls-languagefilter, .uls-filterinput' ).first();
		await expect( searchInput ).toBeVisible();
		await searchInput.fill( 'simple' );
		await page.waitForTimeout( 300 );

		// Navigate to the filtered result and activate with Enter
		await page.keyboard.press( 'ArrowDown' );
		await page.waitForTimeout( 200 );
		await page.keyboard.press( 'Enter' );

		// Expect navigation request to have been triggered to simple.wikipedia.org
		await expect.poll( () => interceptedUrl, {
			message: 'Expected navigation to simple.wikipedia.org on Enter',
			timeout: 7000
		} ).toContain( 'simple.wikipedia.org' );
	} );

	test( 'Active element has visible focus indicator @keyboard', async ( { page, gotoWiki, uls } ) => {
		applyRowSkips( uls );
		await gotoWiki( 'QA ULS search codes' );

		const trigger = getLanguageTrigger( page, uls.skin );
		await expect( trigger, `Language trigger visible for skin ${ uls.skin }` ).toBeVisible();
		await trigger.click( { timeout: 5000 } );

		const dialog = getSelectorDialog( page );
		await expect( dialog, 'Selector dialog visible' ).toBeVisible();

		const searchInput = dialog.locator( 'input[type="search"], .uls-languagefilter, .uls-filterinput' ).first();
		await searchInput.focus();
		await expect( searchInput ).toBeFocused();

		// Check focus indicator (outline, box-shadow, or border on focused element)
		const hasIndicator = await searchInput.evaluate( ( el ) => {
			const style = window.getComputedStyle( el );
			return (
				( style.outlineStyle !== 'none' && parseFloat( style.outlineWidth || '0' ) > 0 ) ||
				( style.boxShadow && style.boxShadow !== 'none' ) ||
				( style.borderStyle !== 'none' && parseFloat( style.borderWidth || '0' ) > 0 )
			);
		} );
		expect( hasIndicator, 'Search input has a visible focus indicator' ).toBe( true );
	} );

} );
