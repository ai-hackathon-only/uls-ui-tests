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
const { getLanguageTrigger, getSelectorDialog, waitForStableBox, getLanguageOption } = require( './support/uls-helpers' );

/**
 * Applies known issue fail annotations and matrix skips per skin/device row.
 * @param {object} uls
 */
function applyRowSkips( uls ) {
	markKnownIssues( test, uls, 'keyboard' );
	if ( uls.device === 'mobile' ) {
		test.skip( true, 'n/a: mobile devices test touch tap under @viewport; keyboard navigation applies to desktop and tablet' );
	}
}

/**
 * Focuses language trigger and activates it via keyboard (Enter/Space).
 * @param {import('@playwright/test').Page} page
 * @param {string} skin
 */
async function openSelectorByKeyboard( page, skin ) {
	const trigger = getLanguageTrigger( page, skin );
	await expect( trigger, `Language trigger visible for skin ${ skin }` ).toBeVisible();
	await trigger.scrollIntoViewIfNeeded();
	await trigger.focus();
	await expect( trigger ).toBeFocused();

	if ( skin === 'vector-2022' ) {
		await page.keyboard.press( 'Space' );
	} else {
		await page.keyboard.press( 'Enter' );
	}

	const dialog = getSelectorDialog( page );
	await expect( dialog, 'Selector dialog visible via keyboard activation' ).toBeVisible();
	await waitForStableBox( dialog );
	return dialog;
}

test.describe( 'Keyboard accessibility (@keyboard)', () => {

	test( 'Tab and arrow navigation through language list @keyboard', async ( { page, gotoWiki, uls } ) => {
		applyRowSkips( uls );
		await gotoWiki( 'QA ULS search codes' );

		const dialog = await openSelectorByKeyboard( page, uls.skin );

		// Search input inside dialog
		const searchInput = dialog.locator( 'input[type="search"], input[role="combobox"], .uls-languagefilter, .uls-filterinput' ).first();
		await expect( searchInput, 'Search input visible in selector' ).toBeVisible();

		// Ensure search input is focused
		await searchInput.focus();
		await expect( searchInput ).toBeFocused();

		async function getActiveCode() {
			const activeId = await searchInput.getAttribute( 'aria-activedescendant' );
			const activeItem = activeId ?
				dialog.locator( '#' + activeId ) :
				dialog.locator( '.uls-rewrite__language-item--highlighted, li.active, li[aria-selected="true"], li.highlighted, [role="option"][aria-selected="true"]' ).first();
			if ( ( await activeItem.count() ) === 0 ) {
				return null;
			}
			return await activeItem.evaluate( ( el ) => {
				const target = el.matches( '[data-language-code], [data-code], [lang]' ) ?
					el : ( el.querySelector( '[data-language-code], [data-code], [lang]' ) || el );
				return target.getAttribute( 'data-language-code' ) ||
					target.getAttribute( 'data-code' ) ||
					target.getAttribute( 'lang' ) ||
					null;
			} );
		}

		// Press ArrowDown to navigate to first result row
		await page.keyboard.press( 'ArrowDown' );
		await expect.poll( async () => {
			return await getActiveCode();
		}, { message: 'A result item code is selected or highlighted via ArrowDown', timeout: 5000 } ).not.toBeNull();
		const firstSelected = await getActiveCode();

		// Press ArrowDown again to move to next item
		await page.keyboard.press( 'ArrowDown' );
		await expect.poll( async () => {
			const code = await getActiveCode();
			return ( code && code !== firstSelected ) ? code : null;
		}, { message: 'ArrowDown advances to subsequent language item with different code', timeout: 5000 } ).not.toBeNull();
	} );

	test( 'Enter key activates selected language @keyboard', async ( { page, gotoWiki, uls } ) => {
		applyRowSkips( uls );

		let interceptedUrl = null;
		const unexpectedUrls = [];
		await page.route( '**/*', ( route ) => {
			const url = route.request().url();
			if ( url.includes( 'wikipedia.org' ) ) {
				if ( url.includes( 'simple.wikipedia.org' ) ) {
					interceptedUrl = url;
				} else {
					unexpectedUrls.push( url );
				}
				return route.fulfill( {
					status: 200,
					contentType: 'text/html',
					body: '<!DOCTYPE html><html><body>Navigated Destination</body></html>'
				} );
			}
			return route.continue();
		} );

		await gotoWiki( 'QA ULS search codes' );

		const dialog = await openSelectorByKeyboard( page, uls.skin );

		const searchInput = dialog.locator( 'input[type="search"], input[role="combobox"], .uls-languagefilter, .uls-filterinput' ).first();
		await expect( searchInput ).toBeVisible();
		await searchInput.fill( 'simple' );

		const simpleOption = getLanguageOption( dialog, 'simple' );
		await expect( simpleOption, 'Filtered simple language option visible' ).toBeVisible();

		// Navigate to the filtered result and activate with Enter
		await page.keyboard.press( 'ArrowDown' );
		await expect.poll( async () => {
			return ( await searchInput.getAttribute( 'aria-activedescendant' ) ) ||
				( await simpleOption.getAttribute( 'class' ) ) ||
				( await simpleOption.getAttribute( 'aria-selected' ) );
		}, { timeout: 3000 } ).not.toBeNull();
		await page.keyboard.press( 'Enter' );

		// Expect navigation request to simple.wikipedia.org
		await expect.poll( () => interceptedUrl, {
			message: 'Expected navigation to simple.wikipedia.org on Enter',
			timeout: 7000
		} ).toContain( 'simple.wikipedia.org' );
		expect( unexpectedUrls, 'No unexpected non-simple wikipedia navigation occurred' ).toEqual( [] );
	} );

	test( 'Active element has visible focus indicator @keyboard', async ( { page, gotoWiki, uls } ) => {
		applyRowSkips( uls );
		await gotoWiki( 'QA ULS search codes' );

		const dialog = await openSelectorByKeyboard( page, uls.skin );

		const searchInput = dialog.locator( 'input[type="search"], input[role="combobox"], .uls-languagefilter, .uls-filterinput' ).first();
		await expect( searchInput ).toBeVisible();

		// Record focused style
		const focusedStyle = await searchInput.evaluate( ( el ) => {
			const s = window.getComputedStyle( el );
			return { outline: s.outline, outlineWidth: s.outlineWidth, boxShadow: s.boxShadow, borderColor: s.borderColor };
		} );

		// Tab away to blur searchInput without closing the dialog
		await page.keyboard.press( 'Tab' );
		await expect( searchInput, 'Search input blurred after Tab' ).not.toBeFocused();

		const blurredStyle = await searchInput.evaluate( ( el ) => {
			const s = window.getComputedStyle( el );
			return { outline: s.outline, outlineWidth: s.outlineWidth, boxShadow: s.boxShadow, borderColor: s.borderColor };
		} );

		const hasFocusIndicator = (
			focusedStyle.outline !== blurredStyle.outline ||
			focusedStyle.outlineWidth !== blurredStyle.outlineWidth ||
			focusedStyle.boxShadow !== blurredStyle.boxShadow ||
			focusedStyle.borderColor !== blurredStyle.borderColor
		);
		expect( hasFocusIndicator, 'Search input displays visible focus indicator when focused' ).toBe( true );

		// Shift+Tab back to restore focus to search input
		await page.keyboard.press( 'Shift+Tab' );
		await expect( searchInput, 'Search input focused after Shift+Tab' ).toBeFocused();
	} );

} );
