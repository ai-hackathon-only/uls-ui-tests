// @ts-check
'use strict';
const { defineConfig } = require( '@playwright/test' );
const { rows, DEVICES } = require( './tests/support/matrix' );
const { checkBaseUrl } = require( './tests/support/base-url' );

checkBaseUrl( process.env.ULS_WIKI );
const accounts = ( process.env.ULS_USERS || '' ).split( ',' ).filter( Boolean ).length;
// At most one worker per test account, so logged-in workers never share a user.
const workers = Math.max( 1, Math.min( Number( process.env.ULS_WORKERS ) || accounts || 1, accounts || 1 ) );

module.exports = defineConfig( {
	testDir: './tests',
	testMatch: '**/*.spec.js',
	globalSetup: require.resolve( './tests/global-setup' ),
	fullyParallel: false,
	workers,
	retries: 0, // flaky tests get fixed or removed, never retried
	timeout: 30000,
	expect: { timeout: 10000 },
	reporter: [ [ 'list' ], [ 'html', { open: 'never', outputFolder: 'playwright-report' } ] ],
	use: {
		channel: 'chrome',
		headless: true,
		launchOptions: {
			chromiumSandbox: true,
			args: process.env.ULS_NO_PROXY === '1' ? [ '--no-proxy-server' ] : []
		},
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure'
	},
	projects: rows().map( ( r ) => ( {
		name: r.name,
		use: { ...DEVICES[ r.device ], uls: { skin: r.skin, device: r.device, user: r.user } }
	} ) )
} );
