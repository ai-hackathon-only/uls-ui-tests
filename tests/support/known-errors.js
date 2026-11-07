// Known console errors / failed requests. Each entry names its KNOWN-ISSUES.md
// heading. Add entries only with a KNOWN-ISSUES.md entry (no silent allow-list).
'use strict';

const KNOWN = [
	// Not ULS: the wiki has no favicon, Chrome logs the 404 (KNOWN-ISSUES.md#ki-0).
	{ issue: 'KI-0', kind: 'console', match: /status of 404 .*\[[^\]]*\/favicon\.ico\]$/ },
];

function isKnownError( e ) {
	return KNOWN.some( ( k ) => ( !k.kind || k.kind === e.kind ) && k.match.test( e.text ) );
}

module.exports = { KNOWN, isKnownError };
