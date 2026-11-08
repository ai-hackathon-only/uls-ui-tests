// ULS_COOKIES='qa_t439715=old;qa_t439718=old' sets these cookies on the wiki
// host for every browser context the suite opens (test pages, logins, the
// preference reset). The run info records the string.
'use strict';

function cookieString() {
	return ( process.env.ULS_COOKIES || '' ).trim() || null;
}

// Playwright cookie objects for the wiki URL. Throws on a malformed pair.
function qaCookies( wiki ) {
	const s = cookieString();
	if ( !s ) {
		return [];
	}
	return s.split( ';' ).map( ( p ) => p.trim() ).filter( Boolean ).map( ( pair ) => {
		const m = pair.match( /^([A-Za-z0-9_-]+)=([^;\s]*)$/ );
		if ( !m ) {
			throw new Error( `ULS_COOKIES: cannot read "${ pair }"; use name=value;name=value` );
		}
		return { name: m[ 1 ], value: m[ 2 ], url: wiki };
	} );
}

module.exports = { cookieString, qaCookies };
