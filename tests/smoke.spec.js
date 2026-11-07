// Smoke test: the matrix row is what it says (skin, mobile view, user).
// Test naming (shared contract): file per feature group, tests/<group>.spec.js;
// title '<what it checks> @<group>', e.g. 'Esc closes the selector @open'.
'use strict';
const { test, expect } = require( './support/fixtures' );

test( 'page renders in the row\'s skin and user @smoke', async ( { page, gotoWiki, uls, userName } ) => {
	await gotoWiki( 'Main_Page' );
	const cfg = await page.evaluate( () => ( {
		skin: mw.config.get( 'skin' ),
		user: mw.config.get( 'wgUserName' )
	} ) );
	expect( cfg.skin ).toBe( uls.skin );
	expect( cfg.user ).toBe( userName );
} );
