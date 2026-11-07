// Shared fixtures (shared contract). Every spec imports { test, expect } from here.
//
//  - Options from the project: uls: { skin, device, user }.
//  - gotoWiki( title, params ): opens a page with the project's skin
//    (useskin=<skin>&useformat=desktop, or useformat=mobile for Minerva).
//  - Logged-in projects: one account per worker from ULS_USERS
//    (testInfo.parallelIndex), logged in once per worker, storage state in .auth/.
//  - errors: console errors, page errors and failed (>= 400) requests, collected
//    from the first navigation and checked after each test (see known-errors.js).
'use strict';
const fs = require( 'fs' );
const path = require( 'path' );
const base = require( '@playwright/test' );
const { checkBaseUrl } = require( './base-url' );
const { isKnownError } = require( './known-errors' );

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

async function login( browser, username, file ) {
	const ctx = await browser.newContext();
	const page = await ctx.newPage();
	await page.goto( `${ WIKI }/w/index.php?title=Special:UserLogin&useskin=vector-2022&useformat=desktop` );
	await page.fill( '#wpName1', username );
	await page.fill( '#wpPassword1', process.env.ULS_PASSWORD || '' );
	await page.click( '#wpLoginAttempt' );
	await page.waitForURL( ( u ) => !u.searchParams.has( 'title' ) || !/UserLogin/.test( u.toString() ) );
	await page.waitForFunction( () => window.mw && mw.config && mw.config.get( 'skin' ) );
	const name = await page.evaluate( () => mw.config.get( 'wgUserName' ) );
	if ( name !== username ) {
		throw new Error( `Login failed for ${ username } (wgUserName=${ name })` );
	}
	fs.mkdirSync( AUTH_DIR, { recursive: true } );
	await ctx.storageState( { path: file } );
	await ctx.close();
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
		await login( browser, name, file );
		await use( file );
	}, { scope: 'worker' } ],

	storageState: async ( { authState }, use ) => {
		await use( authState );
	},

	// The logged-in account name (null for anon rows).
	userName: async ( { uls }, use, testInfo ) => {
		await use( uls.user === 'user' ? accounts()[ testInfo.parallelIndex ] : null );
	},

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

module.exports = { test, expect: base.expect, wikiUrl, skinParams, WIKI };
