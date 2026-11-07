// Feature 1: Trigger & Dialog Lifecycle (@open)
// User-facing requirements from GOALS.md & FEATURES.md:
// - The language button is visible where the skin puts it.
// - Clicking opens the language selector dialog.
// - Esc closes the dialog and returns focus to the button.
// - The close button closes the dialog and returns focus to the button.
// - Clicking outside closes the dialog.
// - On mobile (< 768px), selector syncs with #/languages route.
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
			return page.locator( '#p-lang-btn' );
		case 'minerva':
			return page.locator( '#language-selector' );
		case 'vector':
		case 'monobook':
		case 'timeless':
		case 'modern':
		case 'cologneblue':
			return page.locator( '#p-lang .uls-settings-trigger, #p-lang' ).first();
		default:
			throw new Error( `Unknown skin: ${ skin }` );
	}
}

/**
 * Returns the locator for the open language selector dialog.
 * Supports ULS V2 Codex rewrite overlay (.uls-rewrite) and classic (.uls-menu / #languagesettings).
 * @param {import('@playwright/test').Page} page
 */
function getSelectorDialog( page ) {
	return page.locator( '.uls-rewrite:visible, .uls-menu:visible, #languagesettings:visible' ).first();
}

/**
 * Returns the locator for the close button inside the open selector dialog.
 * @param {import('@playwright/test').Page} page
 */
function getCloseButton( page ) {
	return page.locator( '.uls-rewrite button[aria-label*="close" i], .uls-rewrite .cdx-dialog__header__close-button, .uls-menu .uls-icon-close, #languagesettings .ui-dialog-titlebar-close' ).first();
}

test.describe( 'Trigger and selector lifecycle @open', () => {

	test( 'Language button is visible and opens selector @open', async ( { page, gotoWiki, uls } ) => {
		await gotoWiki( 'QA ULS search codes' );
		const trigger = getLanguageTrigger( page, uls.skin );
		await expect( trigger, `Language trigger visible for skin ${ uls.skin }` ).toBeVisible();

		await trigger.click();
		const dialog = getSelectorDialog( page );
		await expect( dialog, 'Selector dialog opens upon clicking language trigger' ).toBeVisible();
	} );

	test( 'Esc key closes selector and restores focus @open', async ( { page, gotoWiki, uls } ) => {
		if ( uls.device === 'mobile' ) {
			test.skip( true, 'n/a: mobile fullscreen uses history navigation rather than Esc' );
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
		if ( uls.device === 'mobile' ) {
			test.skip( true, 'n/a: mobile fullscreen route uses history/back navigation' );
		}
		await gotoWiki( 'QA ULS search codes' );
		const trigger = getLanguageTrigger( page, uls.skin );
		await expect( trigger ).toBeVisible();
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
		if ( uls.device === 'mobile' ) {
			test.skip( true, 'n/a: mobile dialog is fullscreen with no outside target' );
		}
		await gotoWiki( 'QA ULS search codes' );
		const trigger = getLanguageTrigger( page, uls.skin );
		await expect( trigger ).toBeVisible();
		await trigger.click();

		const dialog = getSelectorDialog( page );
		await expect( dialog ).toBeVisible();

		// Click unobstructed outside element (heading or body content)
		const outside = page.locator( '#firstHeading' );
		await outside.click();

		await expect( dialog, 'Selector dialog closes when clicking outside' ).toBeHidden();
	} );

	test( 'Mobile route #/languages syncs with open/close and browser back @open', async ( { page, gotoWiki, uls } ) => {
		if ( uls.device !== 'mobile' ) {
			test.skip( true, 'n/a: route sync applies only to mobile fullscreen overlay' );
		}
		await gotoWiki( 'QA ULS search codes' );
		const trigger = getLanguageTrigger( page, uls.skin );
		await expect( trigger ).toBeVisible();
		await trigger.click();

		const dialog = getSelectorDialog( page );
		await expect( dialog ).toBeVisible();
		expect( page.url(), 'URL contains #/languages on mobile open' ).toContain( '#/languages' );

		await page.goBack();
		await expect( dialog, 'Dialog closes on history back' ).toBeHidden();
		expect( page.url(), 'URL hash is removed after closing' ).not.toContain( '#/languages' );
	} );

} );
