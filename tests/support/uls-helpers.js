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
			// The interactive language icon/anchor in Minerva header or page actions
			return page.locator( 'a.minerva-icon--language-switcher, #page-actions-languages a, a.language-selector, #language-selector a' ).first();
		case 'vector':
		case 'monobook':
		case 'timeless':
		case 'modern':
			// Compact interlanguage link button
			return page.locator( '#p-lang button.mw-interlanguage-selector, button.mw-interlanguage-selector' ).first();
		case 'cologneblue':
			// Cologne Blue does not integrate ULS trigger (Known Issue KI-1)
			return page.locator( '#langlinks .mw-interlanguage-selector, #p-lang-btn, #p-lang-btn-nonexistent' ).first();
		default:
			throw new Error( `Unknown skin: ${ skin }` );
	}
}

/**
 * Returns locator for open language selector dialog.
 * Supports ULS V2 rewrite overlay (.uls-rewrite), mobile overlays (.language-overlay), and classic (.uls-menu / #languagesettings).
 * @param {import('@playwright/test').Page} page
 */
function getSelectorDialog( page ) {
	return page.locator( '.uls-rewrite:visible, .uls-menu:visible, #languagesettings:visible, .uls-rewrite--mobile:visible, .language-overlay:visible, .overlay.overlay-languages:visible, #languages-selector:visible, .mw-language-selector:visible' ).first();
}

/**
 * Returns locator for the close button inside open selector dialog.
 * @param {import('@playwright/test').Page} page
 */
function getCloseButton( page ) {
	return page.locator( '.uls-rewrite button[aria-label*="close" i], .uls-rewrite button.close, .uls-icon-close, #languagesettings .ui-dialog-titlebar-close, .language-overlay .cancel, .overlay .cancel' ).first();
}

/**
 * Waits for an element's bounding box to stop moving (animations/transitions settled).
 * @param {import('@playwright/test').Locator} locator
 * @param {number} maxMs
 */
async function waitForStableBox( locator, maxMs = 1000 ) {
	let prevBox = await locator.boundingBox();
	const start = Date.now();
	while ( Date.now() - start < maxMs ) {
		await new Promise( ( resolve ) => setTimeout( resolve, 50 ) );
		const curBox = await locator.boundingBox();
		if ( prevBox && curBox &&
			prevBox.x === curBox.x && prevBox.y === curBox.y &&
			prevBox.width === curBox.width && prevBox.height === curBox.height ) {
			return curBox;
		}
		prevBox = curBox;
	}
	return prevBox;
}

/**
 * Opens language selector dialog and waits for it to become visible and stable.
 * @param {import('@playwright/test').Page} page
 * @param {string} skin
 */
async function openSelector( page, skin ) {
	const trigger = getLanguageTrigger( page, skin );
	await expect( trigger, `Language trigger visible for skin ${ skin }` ).toBeVisible();
	await trigger.scrollIntoViewIfNeeded();
	await trigger.click();
	const dialog = getSelectorDialog( page );
	await expect( dialog, 'Selector dialog visible upon trigger activation' ).toBeVisible();
	await waitForStableBox( dialog );
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
	waitForStableBox,
	openSelector,
	getLanguageOption
};
