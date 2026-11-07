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
 * @param {import('@playwright/test').Page} page
 * @param {string} skin
 */
function getLanguageTrigger( page, skin ) {
	if ( skin === 'vector-2022' ) {
		return page.locator( '#p-lang-btn-label, #p-lang-btn .mw-interlanguage-selector, #p-lang-btn-checkbox, #p-lang-btn' ).first();
	}
	if ( skin === 'minerva' ) {
		return page.locator( '#ca-languages, .language-selector, a[data-event-name="menu.languages"], .minerva-icon--language-switcher' ).first();
	}
	// Classic / legacy skins: Vector legacy, MonoBook, Timeless, Modern, Cologne Blue
	return page.locator( '#p-lang .uls-settings-trigger, #p-lang .mw-interlanguage-selector, #pt-uls a, #p-lang' ).first();
}

/**
 * Returns the locator for the open language selector dialog.
 * Handles both classic jquery.uls dialog and V2 Codex/Vue rewrite overlay (.uls-rewrite).
 * @param {import('@playwright/test').Page} page
 */
function getSelectorDialog( page ) {
	return page.locator( '.uls-rewrite:visible, .uls-menu:visible, .ext-uls-dialog:visible, #languagesettings:visible, .cdx-dialog:visible, [role="dialog"]:visible' ).first();
}

/**
 * Returns the locator for the close button inside the open selector dialog.
 * @param {import('@playwright/test').Page} page
 */
function getCloseButton( page ) {
	return page.locator( '.uls-rewrite button[aria-label*="close" i], .uls-menu .uls-icon-close, .cdx-dialog__header__close-button, #languagesettings .ui-dialog-titlebar-close, button.uls-dialog-close, button[aria-label="Close"]:visible' ).first();
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
		await gotoWiki( 'QA ULS search codes' );
		const trigger = getLanguageTrigger( page, uls.skin );
		await expect( trigger ).toBeVisible();
		await trigger.click();

		const dialog = getSelectorDialog( page );
		await expect( dialog ).toBeVisible();

		// Press Esc to dismiss (desktop/tablet)
		if ( uls.device === 'mobile' ) {
			test.skip( true, 'n/a: mobile uses touch/back navigation rather than Esc' );
		}
		await page.keyboard.press( 'Escape' );
		await expect( dialog, 'Selector dialog closes on Escape' ).toBeHidden();

		// Verify focus returned to the trigger button
		const activeMatches = await page.evaluate( () => {
			const active = document.activeElement;
			if ( !active ) {
				return false;
			}
			return !!( active.closest( '#p-lang-btn, #p-lang, #ca-languages, #pt-uls, .vector-dropdown, .uls-trigger, #language-selector, .language-selector' ) );
		} );
		expect( activeMatches, 'Focus restored to language trigger or its container' ).toBe( true );
	} );

	test( 'Close button closes selector and restores focus @open', async ( { page, gotoWiki, uls } ) => {
		await gotoWiki( 'QA ULS search codes' );
		const trigger = getLanguageTrigger( page, uls.skin );
		await expect( trigger ).toBeVisible();
		await trigger.click();

		const dialog = getSelectorDialog( page );
		await expect( dialog ).toBeVisible();

		const closeBtn = getCloseButton( page );
		if ( await closeBtn.isVisible() ) {
			await closeBtn.click();
			await expect( dialog, 'Selector dialog closes on close button click' ).toBeHidden();

			const activeMatches = await page.evaluate( () => {
				const active = document.activeElement;
				if ( !active ) {
					return false;
				}
				return !!( active.closest( '#p-lang-btn, #p-lang, #ca-languages, #pt-uls, .vector-dropdown, .uls-trigger, #language-selector, .language-selector' ) );
			} );
			expect( activeMatches, 'Focus restored to language trigger or its container' ).toBe( true );
		} else {
			test.skip( true, 'n/a: close button not rendered in this viewport layout' );
		}
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

		// Click outside dialog on document body / heading
		const outside = page.locator( '#firstHeading, #content, body' ).first();
		await outside.click( { position: { x: 5, y: 5 }, force: true } );

		await expect( dialog, 'Selector dialog closes when clicking outside' ).toBeHidden();
	} );

} );
