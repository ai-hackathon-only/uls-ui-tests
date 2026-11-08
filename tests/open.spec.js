// Feature 1: Trigger & Dialog Lifecycle (@open)
// User-facing requirements from GOALS.md & FEATURES.md:
// - The language button is visible where the skin puts it.
// - Clicking opens the language selector dialog.
// - Esc closes the dialog and returns focus to the button.
// - The close button closes the dialog and returns focus to the button.
// - Clicking outside closes the dialog.
'use strict';
const { test, expect } = require( './support/fixtures' );

/**
 * Returns the locator for the skin's language entry trigger.
 * Pinned to exact interactive trigger elements per skin.
 * @param {import('@playwright/test').Page} page
 * @param {string} skin
 */
function getLanguageTrigger( page, skin ) {
	switch ( skin ) {
		case 'vector-2022':
			// The interactive, focusable trigger checkbox/button in Vector 2022
			return page.locator( '#p-lang-btn-checkbox' );
		case 'minerva':
			// The interactive language icon/anchor in Minerva header or page actions
			return page.locator( 'a.minerva-icon--language-switcher, #page-actions-languages a, a.language-selector, #language-selector a' ).first();
		case 'vector':
		case 'monobook':
		case 'timeless':
		case 'modern':
			// Compact interlanguage link button or cog settings trigger
			return page.locator( 'button.mw-interlanguage-selector, .uls-settings-trigger, #p-lang .mw-interlanguage-selector' ).first();
		case 'cologneblue':
			// Cologne Blue does not integrate ULS; return empty locator (handled via KI-1 fixme)
			return page.locator( '#p-lang-btn-nonexistent' );
		default:
			throw new Error( `Unknown skin: ${ skin }` );
	}
}

/**
 * Returns the locator for the open language selector dialog.
 * Supports ULS V2 rewrite overlay (.uls-rewrite), mobile overlays, and classic (.uls-menu / #languagesettings).
 * @param {import('@playwright/test').Page} page
 */
function getSelectorDialog( page ) {
	return page.locator( '.uls-rewrite:visible, .uls-menu:visible, #languagesettings:visible, .uls-rewrite--mobile:visible, .language-overlay:visible, .overlay.overlay-languages:visible, #languages-selector:visible' ).first();
}

/**
 * Returns the locator for the close button inside the open selector dialog.
 * @param {import('@playwright/test').Page} page
 */
function getCloseButton( page ) {
	return page.locator( '.uls-rewrite button[aria-label*="close" i], .uls-rewrite button.close, .uls-icon-close, #languagesettings .ui-dialog-titlebar-close, .language-overlay .cancel, .overlay .cancel' ).first();
}

/**
 * Applies known n/a skips and KI fixmes per skin/device matrix row.
 * @param {import('@playwright/test').TestInfo} testInfo
 * @param {object} uls
 */
function applyRowSkips( uls ) {
	if ( uls.skin === 'cologneblue' ) {
		test.fixme( true, 'KI-1: Cologne Blue does not integrate ULS trigger; static links only' );
	}
	if ( uls.skin === 'vector' && uls.device === 'mobile' ) {
		test.skip( true, 'n/a: Vector legacy is a non-responsive desktop skin; sidebar is positioned offscreen at 390px' );
	}
	if ( uls.skin === 'monobook' && uls.device === 'mobile' ) {
		test.skip( true, 'n/a: MonoBook is a non-responsive desktop skin; sidebar is positioned offscreen at 390px' );
	}
	if ( uls.skin === 'timeless' && ( uls.device === 'tablet' || uls.device === 'mobile' ) ) {
		test.skip( true, 'n/a: Timeless hides #other-languages on viewports < 851px' );
	}
}

