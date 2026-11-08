// Feature 4: Suggested / Previously Used Languages (@suggested)
// User-facing requirements from GOALS.md & FEATURES.md:
// - Picking a language in the selector records it to history so it shows up in
//   the "Suggested" section on subsequent openings.
// - Previously used languages stored in localStorage['uls-previous-languages']
//   render under the "Suggested" section.
// - An empty or cleared history omits the suggested section.
// - ULS rewrite selector dialog is available in Vector 2022 and Minerva.
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
			return page.locator( 'a.language-selector, #page-actions-languages a, a.minerva-icon--language-switcher' ).first();
		default:
			return page.locator( 'button.mw-interlanguage-selector' ).first();
	}
}

/**
 * Returns the locator for the open language selector dialog.
 * @param {import('@playwright/test').Page} page
 */
function getSelectorDialog( page ) {
	return page.locator( [
		'.uls-rewrite:visible',
		'.language-overlay:visible',
		'#languages-selector:visible'
	].join( ', ' ) ).first();
}

/**
 * Applies known issue fail annotations and matrix row applicability.
 * @param {object} uls
 */
function applyRowSkips( uls ) {
	markKnownIssues( test, uls, 'suggested' );
	if ( uls.skin !== 'vector-2022' && uls.skin !== 'minerva' ) {
		test.skip( true, 'n/a: legacy skin renders static links in sidebar portlet; suggested section only in ULS selector dialog' );
	}
}

test.describe( 'Suggested and previously used languages @suggested', () => {

	test.beforeEach( async ( { page } ) => {
		// Mock external destinations so link navigation never hits public Wikipedia
		await page.route( 'https://*.wikipedia.org/**', async ( route ) => {
			await route.fulfill( {
				status: 200,
				contentType: 'text/html',
				body: '<!DOCTYPE html><html><body>Navigated Destination</body></html>'
			} );
		} );
		await page.route( '**/undefined', async ( route ) => {
			await route.fulfill( {
				status: 200,
				contentType: 'text/html',
				body: '<!DOCTYPE html><html><body>Navigated Destination</body></html>'
			} );
		} );
	} );

	test( 'Selecting a language adds it to history and shows it under suggested on reopen @suggested', async ( { page, gotoWiki, uls } ) => {
		applyRowSkips( uls );
		await page.addInitScript( () => {
			window.localStorage.removeItem( 'uls-previous-languages' );
		} );
		await gotoWiki( 'QA ULS search codes' );

		const trigger = getLanguageTrigger( page, uls.skin );
		await expect( trigger, `Language trigger visible for skin ${ uls.skin }` ).toBeVisible();
		await trigger.click();

		const dialog = getSelectorDialog( page );
		await expect( dialog, 'Selector dialog visible' ).toBeVisible();

		// Initially without previous languages, suggested section must be absent
		await expect( dialog.locator( '.uls-rewrite__section--suggested' ) ).toHaveCount( 0 );

		// Click German (de) option in selector list
		const deItem = dialog.locator( 'li[data-language-code="de"], [data-code="de"]' ).first();
		await expect( deItem, 'German option visible in list' ).toBeVisible();
		await deItem.click();

		// Return to article page
		await page.goBack();
		await expect( trigger, 'Returned to page and trigger is visible' ).toBeVisible();

		// Reopen selector
		await trigger.click();
		const reopenedDialog = getSelectorDialog( page );
		await expect( reopenedDialog, 'Reopened selector dialog visible' ).toBeVisible();

		// German must now appear under the suggested section
		const suggestedSection = reopenedDialog.locator( '.uls-rewrite__section--suggested' );
		await expect( suggestedSection, 'Suggested section visible after language selection' ).toBeVisible();
		await expect( suggestedSection ).toContainText( /Deutsch/ );
	} );

	test( 'Previously used languages from localStorage appear in suggested section @suggested', async ( { page, gotoWiki, uls } ) => {
		applyRowSkips( uls );
		await page.addInitScript( () => {
			window.localStorage.setItem( 'uls-previous-languages', JSON.stringify( [ 'simple', 'de' ] ) );
		} );
		await gotoWiki( 'QA ULS search codes' );

		const trigger = getLanguageTrigger( page, uls.skin );
		await expect( trigger, `Language trigger visible for skin ${ uls.skin }` ).toBeVisible();
		await trigger.click();

		const dialog = getSelectorDialog( page );
		await expect( dialog, 'Selector dialog visible' ).toBeVisible();

		// Suggested section locator
		const suggestedSection = dialog.locator( '.uls-rewrite__section--suggested' );
		await expect( suggestedSection, 'Suggested languages section is visible' ).toBeVisible();
		await expect( suggestedSection ).toContainText( /Suggested/i );

		// Confirm specific seeded languages appear within the suggested section
		const simpleItem = suggestedSection.locator( '[data-language-code="simple"], [data-code="simple"], .interwiki-simple' ).first();
		await expect( simpleItem, 'Simple English appears in suggested section' ).toBeVisible();
		await expect( simpleItem ).toContainText( /Simple English/ );

		const germanItem = suggestedSection.locator( '[data-language-code="de"], [data-code="de"], .interwiki-de' ).first();
		await expect( germanItem, 'Deutsch appears in suggested section' ).toBeVisible();
		await expect( germanItem ).toContainText( /Deutsch/ );
	} );

	test( 'Empty localStorage does not render suggested section @suggested', async ( { page, gotoWiki, uls } ) => {
		applyRowSkips( uls );
		await page.addInitScript( () => {
			window.localStorage.removeItem( 'uls-previous-languages' );
		} );
		await gotoWiki( 'QA ULS search codes' );

		const trigger = getLanguageTrigger( page, uls.skin );
		await expect( trigger, `Language trigger visible for skin ${ uls.skin }` ).toBeVisible();
		await trigger.click();

		const dialog = getSelectorDialog( page );
		await expect( dialog, 'Selector dialog visible' ).toBeVisible();

		// When no previous languages exist, the suggested section must not be rendered
		const suggestedSection = dialog.locator( '.uls-rewrite__section--suggested' );
		await expect( suggestedSection, 'Suggested section is absent when localStorage is empty' ).toHaveCount( 0 );
	} );

} );
