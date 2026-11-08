// Interface language change (GOALS feature 5) and the language field in
// Special:Preferences (feature 7).
//
// ULS changes the interface language through ?setlang=<code>: a confirm dialog
// (.uls-setlang-dialog, ext.uls.setlang.js) posts action=ulssetlang, which sets
// the `language` cookie for anonymous users (wgULSAnonCanChangeLanguage) or the
// saved `language` preference for logged-in users, then reloads the page.
// Anonymous rows get a fresh browser context per test; logged-in rows are reset
// to the wiki defaults after every test by the resetPrefsAfter fixture.
'use strict';
const { test, expect } = require( './support/fixtures' );

const PAGE = 'QA ULS search codes';

async function uiLanguage( page ) {
	await page.waitForFunction( () => window.mw && mw.config && mw.config.get( 'wgUserLanguage' ) );
	return page.evaluate( () => ( {
		config: mw.config.get( 'wgUserLanguage' ),
		html: document.documentElement.lang
	} ) );
}

// The saved `language` preference of the logged-in account, read by the API.
async function savedLanguage( page ) {
	return page.evaluate( async () => {
		const r = await fetch( '/w/api.php?action=query&meta=userinfo&uiprop=options&format=json&formatversion=2' );
		return ( await r.json() ).query.userinfo.options.language;
	} );
}

test.describe( 'Interface language @uilang', () => {
	test( 'setlang dialog Accept switches the interface language and it stays after a reload @uilang', async ( { page, gotoWiki, uls } ) => {
		await gotoWiki( PAGE );
		expect( ( await uiLanguage( page ) ).config ).toBe( 'en' );

		await gotoWiki( PAGE, { setlang: 'de' } );
		const dialog = page.locator( '.uls-setlang-dialog' );
		await expect( dialog ).toBeVisible();
		await expect( dialog ).toContainText( 'Deutsch' );
		await Promise.all( [
			page.waitForURL( ( u ) => !u.searchParams.has( 'setlang' ) ),
			page.locator( '.uls-setlang-apply' ).click()
		] );
		await page.waitForLoadState( 'load' );
		expect( await uiLanguage( page ) ).toEqual( { config: 'de', html: 'de' } );

		// A new page load, without setlang, keeps the language.
		await gotoWiki( PAGE );
		expect( await uiLanguage( page ) ).toEqual( { config: 'de', html: 'de' } );
		if ( uls.user === 'user' ) {
			expect( await savedLanguage( page ) ).toBe( 'de' );
		} else {
			const cookies = await page.context().cookies();
			expect( cookies.find( ( c ) => /language$/.test( c.name ) && c.value === 'de' ), 'language cookie' ).toBeTruthy();
		}
	} );

	test( 'setlang dialog Cancel keeps the interface language @uilang', async ( { page, gotoWiki } ) => {
		await gotoWiki( PAGE, { setlang: 'de' } );
		const dialog = page.locator( '.uls-setlang-dialog' );
		await expect( dialog ).toBeVisible();
		await page.locator( '.uls-setlang-cancel' ).click();
		await expect( dialog ).toBeHidden();

		await gotoWiki( PAGE );
		expect( await uiLanguage( page ) ).toEqual( { config: 'en', html: 'en' } );
	} );
} );

test.describe( 'Special:Preferences language field @prefs', () => {
	test( 'language field shows the current language and saving it changes the interface @prefs', async ( { page, gotoWiki, uls } ) => {
		test.skip( uls.user !== 'user', 'n/a: Special:Preferences needs a logged-in user' );

		await gotoWiki( 'Special:Preferences' );
		// Core replaces the <select> with a Codex lookup (mw.widgets.LanguageSelectWidget).
		const field = page.locator( '.oo-ui-fieldLayout:has( > .oo-ui-fieldLayout-body #mw-input-wplanguage )' );
		const input = field.locator( 'input[role="combobox"]' );
		await expect( input ).toBeVisible();
		await expect( input ).toHaveValue( /English/ );

		await input.fill( 'Deutsch' );
		const option = page.locator( '.cdx-menu-item:visible' ).filter( { hasText: 'Deutsch' } ).first();
		await option.click();
		await expect( page.locator( '#mw-input-wplanguage' ) ).toHaveValue( 'de' );

		await Promise.all( [
			page.waitForNavigation(),
			page.locator( '#prefcontrol button, .mw-htmlform-submit-buttons button[type="submit"]' ).first().click()
		] );
		await gotoWiki( PAGE );
		expect( await uiLanguage( page ) ).toEqual( { config: 'de', html: 'de' } );
		expect( await savedLanguage( page ) ).toBe( 'de' );
	} );
} );
