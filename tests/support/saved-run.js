// Saved runs (shared contract, round 3). With ULS_RUN=<name> the summary
// reporter writes runs/<name>/:
//   results.json   { format: 1, run, tests, coverage } (fields below)
//   COVERAGE.md    the coverage table of this run
//   shots/<row>.png  one screenshot of the open selector per row (ULS_SHOTS=1)
//
// run:      name, wiki, ulsCommit, ulsCommitDate, coreCommit, coreVersion,
//           suiteCommit, suiteDirty, skins, cookies (string|null),
//           filters { skin, device, user, args }, shots (bool),
//           start (ISO), seconds, status
// tests[]:  id ('<row> › <file> › <title>'), row, skin, device, user, group,
//           file, title, outcome ('pass'|'FAIL'|'xfail'|'n/a'|'skip'),
//           recovered (passed only after a re-login or retry), reason, error
//           (first error line or null)
// coverage: { groups: [...], rows: { '<row>': { '<group>': 'pass 3/3' } } }
// Compare matches tests by id. Change this format only by a DECISION:.
'use strict';
const fs = require( 'fs' );
const path = require( 'path' );
const { execFileSync } = require( 'child_process' );

const ROOT = path.join( __dirname, '..', '..' );
const FORMAT = 1;

function runName() {
	const n = ( process.env.ULS_RUN || '' ).trim();
	if ( !n ) {
		return null;
	}
	if ( !/^[A-Za-z0-9._-]+$/.test( n ) || n.startsWith( '.' ) ) {
		throw new Error( `ULS_RUN="${ n }": use letters, digits, '.', '_' or '-'` );
	}
	return n;
}

function runDir( name ) {
	return path.join( ROOT, 'runs', name );
}

function git( args ) {
	try {
		return execFileSync( 'git', args, { cwd: ROOT, encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'ignore' ] } ).trim();
	} catch ( e ) {
		return null;
	}
}

function suiteState() {
	const commit = git( [ 'rev-parse', 'HEAD' ] );
	const status = git( [ 'status', '--porcelain', '--untracked-files=no' ] );
	return { suiteCommit: commit, suiteDirty: status === null ? null : status !== '' };
}

function filters() {
	const v = ( k ) => process.env[ k ] || null;
	const args = process.argv.slice( 2 ).filter( ( a ) => a !== 'test' );
	return { skin: v( 'ULS_SKIN' ), device: v( 'ULS_DEVICE' ), user: v( 'ULS_USER' ), args };
}

function writeSavedRun( name, data ) {
	const dir = runDir( name );
	fs.mkdirSync( dir, { recursive: true } );
	fs.writeFileSync( path.join( dir, 'results.json' ), JSON.stringify( { format: FORMAT, ...data }, null, 1 ) );
	return dir;
}

module.exports = { FORMAT, runName, runDir, suiteState, filters, writeSavedRun };
