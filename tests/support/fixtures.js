// Shared fixtures (shared contract). Every spec imports { test, expect } from here.
//
//  - Options from the project: uls: { skin, device, user }.
//  - gotoWiki( title, params ): opens a page with the project's skin
//    (useskin=<skin>&useformat=desktop, or useformat=mobile for Minerva).
//  - Logged-in projects: one account per worker from ULS_USERS
//    (testInfo.parallelIndex), logged in once per worker, storage state in .auth/.
//  - errors: console errors, page errors and failed (>= 400) requests, collected
//    from the first navigation and checked after each test (see known-errors.js).
//  - Logged-in rows: after every test, pass or fail, the account's preferences
//    are reset to the wiki defaults (action=options&reset=1), so a test that
//    dies before it restores `language` does not leak into the next test.
'use strict';
const fs = require( 'fs' );
const path = require( 'path' );
const base = require( '@playwright/test' );
const { checkBaseUrl } = require( './base-url' );
const { isKnownError } = require( './known-errors' );
const { qaCookies } = require( './cookies' );

const WIKI = checkBaseUrl( process.env.ULS_WIKI );
const AUTH_DIR = path.join( __dirname, '..', '..', '.auth' );

function accounts() {
	return ( process.env.ULS_USERS || '' ).split( ',' ).map( ( s ) => s.trim() ).filter( Boolean );
}

function skinParams( skin ) {
	return skin === 'minerva' ?
		{ useformat: 'mobile', useskin: 'minerva' } :
		{ useformat: 'desktop', useskin: skin };
}

function wikiUrl( title, params, skin ) {
	const u = new URL( '/w/index.php', WIKI );
	u.searchParams.set( 'title', title );
	for ( const [ k, v ] of Object.entries( { ...skinParams( skin ), ...params } ) ) {
		u.searchParams.set( k, v );
	}
	return u.toString();
}

// Reset all preferences of the logged-in account to the wiki defaults
// (interface language en, no uls-preferences). Runs in the browser, because
// Node does not resolve *.localhost hosts but Chrome does.
async function resetPrefs( context ) {
	const page = await context.newPage();
	try {
		await page.goto( `${ WIKI }/w/api.php` );
		const body = await page.evaluate( async () => {
			const api = '/w/api.php';
			const tok = await ( await fetch( `${ api }?action=query&meta=tokens&type=csrf&format=json` ) ).json();
			const form = new URLSearchParams( { action: 'options', reset: '1', format: 'json', token: tok.query.tokens.csrftoken } );
			return ( await fetch( api, { method: 'POST', body: form } ) ).json();
		} );
		if ( body.options !== 'success' ) {
			// Say whether the browser lost the session cookie or the wiki dropped
			// the session behind a cookie it still sends (issue #53).
			const cookies = ( await context.cookies( WIKI ) ).map( ( c ) => c.name ).filter( ( n ) => /_session$/.test( n ) );
			const who = await page.evaluate( async () => ( await ( await fetch( '/w/api.php?action=query&meta=userinfo&format=json' ) ).json() ).query.userinfo );
			const err = new Error( `Preference reset failed: ${ JSON.stringify( body ) }; session cookie in context: ${ cookies.join( ',' ) || 'none' }; userinfo: ${ JSON.stringify( who ) }` );
			err.sessionLost = !!( body.error && body.error.code === 'notloggedin' && who && who.anon !== undefined );
			throw err;
		}
	} finally {
		await page.close();
	}
}

// The wiki keeps sessions in its main object cache (APCu). Under a full
// matrix run that cache can drop sessions, which shows up as "notloggedin"
// or as the login form's session-hijacking error (issue #53). Both are
// failures of the test wiki, not of ULS, so the fixtures (never a test body)
// log in once more and leave an annotation that says so.
const SESSION_FAILURE = /problem with your login session|session hijacking/i;

async function loginOnce( browser, username, file ) {
	const ctx = await browser.newContext();
	await ctx.addCookies( qaCookies( WIKI ) );
	try {
		const page = await ctx.newPage();
		await page.goto( `${ WIKI }/w/index.php?title=Special:UserLogin&useskin=vector-2022&useformat=desktop` );
		await page.fill( '#wpName1', username );
		await page.fill( '#wpPassword1', process.env.ULS_PASSWORD || '' );
		await page.click( '#wpLoginAttempt' );
		await page.waitForURL( ( u ) => !u.searchParams.has( 'title' ) || !/UserLogin/.test( u.toString() ) );
		await page.waitForFunction( () => window.mw && mw.config && mw.config.get( 'skin' ) );
		const name = await page.evaluate( () => mw.config.get( 'wgUserName' ) );
		if ( name !== username ) {
			const msg = ( await page.locator( '.mw-message-box-error, .errorbox, .cdx-message--error' ).allInnerTexts() ).join( ' | ' ).trim();
			return { error: `Login failed for ${ username } (wgUserName=${ name }); page says: ${ msg || '(no error message)' }`, sessionLost: SESSION_FAILURE.test( msg ) };
		}
		fs.mkdirSync( AUTH_DIR, { recursive: true } );
		await ctx.storageState( { path: file } );
		await resetPrefs( ctx );
		return {};
	} finally {
		await ctx.close();
	}
}

