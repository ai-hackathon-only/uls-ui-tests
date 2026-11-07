// Matrix (shared contract, from the `Decision: matrix` discussion).
// Project name: <skin>-<device>-<anon|user>, e.g. vector-2022-mobile-user.
'use strict';
const { devices } = require( '@playwright/test' );

const SKINS = [ 'vector-2022', 'vector', 'monobook', 'timeless', 'modern', 'cologneblue', 'minerva' ];

const DEVICES = {
	desktop: { viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false },
	tablet: { ...devices[ 'iPad Pro 11' ], viewport: { width: 820, height: 1180 } },
	mobile: { ...devices[ 'iPhone 14' ], viewport: { width: 390, height: 844 } }
};
// Playwright device presets name a browser; we always use installed Chrome.
for ( const d of Object.values( DEVICES ) ) {
	delete d.defaultBrowserType;
}

const USERS = [ 'anon', 'user' ];

function devicesFor( skin ) {
	return skin === 'minerva' ? [ 'tablet', 'mobile' ] : [ 'desktop', 'tablet', 'mobile' ];
}

// Comma-separated filters: ULS_SKIN=vector,timeless ULS_DEVICE=mobile ULS_USER=anon
function listFilter( name ) {
	const v = process.env[ name ];
	return v ? v.split( ',' ).map( ( s ) => s.trim() ).filter( Boolean ) : null;
}

function rows() {
	const fSkin = listFilter( 'ULS_SKIN' );
	const fDevice = listFilter( 'ULS_DEVICE' );
	const fUser = listFilter( 'ULS_USER' );
	const out = [];
	for ( const skin of SKINS ) {
		if ( fSkin && !fSkin.includes( skin ) ) {
			continue;
		}
		for ( const device of devicesFor( skin ) ) {
			if ( fDevice && !fDevice.includes( device ) ) {
				continue;
			}
			for ( const user of USERS ) {
				if ( fUser && !fUser.includes( user ) ) {
					continue;
				}
				out.push( { name: `${ skin }-${ device }-${ user }`, skin, device, user } );
			}
		}
	}
	return out;
}

module.exports = { SKINS, DEVICES, USERS, devicesFor, rows };