test.describe( 'Trigger and selector lifecycle @open', () => {

	test( 'Language button is visible and opens selector @open', async ( { page, gotoWiki, uls } ) => {
		applyRowSkips( uls );
		await gotoWiki( 'QA ULS search codes' );
		const trigger = getLanguageTrigger( page, uls.skin );
		await expect( trigger, `Language trigger visible for skin ${ uls.skin }` ).toBeVisible();

		await trigger.scrollIntoViewIfNeeded();
		await trigger.click();
		const dialog = getSelectorDialog( page );
		await expect( dialog, 'Selector dialog opens upon clicking language trigger' ).toBeVisible();
	} );

	test( 'Esc key closes selector and restores focus @open', async ( { page, gotoWiki, uls } ) => {
		applyRowSkips( uls );
		if ( uls.device === 'mobile' ) {
			test.skip( true, 'n/a: mobile devices do not have a physical Escape key; dismissed via close button or back' );
		}
		if ( [ 'vector', 'monobook', 'timeless', 'modern' ].includes( uls.skin ) ) {
			test.fixme( true, 'KNOWN-ISSUES: Focus is not restored to trigger on Escape in legacy skins (lands on body)' );
		}
		await gotoWiki( 'QA ULS search codes' );
		const trigger = getLanguageTrigger( page, uls.skin );
		await expect( trigger ).toBeVisible();

		await trigger.scrollIntoViewIfNeeded();
		await trigger.click();

		const dialog = getSelectorDialog( page );
		await expect( dialog ).toBeVisible();

		// Press Esc to dismiss
		await page.keyboard.press( 'Escape' );
		await expect( dialog, 'Selector dialog closes on Escape' ).toBeHidden();

		// Verify focus returned directly to the trigger element
		await expect( trigger, 'Focus restored to language trigger' ).toBeFocused();
	} );

	test( 'Close button closes selector and restores focus @open', async ( { page, gotoWiki, uls } ) => {
		applyRowSkips( uls );
		if ( uls.skin === 'vector-2022' || uls.skin === 'vector' ) {
			test.skip( true, 'n/a: Vector and Vector 2022 flyout does not render a close button; dismissed via Esc or click-outside' );
		}
		if ( uls.skin === 'minerva' ) {
			test.skip( true, 'n/a: Minerva mobile selector overlay does not have an X close button; dismissed via back' );
		}
		if ( [ 'monobook', 'timeless', 'modern' ].includes( uls.skin ) ) {
			test.fixme( true, 'KNOWN-ISSUES: Focus is not restored to trigger on close button in legacy skins (lands on body)' );
		}
		await gotoWiki( 'QA ULS search codes' );
		const trigger = getLanguageTrigger( page, uls.skin );
		await expect( trigger ).toBeVisible();

		await trigger.scrollIntoViewIfNeeded();
		await trigger.click();

		const dialog = getSelectorDialog( page );
		await expect( dialog ).toBeVisible();

		const closeBtn = getCloseButton( page );
		await expect( closeBtn, 'Close button visible in selector dialog' ).toBeVisible();
		await closeBtn.click();
		await expect( dialog, 'Selector dialog closes on close button click' ).toBeHidden();

		// Verify focus returned directly to the trigger element
		await expect( trigger, 'Focus restored to language trigger' ).toBeFocused();
	} );

	test( 'Click outside closes selector @open', async ( { page, gotoWiki, uls } ) => {
		applyRowSkips( uls );
		if ( uls.device === 'mobile' || uls.skin === 'minerva' ) {
			test.skip( true, 'n/a: mobile fullscreen overlay covers viewport with no outside target' );
		}
		await gotoWiki( 'QA ULS search codes' );
		const trigger = getLanguageTrigger( page, uls.skin );
		await expect( trigger ).toBeVisible();

		await trigger.scrollIntoViewIfNeeded();
		await trigger.click();

		const dialog = getSelectorDialog( page );
		await expect( dialog ).toBeVisible();

		// Click unobstructed outside element (heading)
		const outside = page.locator( '#firstHeading, #content, main' ).first();
		await outside.click();

		await expect( dialog, 'Selector dialog closes when clicking outside' ).toBeHidden();
	} );

} );
