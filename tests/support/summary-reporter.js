// Summary reporter: pass/fail table (rows: skin-device-user, columns: feature
// groups from the '@<group>' tag), COVERAGE.md and report/index.html.
//
// Cell values: 'pass' (all passed), 'FAIL' (an unexpected result), 'xfail'
// (expected failure, a KNOWN-ISSUES.md entry), 'n/a' (skipped with a reason
// that starts with 'n/a:'), 'skip' (skipped for another reason), '' (not run).
// Counts are shown as e.g. 'pass 3/3'.
//
// Spec conventions this relies on:
//   test.skip( cond, 'n/a: Minerva has no cog in the selector' )
//   test.fail( cond, 'KI-2: …' )   // known ULS bug, see KNOWN-ISSUES.md
'use strict';
const fs = require( 'fs' );
const path = require( 'path' );
const { rows } = require( './matrix' );

const ROOT = path.join( __dirname, '..', '..' );

function groupOf( test ) {
	const tag = ( test.tags || [] ).find( ( t ) => t.startsWith( '@' ) );
	if ( tag ) {
		return tag.slice( 1 );
	}
	const m = test.title.match( /@([\w-]+)/ );
	return m ? m[ 1 ] : 'other';
}

function outcomeOf( test, result ) {
	const notes = test.annotations || [];
	if ( result.status === 'skipped' ) {
		const reason = ( notes.find( ( a ) => a.type === 'skip' ) || {} ).description || '';
		return /^n\/a\b/i.test( reason ) ? { kind: 'n/a', reason: reason.replace( /^n\/a:?\s*/i, '' ) } : { kind: 'skip', reason };
	}
	const ok = result.status === test.expectedStatus;
	if ( ok && test.expectedStatus === 'failed' ) {
		const reason = ( notes.find( ( a ) => a.type === 'fail' ) || {} ).description || '';
		return { kind: 'xfail', reason };
	}
	if ( ok ) {
		return { kind: 'pass' };
	}
	// Expected to fail but passed: the known issue may be fixed; that is unexpected too.
	return { kind: 'FAIL', reason: ( result.error && result.error.message || '' ).split( '\n' )[ 0 ] };
}

const RANK = { FAIL: 4, xfail: 3, pass: 2, 'n/a': 1, skip: 0 };

function cellText( c ) {
	if ( !c ) {
		return '';
	}
	const total = c.n.pass + c.n.FAIL + c.n.xfail;
	if ( c.kind === 'n/a' || c.kind === 'skip' ) {
		return c.kind;
	}
	const na = c.n[ 'n/a' ] ? ` +${ c.n[ 'n/a' ] } n/a` : '';
	if ( c.kind === 'FAIL' ) {
		return `FAIL ${ c.n.FAIL }/${ total }${ na }`;
	}
	if ( c.kind === 'xfail' ) {
		return `xfail ${ c.n.xfail }/${ total }${ na }`;
	}
	return `pass ${ c.n.pass }/${ total }${ na }`;
}

