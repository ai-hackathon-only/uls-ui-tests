// Read-only Gerrit REST API helper for `npm run compare -- --gerrit <change> <before> <after>`.
// Fetches https://gerrit.wikimedia.org/r/changes/<change>?o=ALL_REVISIONS&o=ALL_COMMITS
// (or reads ULS_GERRIT_FIXTURE / a local JSON fixture file), strips Gerrit's `)]}'` prefix,
// and finds the patch set whose commit SHA matches the `after` run's ULS commit.
'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const { execFileSync } = require( 'child_process' );

const DEFAULT_GERRIT_BASE = 'https://gerrit.wikimedia.org/r';

function normalizeGerritChangeId( raw ) {
	const str = String( raw || '' ).trim();
	if ( !str ) {
		throw new Error( 'Missing Gerrit change identifier after --gerrit' );
	}
	// Extract change number from full Gerrit URLs like:
	// https://gerrit.wikimedia.org/r/c/mediawiki/extensions/UniversalLanguageSelector/+/1124851/3
	// or https://gerrit.wikimedia.org/r/1124851
	const plusMatch = str.match( /\/\+\/(\d+)(?:\/\d+)?(?:[/?#]|$)/ );
	if ( plusMatch ) {
		return plusMatch[ 1 ];
	}
	const shortUrlMatch = str.match( /^https?:\/\/[^/]+\/r\/(\d+)(?:\/\d+)?(?:[/?#]|$)/ );
	if ( shortUrlMatch ) {
		return shortUrlMatch[ 1 ];
	}
	return str;
}

function parseGerritResponse( rawText ) {
	if ( typeof rawText !== 'string' || !rawText.trim() ) {
		throw new Error( 'Empty response from Gerrit REST API' );
	}
	// Gerrit REST API prepends `)]}'` on the first line to prevent XSSI.
	const cleaned = rawText.replace( /^\)\]\}'\r?\n?/, '' ).trim();
	let parsed;
	try {
		parsed = JSON.parse( cleaned );
	} catch ( err ) {
		throw new Error( `Failed to parse Gerrit JSON response: ${ err.message }` );
	}
	const changeObj = Array.isArray( parsed ) ? parsed[ 0 ] : parsed;
	if ( !changeObj || typeof changeObj !== 'object' ) {
		throw new Error( 'Gerrit response did not contain a change object' );
	}
	return changeObj;
}

function commitsMatch( revisionSha, runCommit ) {
	if ( !revisionSha || !runCommit ) {
		return false;
	}
	const rev = String( revisionSha ).trim().toLowerCase();
	const run = String( runCommit ).trim().toLowerCase();
	if ( !rev || !run || run === 'unknown' ) {
		return false;
	}
	return rev === run || rev.startsWith( run ) || ( run.length >= 7 && run.startsWith( rev ) );
}

function matchGerritRevision( changeObj, ulsCommit ) {
	const revisions = ( changeObj && changeObj.revisions ) || {};
	for ( const [ sha, info ] of Object.entries( revisions ) ) {
		if ( commitsMatch( sha, ulsCommit ) ) {
			return {
				sha,
				patchSet: info && info._number != null ? info._number : null,
				created: ( info && info.created ) || null,
				subject: ( info && info.commit && info.commit.subject ) || changeObj.subject || ''
			};
		}
	}
	return null;
}

function buildGerritInfo( changeObj, afterUlsCommit, beforeUlsCommit, query ) {
	const baseUrl = ( process.env.ULS_GERRIT_BASE || DEFAULT_GERRIT_BASE ).replace( /\/+$/, '' );
	const revisionsObj = ( changeObj && changeObj.revisions ) || {};
	const revisionEntries = Object.entries( revisionsObj )
		.map( ( [ sha, info ] ) => ( {
			sha,
			patchSet: info && info._number != null ? Number( info._number ) : 0,
			subject: ( info && info.commit && info.commit.subject ) || changeObj.subject || ''
		} ) )
		.sort( ( a, b ) => a.patchSet - b.patchSet );

	const afterMatch = matchGerritRevision( changeObj, afterUlsCommit );
	const beforeMatch = matchGerritRevision( changeObj, beforeUlsCommit );

	const number = changeObj._number != null ? changeObj._number : null;
	const changeId = changeObj.change_id || null;
	const project = changeObj.project || 'mediawiki/extensions/UniversalLanguageSelector';
	const branch = changeObj.branch || 'master';
	const subject = ( afterMatch && afterMatch.subject ) || changeObj.subject || '';
	const status = changeObj.status || null;

	const changeUrl = number != null ?
		`${ baseUrl }/c/${ project }/+/${ number }` :
		`${ baseUrl }/q/${ encodeURIComponent( changeId || query || '' ) }`;
	const url = ( afterMatch && afterMatch.patchSet != null && number != null ) ?
		`${ changeUrl }/${ afterMatch.patchSet }` :
		changeUrl;

	return {
		query: String( query || number || changeId || '' ),
		number,
		changeId,
		project,
		branch,
		subject,
		status,
		changeUrl,
		url,
		afterCommit: afterUlsCommit || null,
		beforeCommit: beforeUlsCommit || null,
		matched: Boolean( afterMatch ),
		patchSet: afterMatch ? afterMatch.patchSet : null,
		matchedRevisionSha: afterMatch ? afterMatch.sha : null,
		beforePatchSet: beforeMatch ? beforeMatch.patchSet : null,
		beforeRevisionSha: beforeMatch ? beforeMatch.sha : null,
		totalPatchSets: revisionEntries.length,
		latestPatchSet: revisionEntries.length ? revisionEntries[ revisionEntries.length - 1 ].patchSet : null
	};
}

function fetchUrlSync( url ) {
	const script = `
		const https = require('https');
		const http = require('http');
		function get(u, redirects) {
			if (redirects > 5) { process.stderr.write('Too many redirects'); process.exit(1); }
			const mod = u.startsWith('https:') ? https : http;
			const req = mod.get(u, {
				headers: { 'Accept': 'application/json', 'User-Agent': 'uls-ui-tests-compare/1.0' },
				timeout: 15000
			}, (res) => {
				if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
					const next = new URL(res.headers.location, u).toString();
					res.resume();
					return get(next, redirects + 1);
				}
				let body = '';
				res.setEncoding('utf8');
				res.on('data', (c) => { body += c; });
				res.on('end', () => {
					if (res.statusCode < 200 || res.statusCode >= 300) {
						process.stderr.write('HTTP ' + res.statusCode + ' from ' + u);
						process.exit(1);
					}
					process.stdout.write(body);
				});
			});
			req.on('timeout', () => { req.destroy(new Error('Request timed out')); });
			req.on('error', (err) => { process.stderr.write(err.message); process.exit(1); });
		}
		get(process.argv[1], 0);
	`;
	try {
		return execFileSync( process.execPath, [ '-e', script, url ], {
			encoding: 'utf8',
			stdio: [ 'ignore', 'pipe', 'pipe' ]
		} );
	} catch ( err ) {
		const stderr = ( err.stderr && String( err.stderr ).trim() ) || err.message;
		throw new Error( `Failed to read Gerrit REST API (${ url }): ${ stderr }` );
	}
}

function loadGerritChange( changeArg ) {
	const fixturePath = process.env.ULS_GERRIT_FIXTURE;
	if ( fixturePath ) {
		const resolved = path.resolve( fixturePath );
		if ( !fs.existsSync( resolved ) ) {
			throw new Error( `ULS_GERRIT_FIXTURE file not found: ${ fixturePath }` );
		}
		return parseGerritResponse( fs.readFileSync( resolved, 'utf8' ) );
	}
	if ( fs.existsSync( changeArg ) && fs.statSync( changeArg ).isFile() ) {
		return parseGerritResponse( fs.readFileSync( path.resolve( changeArg ), 'utf8' ) );
	}
	const changeId = normalizeGerritChangeId( changeArg );
	const baseUrl = ( process.env.ULS_GERRIT_BASE || DEFAULT_GERRIT_BASE ).replace( /\/+$/, '' );
	const apiUrl = `${ baseUrl }/changes/${ encodeURIComponent( changeId ) }?o=ALL_REVISIONS&o=ALL_COMMITS`;
	const raw = fetchUrlSync( apiUrl );
	return parseGerritResponse( raw );
}

function resolveGerritForCompare( changeArg, beforeRun, afterRun ) {
	const changeObj = loadGerritChange( changeArg );
	const afterUls = ( afterRun && afterRun.ulsCommit ) || null;
	const beforeUls = ( beforeRun && beforeRun.ulsCommit ) || null;
	return buildGerritInfo( changeObj, afterUls, beforeUls, changeArg );
}

function formatGerritSummaryLine( gerrit ) {
	if ( !gerrit ) {
		return null;
	}
	const label = gerrit.number != null ? `change ${ gerrit.number }` : `change ${ gerrit.changeId || gerrit.query }`;
	const shortAfter = gerrit.afterCommit ? String( gerrit.afterCommit ).slice( 0, 7 ) : 'unknown';
	if ( gerrit.matched ) {
		const beforeNote = gerrit.beforePatchSet != null ?
			` (before run matches patch set ${ gerrit.beforePatchSet })` :
			'';
		return `Gerrit ${ label }, patch set ${ gerrit.patchSet } ("${ gerrit.subject }", ${ gerrit.url }) matches after ULS commit ${ shortAfter }${ beforeNote }`;
	}
	return `Gerrit ${ label } ("${ gerrit.subject }", ${ gerrit.url }): no patch set matches after ULS commit ${ shortAfter } (checked ${ gerrit.totalPatchSets } patch set(s))`;
}

module.exports = {
	normalizeGerritChangeId,
	parseGerritResponse,
	commitsMatch,
	matchGerritRevision,
	buildGerritInfo,
	loadGerritChange,
	resolveGerritForCompare,
	formatGerritSummaryLine
};
