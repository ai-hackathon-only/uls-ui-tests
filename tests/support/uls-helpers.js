// Shared ULS selectors and helpers across test specs.
'use strict';
const { expect } = require( './fixtures' );

/**
 * Returns the locator for the skin's language trigger button or link.
 * Matches verified selectors from tests/open.spec.js.
 * @param {import('@playwright/test').Page} page
 * @param {string} skin
 */
function getLanguageTrigger( page, skin ) {
	switch ( skin ) {
		case 'vector-2022':
			// The interactive, focusable trigger checkbox/button in Vector 2022
			return page.locator( '#p-lang-btn-checkbox, #p-lang-btn' ).first();
		case 'minerva':
			// The interactive anchor button in Minerva's page action list
			return page.locator( '#language-selector a.language-selector, #language-selector a, #language-selector' ).first();
		case 'vector':
		case 'monobook':
		case 'timeless':
		case 'modern':
			// Compact interlanguage link button or cog settings trigger
			return page.locator( 'button.mw-interlanguage-selector, .uls-settings-trigger' ).first();
		case 'cologneblue':
			// Cologne Blue does not integrate ULS trigger (Known Issue KI-1)
			return page.locator( '#langlinks .mw-interlanguage-selector, #p-lang-btn' );
		default:
			throw new Error( `Unknown skin: ${ skin }` );
	}
}

/**
 * Returns locator for open language selector dialog.
 * Supports ULS V2 rewrite overlay (.uls-rewrite) and classic (.uls-menu / #languagesettings).
 * @param {import('@playwright/test').Page} page
 */
function getSelectorDialog( page ) {
	return page.locator( '.uls-rewrite:visible, .uls-menu:visible, #languagesettings:visible, .mw-language-selector:visible' ).first();
}

/**
 * Returns locator for the close button inside open selector dialog.
 * @param {import('@playwright/test').Page} page
 */
function getCloseButton( page ) {
	return page.locator( '.uls-rewrite button[aria-label*="close" i], .uls-icon-close, #languagesettings .ui-dialog-titlebar-close' ).first();
}

/**
 * Opens language selector dialog and waits for it to become visible and stable.
 * @param {import('@playwright/test').Page} page
 * @param {string} skin
 */
async function openSelector( page, skin ) {
	const trigger = getLanguageTrigger( page, skin );
	await expect( trigger, `Language trigger visible for skin ${ skin }` ).toBeVisible();
	await trigger.click();
	const dialog = getSelectorDialog( page );
	await expect( dialog, 'Selector dialog visible upon trigger activation' ).toBeVisible();
	// Allow CSS transition/animation to finish
	await page.waitForTimeout( 300 );
	return dialog;
}

/**
 * Finds language option/link in selector dialog by language code.
 * @param {import('@playwright/test').Locator} dialog
 * @param {string} code
 */
function getLanguageOption( dialog, code ) {
	return dialog.locator(
		`li[role="option"][data-code="${ code }"], ` +
		`li[role="option"][data-language-code="${ code }"], ` +
		`[data-language-code="${ code }"], ` +
		`[data-code="${ code }"], ` +
		`a.uls-languagefilter-link[data-code="${ code }"], ` +
		`a[lang="${ code }"]`
	).first();
}

module.exports = {
	getLanguageTrigger,
	getSelectorDialog,
	getCloseButton,
	openSelector,
	getLanguageOption
};