function esc( s ) {
	return String( s ).replace( /[&<>"]/g, ( ch ) => ( { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ ch ] ) );
}

class SummaryReporter {
	onBegin( config ) {
		this.start = Date.now();
		this.config = config;
		this.cells = new Map(); // project -> Map(group -> cell)
		this.groups = new Set();
		this.notes = []; // { project, group, title, kind, reason }
	}

	onTestEnd( test, result ) {
		const project = test.parent.project().name;
		const group = groupOf( test );
		const o = outcomeOf( test, result );
		this.groups.add( group );
		if ( !this.cells.has( project ) ) {
			this.cells.set( project, new Map() );
		}
		const row = this.cells.get( project );
		const c = row.get( group ) || { kind: 'skip', n: { pass: 0, FAIL: 0, xfail: 0, 'n/a': 0, skip: 0 } };
		c.n[ o.kind ]++;
		if ( RANK[ o.kind ] > RANK[ c.kind ] ) {
			c.kind = o.kind;
		}
		row.set( group, c );
		if ( o.kind !== 'pass' ) {
			this.notes.push( { project, group, title: test.title, kind: o.kind, reason: o.reason || '' } );
		}
	}

	table() {
		const groups = [ ...this.groups ].sort( ( a, b ) => ( a === 'smoke' ? -1 : b === 'smoke' ? 1 : a.localeCompare( b ) ) );
		const order = rows().map( ( r ) => r.name );
		const projects = [ ...this.cells.keys() ].sort( ( a, b ) => order.indexOf( a ) - order.indexOf( b ) );
		return { groups, projects, cell: ( p, g ) => cellText( this.cells.get( p ).get( g ) ) };
	}

	runInfo() {
		try {
			return JSON.parse( fs.readFileSync( path.join( ROOT, 'test-results', 'run-info.json' ), 'utf8' ) );
		} catch ( e ) {
			return null;
		}
	}

	onEnd( result ) {
		const secs = Math.round( ( Date.now() - this.start ) / 1000 );
		const { groups, projects, cell } = this.table();
		const info = this.runInfo();
		const head = info ?
			`Wiki ${ info.wiki } | MediaWiki ${ info.coreVersion } (core ${ info.coreCommit }) | ULS ${ info.ulsCommit } (${ info.ulsCommitDate }) | skins: ${ info.skins.join( ', ' ) }` :
			'Run info missing (global setup did not finish)';
		const count = ( k ) => this.notes.filter( ( n ) => n.kind === k ).length;
		const failed = count( 'FAIL' );
		const status = `${ result.status.toUpperCase() } in ${ secs } s: ${ failed } unexpected failure(s), ${ count( 'xfail' ) } known issue(s), ${ count( 'n/a' ) } n/a`;

		// Console table.
		const w0 = Math.max( 4, ...projects.map( ( p ) => p.length ) );
		const ws = groups.map( ( g ) => Math.max( g.length, ...projects.map( ( p ) => cell( p, g ).length ) ) );
		const line = ( first, cols ) => [ first.padEnd( w0 ), ...cols.map( ( c, i ) => c.padEnd( ws[ i ] ) ) ].join( ' | ' );
		const out = [ '', head, line( 'row', groups ), line( '-'.repeat( w0 ), ws.map( ( w ) => '-'.repeat( w ) ) ) ];
		for ( const p of projects ) {
			out.push( line( p, groups.map( ( g ) => cell( p, g ) ) ) );
		}
		out.push( '', status );
		for ( const n of this.notes.filter( ( x ) => x.kind === 'FAIL' ) ) {
			out.push( `  FAIL ${ n.project } › ${ n.title }: ${ n.reason }` );
		}
		console.log( out.join( '\n' ) );

		// COVERAGE.md (generated; do not edit by hand).
		const md = [
			'# Coverage',
			'',
			'Generated by `npm test` (tests/support/summary-reporter.js). Do not edit by hand.',
			'',
			`${ head }`,
			'',
			`Run ${ info ? info.date : new Date().toISOString() }: ${ status }.`,
			'',
			`| row | ${ groups.join( ' | ' ) } |`,
			`|---|${ groups.map( () => '---' ).join( '|' ) }|`,
			...projects.map( ( p ) => `| ${ p } | ${ groups.map( ( g ) => cell( p, g ) ).join( ' | ' ) } |` ),
			'',
			'Cells: `pass k/n` all passed; `FAIL` unexpected failure; `xfail` known issue (KNOWN-ISSUES.md); `n/a` the skin or row does not offer the feature; empty: not run.',
			''
		];
		const why = this.notes.filter( ( n ) => n.kind !== 'FAIL' );
		if ( why.length ) {
			const seen = new Set();
			md.push( '## n/a, known issues and skips', '' );
			for ( const n of why ) {
				const key = `${ n.kind }|${ n.group }|${ n.reason }|${ n.project.replace( /-(anon|user)$/, '' ) }`;
				if ( !seen.has( key ) ) {
					seen.add( key );
					md.push( `- ${ n.kind } · ${ n.project } · @${ n.group }: ${ n.reason || '(no reason given)' }` );
				}
			}
			md.push( '' );
		}
		// Only a run of the full matrix rewrites the committed COVERAGE.md.
		const subset = [ 'ULS_SKIN', 'ULS_DEVICE', 'ULS_USER' ].some( ( k ) => process.env[ k ] ) || process.argv.some( ( a ) => /^(--grep|-g|--project)/.test( a ) );
		const mdFile = path.join( ROOT, subset ? 'test-results/COVERAGE.md' : 'COVERAGE.md' );
		fs.mkdirSync( path.dirname( mdFile ), { recursive: true } );
		fs.writeFileSync( mdFile, md.join( '\n' ) );

		// report/index.html: run info + table, links to the Playwright report.
		const cls = ( t ) => t.split( ' ' )[ 0 ].replace( '/', '' );
		const html = `<!doctype html><meta charset="utf-8"><title>ULS UI tests</title>
<style>body{font:14px system-ui;margin:1.5em}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:3px 8px;white-space:nowrap}
.pass{background:#d5f5d5}.FAIL{background:#f9c0c0;font-weight:bold}.xfail{background:#fbe7b5}.na{background:#eee;color:#666}</style>
<h1>ULS UI tests</h1><p>${ esc( head ) }</p><p><b>${ esc( status ) }</b></p>
<p><a href="../playwright-report/index.html">Playwright report</a> (traces, screenshots) · COVERAGE.md</p>
<table><tr><th>row</th>${ groups.map( ( g ) => `<th>${ esc( g ) }</th>` ).join( '' ) }</tr>
${ projects.map( ( p ) => `<tr><th>${ esc( p ) }</th>${ groups.map( ( g ) => { const t = cell( p, g ); return `<td class="${ cls( t ) }">${ esc( t ) }</td>`; } ).join( '' ) }</tr>` ).join( '\n' ) }
</table><ul>${ this.notes.map( ( n ) => `<li>${ esc( `${ n.kind } · ${ n.project } › ${ n.title }: ${ n.reason }` ) }</li>` ).join( '' ) }</ul>`;
		fs.mkdirSync( path.join( ROOT, 'report' ), { recursive: true } );
		fs.writeFileSync( path.join( ROOT, 'report', 'index.html' ), html );
		console.log( `Report: report/index.html (summary), playwright-report/index.html (details), ${ path.relative( ROOT, mdFile ) }` );
	}
}

module.exports = SummaryReporter;
