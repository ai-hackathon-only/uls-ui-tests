'use strict';
const fs = require( 'fs' );
const path = require( 'path' );
const { chromium } = require( '@playwright/test' );
const { checkBaseUrl } = require( './support/base-url' );
const { readRunInfo } = require( './support/run-info' );

module.exports = async () => {
	const wiki = checkBaseUrl( process.env.ULS_WIKI );
	const browser = await chromium.launch( {
		channel: 'chrome',
		chromiumSandbox: true,
		args: process.env.ULS_NO_PROXY === '1' ? [ '--no-proxy-server' ] : []
	} );
	const info = await readRunInfo( await browser.newPage(), wiki );
	await browser.close();
	if ( !info.ulsCommit || !info.coreCommit ) {
		throw new Error( `Could not read commits from Special:Version: ${ JSON.stringify( info ) }` );
	}
	const dir = path.join( __dirname, '..', 'test-results' );
	fs.mkdirSync( dir, { recursive: true } );
	fs.writeFileSync( path.join( dir, 'run-info.json' ), JSON.stringify( info, null, 2 ) );
	console.log( `Wiki ${ wiki } | MediaWiki ${ info.coreVersion } (${ info.coreCommit.slice( 0, 7 ) }) | ULS ${ info.ulsCommit.slice( 0, 7 ) } | skins: ${ info.skins.join( ', ' ) }` );
};
