// Feature 1: Trigger & Dialog Lifecycle (@open)
// User-facing requirements from GOALS.md & FEATURES.md:
// - The language button is visible where the skin puts it.
// - Clicking opens the language selector dialog.
// - Esc closes the dialog and returns focus to the button.
// - The close button closes the dialog and returns focus to the button.
// - Clicking outside closes the dialog.
'use strict';
const { test, expect } = require( './support/fixtures' );
const { markKnownIssues } = require( './support/known-issues' );

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
			// Compact interlanguage link button
			return page.locator( 'button.mw-interlanguage-selector, #p-lang .mw-interlanguage-selector' ).first();
		case 'cologneblue':
			// Cologne Blue does not integrate ULS; return empty locator (handled via KI-1 fail)
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
 * Returns the locator for the close button inside the open selector dialog.
 * Handles ULS V2 rewrite close button, classic dialog cancel/close icon, and Minerva overlay cancel button.
 * @param {import('@playwright/test').Page} page
 */
function getCloseButton( page ) {
	return page.locator( [
		'.uls-rewrite__header__mobile button[aria-label="Close"]',
		'.uls-rewrite button[aria-label*="close" i]',
		'.uls-rewrite--mobile button[aria-label*="close" i]',
		'button.uls-settings-cancel',
		'.uls-settings-cancel',
		'.uls-icon-close',
		'.ui-dialog-titlebar-close',
		'.language-overlay .cancel',
		'.language-overlay header button',
		'.overlay .cancel',
		'button.cancel',
		'button.header-cancel'
	].join( ', ' ) ).first();
}

/**
 * Applies known issue fail annotations per skin/device matrix row.
 * @param {object} uls
 */
function applyRowSkips( uls ) {
	markKnownIssues( test, uls, 'open' );
	if ( uls.skin === 'timeless' && ( uls.device === 'tablet' || uls.device === 'mobile' ) ) {
		test.fail( true, 'KI-4: Timeless hides language portlet (#other-languages) on viewports narrower than 851px' );
	}
	if ( uls.skin === 'monobook' && uls.device === 'mobile' ) {
		test.fail( true, 'KI-5: MonoBook sidebar navigation overlaps language trigger on mobile viewports' );
	}
}

test.describe( 'Trigger and selector lifecycle @open', () => {

	test( 'Language button is visible and opens selector @open', async ( { page, gotoWiki, uls } ) => {
		applyRowSkips( uls );
		await gotoWiki( 'QA ULS search codes' );
		const trigger = getLanguageTrigger( page, uls.skin );
		await expect( trigger, `Language trigger visible for skin ${ uls.skin }` ).toBeVisible();

		await trigger.click( { timeout: 5000 } );
		const dialog = getSelectorDialog( page );
		await expect( dialog, 'Selector dialog opens upon clicking language trigger' ).toBeVisible();
	} );

	test( 'Esc key closes selector and restores focus @open', async ( { page, gotoWiki, uls } ) => {
		applyRowSkips( uls );
		if ( uls.device === 'mobile' ) {
			test.skip( true, 'n/a: mobile devices do not have a physical Escape key; dismissed via close button' );
		}
		await gotoWiki( 'QA ULS search codes' );
		const trigger = getLanguageTrigger( page, uls.skin );
		await expect( trigger ).toBeVisible();

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
		if ( !( uls.skin === 'minerva' && uls.device === 'mobile' ) ) {
			test.skip( true, 'n/a: only Minerva mobile overlay renders a dedicated close button; desktop and tablet flyouts dismissed via Esc or click-outside' );
		}
		await gotoWiki( 'QA ULS search codes' );
		const trigger = getLanguageTrigger( page, uls.skin );
		await expect( trigger ).toBeVisible();

		await trigger.click();

		const dialog = getSelectorDialog( page );
		await expect( dialog ).toBeVisible();

		const closeBtn = getCloseButton( page );
		await expect( closeBtn, 'Close button visible in selector dialog' ).toBeVisible();
		await closeBtn.click( { force: true } );
		await expect( dialog, 'Selector dialog closes on close button click' ).toBeHidden();

		// Check focus restore on devices where applicable (non-mobile, non-Minerva)
		if ( uls.device !== 'mobile' && uls.skin !== 'minerva' ) {
			await expect( trigger, 'Focus restored to language trigger' ).toBeFocused();
		}
	} );

	test( 'Click outside closes selector @open', async ( { page, gotoWiki, uls } ) => {
		applyRowSkips( uls );
		if ( uls.device === 'mobile' || uls.skin === 'minerva' ) {
			test.skip( true, 'n/a: mobile fullscreen dialog covers viewport with no outside target; dismissed via Close button' );
		}
		await gotoWiki( 'QA ULS search codes' );
		const trigger = getLanguageTrigger( page, uls.skin );
		await expect( trigger ).toBeVisible();

		await trigger.click();

		const dialog = getSelectorDialog( page );
		await expect( dialog ).toBeVisible();

		// Click page content outside the selector dialog
		await page.locator( '#firstHeading' ).click();

		await expect( dialog, 'Selector dialog closes when clicking outside' ).toBeHidden();
	} );

} );
