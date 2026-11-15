// Feature 13: New Selector (ULS V2) Behaviours (@v2)
// Covers Vue/Codex rewrite features in UniversalLanguageSelector.vue (.uls-rewrite):
// - Inline typeahead ghost autocomplete (.uls-rewrite__search-ghost) & ArrowRight completion
// - Codex search clear button (.cdx-text-input__clear-icon) resetting to default sections
// - Live screen-reader status announcement (.uls-rewrite__sr-only[role="status"])
// - Distinct empty states for valid-but-unavailable vs invalid language queries
// - PageDown / PageUp keyboard pagination in the language list
'use strict';
const { test, expect } = require( './support/fixtures' );
const { markKnownIssues } = require( './support/known-issues' );
const { openSelector } = require( './support/uls-helpers' );

test.describe( 'ULS V2 rewrite selector behaviours @v2', () => {

	test.beforeEach( async ( { uls } ) => {
		markKnownIssues( test, uls, 'v2' );
	} );

	test( 'New selector typeahead ghost, clear button, empty states, SR status and pagination @v2', async ( { page, gotoWiki, uls } ) => {
		await gotoWiki( 'QA ULS search codes' );
		const dialog = await openSelector( page, uls.skin );

		const isRewrite = await dialog.evaluate( ( el ) => el.classList.contains( 'uls-rewrite' ) );
		if ( !isRewrite ) {
			test.skip( true, 'n/a: legacy ULS selector active' );
		}

		const searchInput = dialog.locator( '.uls-rewrite__search-active input' ).first();
		await expect( searchInput, 'ULS V2 search input is visible' ).toBeVisible();

		await test.step( 'Typeahead ghost autocomplete and ArrowRight completion', async () => {
			await searchInput.click();
			await searchInput.fill( 'Ger' );

			const ghostInput = dialog.locator( '.uls-rewrite__search-ghost input' );
			await expect.soft( ghostInput, 'Typeahead ghost input appears for "Ger"' ).toBeVisible();
			const ghostVal = await ghostInput.inputValue().catch( () => '' );
			expect.soft( ghostVal.toLowerCase(), 'Ghost suggestion extends "ger"' ).toMatch( /^ger.+/ );

			// Move caret to end and accept suggestion with ArrowRight
			await searchInput.press( 'End' );
			await searchInput.press( 'ArrowRight' );
			await expect.soft( searchInput, 'ArrowRight accepts ghost suggestion' ).toHaveValue( ghostVal );
			await expect.soft( ghostInput, 'Ghost input hides once suggestion is accepted' ).toBeHidden();
		} );

		await test.step( 'Codex clear button resets search and restores default sections', async () => {
			const clearBtn = dialog.locator( '.uls-rewrite__search-active .cdx-text-input__clear-icon' );
			await expect.soft( clearBtn, 'Codex clear button is visible when search is non-empty' ).toBeVisible();
			await clearBtn.click();

			await expect.soft( searchInput, 'Clear button empties the search input' ).toHaveValue( '' );
			await expect.soft( dialog.locator( '.uls-rewrite__section' ).first(), 'Default language sections return after clear' ).toBeVisible();
		} );

		await test.step( 'Tab accepts typeahead ghost autocomplete', async () => {
			await searchInput.fill( 'Fre' );
			const ghostInput = dialog.locator( '.uls-rewrite__search-ghost input' );
			await expect.soft( ghostInput, 'Typeahead ghost input appears for "Fre"' ).toBeVisible();
			const ghostVal = await ghostInput.inputValue().catch( () => '' );
			expect.soft( ghostVal.toLowerCase(), 'Ghost suggestion extends "fre"' ).toMatch( /^fre.+/ );

			await searchInput.press( 'Tab' );
			await expect.soft( searchInput, 'Tab accepts ghost suggestion' ).toHaveValue( ghostVal );
			await expect.soft( ghostInput, 'Ghost input hides after Tab acceptance' ).toBeHidden();

			const clearBtn = dialog.locator( '.uls-rewrite__search-active .cdx-text-input__clear-icon' );
			if ( await clearBtn.isVisible() ) {
				await clearBtn.click();
			} else {
				await searchInput.fill( '' );
			}
		} );

		let resultStatus = '';
		await test.step( 'Live screen-reader status updates on search and empty results', async () => {
			const srStatus = dialog.locator( '.uls-rewrite__sr-only[role="status"]' );
			await searchInput.fill( 'German' );
			await expect.soft( srStatus, 'SR status announces search results for "German"' ).not.toHaveText( /^\s*$/ );
			resultStatus = ( await srStatus.textContent() || '' ).trim();

			await searchInput.fill( 'xyznonexistentlang999' );
			await expect.soft( srStatus, 'SR status updates for no-results query' ).not.toHaveText( resultStatus );
		} );

		await test.step( 'Distinct empty states for valid-unavailable vs invalid search', async () => {
			const noResultsTitle = dialog.locator( '.uls-rewrite__no-results h3' );
			await expect.soft( noResultsTitle, 'Invalid query shows no-results heading' ).toBeVisible();
			const invalidTitle = ( await noResultsTitle.textContent() || '' ).trim();
			expect.soft( invalidTitle.length, 'Invalid query heading is non-empty' ).toBeGreaterThan( 0 );

			// QA ULS search codes has 12 langlinks (als, be-x-old, de, es, fr, it, ja, nl, pt, simple, sv, zh-yue);
			// Zulu (zu) is a valid ULS language that is not linked on this page.
			await searchInput.fill( 'Zulu' );
			await expect.soft( noResultsTitle, 'Valid-but-unavailable language "Zulu" shows empty-search heading' ).toBeVisible();
			await expect.soft( noResultsTitle, 'Valid-unavailable heading differs from invalid-query heading' ).not.toHaveText( invalidTitle );
		} );

		await test.step( 'PageDown and PageUp paginate the language list', async () => {
			const clearBtn = dialog.locator( '.uls-rewrite__search-active .cdx-text-input__clear-icon' );
			if ( await clearBtn.isVisible() ) {
				await clearBtn.click();
			} else {
				await searchInput.fill( '' );
			}
			await searchInput.click();

			await searchInput.press( 'PageDown' );
			const highlighted = dialog.locator( '.uls-rewrite__language-item--highlighted' ).first();
			await expect.soft( highlighted, 'PageDown highlights a language item' ).toBeVisible();
			const afterDownCode = await highlighted.getAttribute( 'data-code' ) || await highlighted.textContent();

			await searchInput.press( 'PageDown' );
			const secondDownCode = await highlighted.getAttribute( 'data-code' ) || await highlighted.textContent();
			expect.soft( secondDownCode, 'Second PageDown advances further down the list' ).not.toBe( afterDownCode );

			await searchInput.press( 'PageUp' );
			const afterUpCode = await highlighted.getAttribute( 'data-code' ) || await highlighted.textContent();
			expect.soft( afterUpCode, 'PageUp returns highlight to the first PageDown item' ).toBe( afterDownCode );
		} );
	} );

} );
