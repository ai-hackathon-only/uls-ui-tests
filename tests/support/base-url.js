// Safe base URL check (shared contract). Refuses :8080 always, and any host
// that is not *.localhost or 127.0.0.1 unless ULS_ALLOW_REMOTE=1.
'use strict';

function checkBaseUrl( raw ) {
	if ( !raw ) {
		throw new Error( 'ULS_WIKI is not set. Example: ULS_WIKI=http://en.mediawiki-agents.mwdd.localhost:8081' );
	}
	let url;
	try {
		url = new URL( raw );
	} catch ( e ) {
		throw new Error( `ULS_WIKI is not a valid URL: ${ raw }` );
	}
	if ( url.port === '8080' ) {
		throw new Error( `Refusing ULS_WIKI on port 8080: ${ raw }` );
	}
	const local = url.hostname === '127.0.0.1' || url.hostname === 'localhost' ||
		url.hostname.endsWith( '.localhost' );
	if ( !local && process.env.ULS_ALLOW_REMOTE !== '1' ) {
		throw new Error( `Refusing non-local ULS_WIKI ${ url.hostname } (set ULS_ALLOW_REMOTE=1 to allow)` );
	}
	return url.origin;
}

module.exports = { checkBaseUrl };
