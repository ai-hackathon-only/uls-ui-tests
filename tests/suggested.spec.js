// Feature 4: Suggested / Previously Used Languages (@suggested)
// User-facing requirements from GOALS.md & FEATURES.md:
// - Previously selected or browser-suggested languages appear in the "Suggested languages" section
//   upon subsequent selector openings.
// - Persisted in window.localStorage['uls-previous-languages'] as a JSON array of language codes.
// - An empty or absent localStorage key omits the suggested section.
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
	markKnownIssues( test, uls, 'suggested' );
	if ( uls.skin === 'timeless' && ( uls.device === 'tablet' || uls.device === 'mobile' ) ) {
		test.fail( true, 'KI-4: Timeless hides language portlet (#other-languages) on viewports narrower than 851px' );
	}
	if ( uls.skin === 'monobook' && uls.device === 'mobile' ) {
		test.fail( true, 'KI-5: MonoBook sidebar navigation overlaps language trigger on mobile viewports' );
	}
}

test.describe( 'Suggested and previously used languages @suggested', () => {

	test( 'Previously used languages from localStorage appear in suggested section @suggested', async ( { page, gotoWiki, uls } ) => {
		applyRowSkips( uls );
		await gotoWiki( 'QA ULS search codes' );

		// Seed previous languages in localStorage
		await page.evaluate( () => {
			window.localStorage.setItem( 'uls-previous-languages', JSON.stringify( [ 'simple', 'de' ] ) );
		} );
		await page.reload();

		const trigger = getLanguageTrigger( page, uls.skin );
		await expect( trigger, `Language trigger visible for skin ${ uls.skin }` ).toBeVisible();
		await trigger.click( { timeout: 5000 } );

		const dialog = getSelectorDialog( page );
		await expect( dialog, 'Selector dialog visible' ).toBeVisible();

		// Suggested section locator (ULS rewrite and legacy)
		const suggestedSection = dialog.locator( '.uls-rewrite__section--suggested, .uls-lcd-region-section' ).first();
		await expect( suggestedSection, 'Suggested languages section is visible' ).toBeVisible();
		await expect( suggestedSection ).toContainText( /Suggested/i );

		// Confirm specific seeded languages appear within the suggested section
		const simpleItem = suggestedSection.locator( '.interwiki-simple, [data-code="simple"], [data-language-code="simple"]' ).first();
		await expect( simpleItem, 'Simple English appears in suggested section' ).toBeVisible();
		await expect( simpleItem ).toContainText( /Simple English/ );

		const germanItem = suggestedSection.locator( '.interwiki-de, [data-code="de"], [data-language-code="de"]' ).first();
		await expect( germanItem, 'Deutsch appears in suggested section' ).toBeVisible();
		await expect( germanItem ).toContainText( /Deutsch/ );
	} );

	test( 'Empty localStorage does not render suggested section @suggested', async ( { page, gotoWiki, uls } ) => {
		applyRowSkips( uls );
		await gotoWiki( 'QA ULS search codes' );

		// Clear previous languages in localStorage
		await page.evaluate( () => {
			window.localStorage.removeItem( 'uls-previous-languages' );
		} );
		await page.reload();

		const trigger = getLanguageTrigger( page, uls.skin );
		await expect( trigger, `Language trigger visible for skin ${ uls.skin }` ).toBeVisible();
		await trigger.click( { timeout: 5000 } );

		const dialog = getSelectorDialog( page );
		await expect( dialog, 'Selector dialog visible' ).toBeVisible();

		// When no previous languages exist, the suggested section must not be rendered
		const suggestedSection = dialog.locator( '.uls-rewrite__section--suggested' );
		await expect( suggestedSection, 'Suggested section is absent when localStorage is empty' ).toHaveCount( 0 );
	} );

} );
