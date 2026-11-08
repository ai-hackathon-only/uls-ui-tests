// Language settings dialog (GOALS feature 6): Display tab and Input tab.
//
// In the ULS rewrite the dialog is reached from the selector: the "Show quick
// actions" button, then "Open language settings" (LanguageSettingsEntrypoint.js),
// which mounts the legacy languagesettings dialog (#language-settings-dialog).
'use strict';
const { test, expect } = require( './support/fixtures' );
const { markKnownIssues } = require( './support/known-issues' );
const { openSelector } = require( './support/uls-helpers' );

const PAGE = 'QA ULS search codes';

async function openSettings( page, uls ) {
	// Shared helper: asserts the trigger is visible first, so a skin without
	// a button fails fast (expected failure for KI-1/KI-4) instead of timing out.
	await openSelector( page, uls.skin );
	const selector = page.locator( '.uls-rewrite' );
	await expect( selector ).toBeVisible();
	// Vector 2022 tucks the entry point into a "Show quick actions" menu; the
	// other skins show "Open language settings" in the selector header.
	const quick = selector.getByRole( 'button', { name: 'Show quick actions' } );
	const direct = selector.getByRole( 'button', { name: 'Open language settings' } );
	await expect( quick.or( direct ).first() ).toBeVisible();
	if ( await quick.isVisible() ) {
		await quick.click();
	}
	await page.getByRole( 'button', { name: 'Open language settings' } ).click();
	const dialog = page.locator( '#language-settings-dialog' );
	await expect( dialog ).toBeVisible();
	return dialog;
}

test.describe( 'Language settings @settings', () => {
	test.beforeEach( ( { uls } ) => {
		test.skip( uls.skin === 'minerva', 'n/a: MinervaNeue skin.json sets LanguageSettingsQuickAction: false, so the selector has no language settings entry point' );
	} );

	test( 'quick action opens the settings dialog and the close button closes it @settings', async ( { page, gotoWiki, uls } ) => {
		markKnownIssues( test, uls, 'settings' );
		await gotoWiki( PAGE );
		const dialog = await openSettings( page, uls );
		await expect( dialog.locator( '#display-panel-trigger' ) ).toBeVisible();
		await expect( dialog.locator( '#input-panel-trigger' ) ).toBeVisible();
		await dialog.locator( '#languagesettings-close' ).click();
		await expect( dialog ).toBeHidden();
	} );

	test( 'Display tab shows interface language and fonts settings @settings', async ( { page, gotoWiki, uls } ) => {
		markKnownIssues( test, uls, 'settings' );
		await gotoWiki( PAGE );
		const dialog = await openSettings( page, uls );
		await dialog.locator( '#display-panel-trigger' ).click();
		const panel = dialog.locator( '.uls-display-settings' );
		await expect( panel ).toBeVisible();
		// Language sub-tab: interface language buttons (ext.uls.displaysettings.js).
		await expect( panel.getByRole( 'heading', { name: 'Display language' } ) ).toBeVisible();
		await expect( panel.getByRole( 'button', { name: 'English', exact: true } ) ).toBeVisible();
		await expect( dialog.getByRole( 'button', { name: 'Apply settings' } ) ).toBeDisabled();
		// Fonts sub-tab: the webfonts checkbox.
		await panel.locator( '#uls-display-settings-fonts-tab' ).click();
		await expect( panel.locator( '#webfonts-enable-checkbox' ) ).toBeVisible();
	} );

	test( 'Input tab enables an input method; the search box transliterates (non-touch) @settings', async ( { page, gotoWiki, uls } ) => {
		markKnownIssues( test, uls, 'settings' );
		await gotoWiki( PAGE );
		const dialog = await openSettings( page, uls );
		// show() opens the Display module first, and DisplaySettings.render()
		// fills the panel only after setupWebFonts() resolves (async). A click on
		// Input before that is overwritten by the late Display render (#48), so
		// wait for the Display panel to be in place before switching.
		await expect( dialog.locator( '.uls-display-settings' ) ).toBeVisible();
		await dialog.locator( '#input-panel-trigger' ).click();
		const panel = dialog.locator( '.uls-input-settings' );
		await expect( panel ).toBeVisible();
		await expect( dialog.locator( '.uls-display-settings' ) ).toHaveCount( 0 );
		// Input tools are on by default; the toggle offers to turn them off.
		await expect( panel.locator( '.uls-input-toggle-button' ) ).toHaveText( 'Disable input tools' );
		// English offers the IPA input methods; pick X-SAMPA and apply.
		await panel.locator( 'label[for="ipa-x-sampa"]' ).click();
		await expect( panel.locator( '#ipa-x-sampa' ) ).toBeChecked();
		await dialog.getByRole( 'button', { name: 'Apply settings' } ).click();
		await expect( dialog ).toBeHidden();
		// The choice survives a reload; then typing X-SAMPA in the selector's
		// search box gives IPA: "S@" -> "ʃə" (jquery.ime ipa-x-sampa rules).
		await page.reload();
		await openSelector( page, uls.skin );
		const search = page.locator( '.uls-rewrite input[type="search"], .uls-rewrite input' ).first();
		await search.click();
		// ext.uls.interface.js init(): "Touch devices have their own on-screen
		// keyboards", so initIme() only runs when the device is not touch-first.
		const touchFirst = await page.evaluate( () => window.matchMedia( '(pointer: coarse) and (hover: none)' ).matches );
		if ( touchFirst ) {
			await search.pressSequentially( 'S@' );
			await expect( search ).toHaveValue( 'S@' );
			expect( await search.evaluate( ( el ) => !!jQuery( el ).data( 'ime' ) ) ).toBe( false );
			return;
		}
		await page.waitForFunction( () => {
			const el = document.activeElement;
			const ime = el && window.jQuery && jQuery( el ).data( 'ime' );
			return !!( ime && ime.inputmethod );
		} );
		await search.pressSequentially( 'S@' );
		await expect( search ).toHaveValue( 'ʃə' );
	} );
} );