// Returns a note when a lost session needed a second login, else null.
async function login( browser, username, file ) {
	const first = await loginOnce( browser, username, file );
	if ( !first.error ) {
		return null;
	}
	if ( !first.sessionLost ) {
		throw new Error( first.error );
	}
	const second = await loginOnce( browser, username, file );
	if ( second.error ) {
		throw new Error( `${ first.error }; second login: ${ second.error }` );
	}
	return first.error;
}

const test = base.test.extend( {
	// Worker-scoped so a worker serves one matrix row at a time.
	uls: [ { skin: 'vector-2022', device: 'desktop', user: 'anon' }, { option: true, scope: 'worker' } ],

	// Logged-in rows: this worker's account (ULS_USERS[parallelIndex]),
	// logged in once per worker; storage state file in .auth/.
	authState: [ async ( { browser, uls }, use, workerInfo ) => {
		if ( uls.user !== 'user' ) {
			await use( undefined );
			return;
		}
		const list = accounts();
		const name = list[ workerInfo.parallelIndex ];
		if ( !name ) {
			throw new Error( `No account for worker ${ workerInfo.parallelIndex }; ULS_USERS has ${ list.length }` );
		}
		const file = path.join( AUTH_DIR, `${ name }.json` );
		const note = await login( browser, name, file );
		if ( note ) {
			console.warn( `[session-lost] worker login: ${ note }` );
		}
		await use( file );
	}, { scope: 'worker' } ],

	storageState: async ( { authState }, use ) => {
		await use( authState );
	},

	// ULS_COOKIES (QA cookies) on the wiki host, anonymous and logged in.
	context: async ( { context }, use ) => {
		await context.addCookies( qaCookies( WIKI ) );
		await use( context );
	},

	// The logged-in account name (null for anon rows).
	userName: async ( { uls }, use, testInfo ) => {
		await use( uls.user === 'user' ? accounts()[ testInfo.parallelIndex ] : null );
	},

	// Auto fixture: logged-in rows reset preferences after each test, even on failure.
	// If the wiki dropped the session (notloggedin, see #53), log in again,
	// which also resets the preferences and refreshes the storage state file,
	// and annotate the test so the report shows it.
	resetPrefsAfter: [ async ( { context, uls, browser, authState, userName }, use, testInfo ) => {
		await use();
		if ( uls.user !== 'user' ) {
			return;
		}
		try {
			await resetPrefs( context );
		} catch ( err ) {
			if ( !err.sessionLost ) {
				throw err;
			}
			testInfo.annotations.push( { type: 'session-lost', description: `wiki dropped the session of ${ userName } before the preference reset; logged in again. ${ err.message }` } );
			await login( browser, userName, authState );
		}
	}, { auto: true } ],

	errors: async ( { page }, use, testInfo ) => {
		const list = [];
		page.on( 'console', ( msg ) => {
			if ( msg.type() === 'error' ) {
				// "Failed to load resource" names the URL only in location().
				const where = msg.location() && msg.location().url;
				list.push( { kind: 'console', text: where ? `${ msg.text() } [${ where }]` : msg.text(), url: page.url() } );
			}
		} );
		page.on( 'pageerror', ( err ) => list.push( { kind: 'pageerror', text: String( err ), url: page.url() } ) );
		page.on( 'response', ( res ) => {
			if ( res.status() >= 400 ) {
				list.push( { kind: 'http', text: `${ res.status() } ${ res.url() }`, url: page.url() } );
			}
		} );
		await use( list );
		const unexpected = list.filter( ( e ) => !isKnownError( e ) );
		if ( list.length ) {
			await testInfo.attach( 'page-errors.json', { body: JSON.stringify( list, null, 2 ), contentType: 'application/json' } );
		}
		if ( testInfo.status === testInfo.expectedStatus ) {
			base.expect( unexpected, 'console errors / failed requests' ).toEqual( [] );
		}
	},

	gotoWiki: async ( { page, uls, errors: _e }, use ) => {
		await use( async ( title, params = {} ) => {
			const res = await page.goto( wikiUrl( title, params, uls.skin ) );
			return res;
		} );
	}
} );

module.exports = { test, resetPrefs, expect: base.expect, wikiUrl, skinParams, WIKI };
