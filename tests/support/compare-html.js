// Renders compare/<before>-vs-<after>/index.html from a compare diff object
// (or raw before/after results.json objects). Shows run metadata, warnings,
// category counts, changed rows/tests, and side-by-side before/after screenshots
// when runs/<name>/shots/<row>.png exists.
'use strict';
const fs = require( 'fs' );
const path = require( 'path' );

const ROOT = path.join( __dirname, '..', '..' );

function esc( s ) {
	return String( s == null ? '' : s ).replace( /[&<>"]/g, ( ch ) => ( {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;'
	}[ ch ] ) );
}

function shortSha( sha ) {
	return sha ? String( sha ).slice( 0, 7 ) : 'unknown';
}

function extractKi( text ) {
	if ( !text ) {
		return null;
	}
	const m = String( text ).match( /\b(KI-\d+)\b/i );
	return m ? m[ 1 ].toUpperCase() : null;
}

function runsRootDir( opts = {}, d = {} ) {
	const custom = d.runsDir || opts.runsDir || process.env.ULS_RUNS_DIR;
	if ( custom ) {
		return path.resolve( ROOT, custom );
	}
	return path.join( ROOT, 'runs' );
}

function loadRunIfNeeded( ref, dirHint, baseRunsDir ) {
	if ( !ref ) {
		return null;
	}
	if ( typeof ref === 'object' && ( ref.run || ref.tests ) ) {
		return ref;
	}
	if ( typeof ref === 'string' ) {
		const runsBase = baseRunsDir || runsRootDir();
		const candidates = [
			ref,
			path.join( ref, 'results.json' ),
			path.join( runsBase, ref, 'results.json' ),
			path.join( ROOT, 'runs', ref, 'results.json' )
		];
		if ( dirHint ) {
			candidates.unshift( path.join( dirHint, 'results.json' ) );
		}
		for ( const p of candidates ) {
			try {
				if ( fs.existsSync( p ) && fs.statSync( p ).isFile() ) {
					return JSON.parse( fs.readFileSync( p, 'utf8' ) );
				}
			} catch ( e ) {
				// ignore
			}
		}
	}
	return typeof ref === 'object' ? ref : null;
}

function normalizeItem( item ) {
	if ( !item || typeof item !== 'object' ) {
		return {};
	}
	const bObj = ( item.before && typeof item.before === 'object' ) ? item.before : ( item.beforeTest || null );
	const aObj = ( item.after && typeof item.after === 'object' ) ? item.after : ( item.afterTest || item.test || null );
	const row = item.row || item.project || ( aObj && aObj.row ) || ( bObj && bObj.row ) || '';
	const group = item.group || ( aObj && aObj.group ) || ( bObj && bObj.group ) || '';
	const title = item.title || ( aObj && aObj.title ) || ( bObj && bObj.title ) || item.id || '';
	const id = item.id || ( aObj && aObj.id ) || ( bObj && bObj.id ) || '';
	const beforeOutcome = item.beforeOutcome ||
		( typeof item.before === 'string' ? item.before : null ) ||
		( bObj && bObj.outcome ) || '';
	const afterOutcome = item.afterOutcome ||
		( typeof item.after === 'string' ? item.after : null ) ||
		( aObj && aObj.outcome ) ||
		item.outcome || '';
	const beforeReason = item.beforeReason || ( bObj && bObj.reason ) || null;
	const afterReason = item.afterReason || ( aObj && aObj.reason ) || item.reason || null;
	const beforeError = item.beforeError || ( bObj && bObj.error ) || null;
	const error = item.error || item.afterError || ( aObj && aObj.error ) || afterReason || beforeError || beforeReason || null;
	const reason = item.reason || afterReason || beforeReason || error || null;
	const ki = item.ki || extractKi( item.ki ) || extractKi( beforeReason ) || extractKi( afterReason ) || extractKi( reason ) || null;
	const side = item.side || item.run || ( aObj && !bObj ? 'after' : 'before' );
	return {
		...item,
		id,
		row,
		group,
		title,
		beforeOutcome,
		afterOutcome,
		beforeReason,
		afterReason,
		beforeError,
		error,
		reason,
		ki,
		side
	};
}

function filtersEqual( a, b ) {
	const fa = a || {};
	const fb = b || {};
	return ( fa.skin || null ) === ( fb.skin || null ) &&
		( fa.device || null ) === ( fb.device || null ) &&
		( fa.user || null ) === ( fb.user || null ) &&
		JSON.stringify( fa.args || [] ) === JSON.stringify( fb.args || [] );
}

function computeFromRuns( beforeData, afterData ) {
	const bRun = ( beforeData && beforeData.run ) || {};
	const aRun = ( afterData && afterData.run ) || {};
	const bTests = ( beforeData && beforeData.tests ) || [];
	const aTests = ( afterData && afterData.tests ) || [];

	const warnings = [];
	if ( bRun.suiteCommit && aRun.suiteCommit && bRun.suiteCommit !== aRun.suiteCommit ) {
		warnings.push( `Suite commits differ (${ shortSha( bRun.suiteCommit ) } vs ${ shortSha( aRun.suiteCommit ) }): differences may reflect a test change, not a ULS code change.` );
	} else if ( bRun.suiteDirty || aRun.suiteDirty ) {
		warnings.push( `Working tree had uncommitted test changes (before dirty: ${ Boolean( bRun.suiteDirty ) }, after dirty: ${ Boolean( aRun.suiteDirty ) }).` );
	}
	const diffFilters = !filtersEqual( bRun.filters, aRun.filters );
	if ( diffFilters ) {
		warnings.push( 'Run filters differ between before and after: rows present in only one run are counted as "not compared", not added or removed.' );
	}
	if (
		bRun.ulsCommit && aRun.ulsCommit && bRun.ulsCommit === aRun.ulsCommit &&
		bRun.coreCommit && aRun.coreCommit && bRun.coreCommit === aRun.coreCommit &&
		( bRun.cookies || null ) === ( aRun.cookies || null )
	) {
		warnings.push( 'No code change between these runs (ULS commit, MediaWiki core commit and QA cookies are identical).' );
	}

	const bRows = new Set( bTests.map( ( t ) => t.row ) );
	const aRows = new Set( aTests.map( ( t ) => t.row ) );
	const bById = new Map( bTests.map( ( t ) => [ t.id, t ] ) );
	const aById = new Map( aTests.map( ( t ) => [ t.id, t ] ) );

	const newFailures = [];
	const fixed = [];
	const kiNowPassing = [];
	const stillFailing = [];
	const added = [];
	const removed = [];
	const notCompared = [];
	const naChanges = [];
	const recovered = [];

	for ( const t of bTests ) {
		if ( t.recovered ) {
			recovered.push( { side: 'before', ...t } );
		}
	}
	for ( const t of aTests ) {
		if ( t.recovered ) {
			recovered.push( { side: 'after', ...t } );
		}
	}

	const allIds = new Set( [ ...bById.keys(), ...aById.keys() ] );
	for ( const id of allIds ) {
		const bt = bById.get( id );
		const at = aById.get( id );
		if ( !bt ) {
			if ( diffFilters && !bRows.has( at.row ) ) {
				notCompared.push( { side: 'after-only', test: at, row: at.row, group: at.group, title: at.title, afterOutcome: at.outcome } );
			} else {
				added.push( { test: at, id, row: at.row, group: at.group, title: at.title, afterOutcome: at.outcome } );
			}
			continue;
		}
		if ( !at ) {
			if ( diffFilters && !aRows.has( bt.row ) ) {
				notCompared.push( { side: 'before-only', test: bt, row: bt.row, group: bt.group, title: bt.title, beforeOutcome: bt.outcome } );
			} else {
				removed.push( { test: bt, id, row: bt.row, group: bt.group, title: bt.title, beforeOutcome: bt.outcome } );
			}
			continue;
		}
		const bo = bt.outcome;
		const ao = at.outcome;
		const unexpectedPass = ao === 'FAIL' && (
			/^unexpected pass\b/i.test( at.reason || '' ) ||
			( bo === 'xfail' && !at.error && !at.reason )
		);
		if ( bo === 'xfail' && ( ao === 'pass' || unexpectedPass ) ) {
			const ki = extractKi( bt.reason ) || extractKi( at.reason ) || bt.reason || 'known issue';
			kiNowPassing.push( {
				id, row: at.row, group: at.group, title: at.title,
				beforeOutcome: bo, afterOutcome: ao, ki,
				beforeReason: bt.reason, afterReason: at.reason
			} );
			continue;
		}
		if ( bo !== 'FAIL' && ao === 'FAIL' ) {
			newFailures.push( {
				id, row: at.row, group: at.group, title: at.title,
				beforeOutcome: bo, afterOutcome: ao,
				error: at.error || at.reason || null,
				beforeReason: bt.reason, afterReason: at.reason
			} );
		} else if ( bo === 'FAIL' && ao === 'pass' ) {
			fixed.push( {
				id, row: at.row, group: at.group, title: at.title,
				beforeOutcome: bo, afterOutcome: ao,
				beforeError: bt.error || bt.reason || null
			} );
		} else if ( ( bo === 'FAIL' && ao === 'FAIL' ) || ( bo === 'xfail' && ao === 'xfail' ) ) {
			stillFailing.push( {
				id, row: at.row, group: at.group, title: at.title,
				beforeOutcome: bo, afterOutcome: ao,
				ki: extractKi( bt.reason ) || extractKi( at.reason ),
				reason: at.error || at.reason || bt.error || bt.reason || null
			} );
		} else if ( bo !== ao && ( bo === 'n/a' || ao === 'n/a' ) ) {
			naChanges.push( {
				id, row: at.row, group: at.group, title: at.title,
				beforeOutcome: bo, afterOutcome: ao,
				reason: at.reason || bt.reason || null
			} );
		} else if ( bo !== ao ) {
			naChanges.push( {
				id, row: at.row, group: at.group, title: at.title,
				beforeOutcome: bo, afterOutcome: ao,
				reason: at.reason || bt.reason || null
			} );
		}
	}

	return {
		beforeRun: bRun,
		afterRun: aRun,
		warnings,
		newFailures,
		fixed,
		kiNowPassing,
		stillFailing,
		added,
		removed,
		notCompared,
		naChanges,
		recovered
	};
}

function normalizeDiff( input, opts = {}, thirdArg ) {
	let d = input || {};
	let o = typeof opts === 'string' ? { outDir: opts } : ( opts || {} );
	if ( d && ( d.run || Array.isArray( d.tests ) ) && opts && typeof opts === 'object' && ( opts.run || Array.isArray( opts.tests ) ) ) {
		d = { before: input, after: opts };
		o = typeof thirdArg === 'string' ? { outDir: thirdArg } : ( thirdArg || {} );
	}
	const runsBase = runsRootDir( o, d );
	const beforeData = loadRunIfNeeded( d.beforeData || d.before || o.before, d.beforeDir || o.beforeDir, runsBase );
	const afterData = loadRunIfNeeded( d.afterData || d.after || o.after, d.afterDir || o.afterDir, runsBase );
	const computed = ( beforeData && afterData && ( beforeData.tests || afterData.tests ) ) ?
		computeFromRuns( beforeData, afterData ) :
		null;

	const beforeRun = d.beforeRun || ( beforeData && beforeData.run ) || ( d.before && d.before.run ) || ( computed && computed.beforeRun ) || {};
	const afterRun = d.afterRun || ( afterData && afterData.run ) || ( d.after && d.after.run ) || ( computed && computed.afterRun ) || {};
	const beforeName = d.beforeName || beforeRun.name || ( typeof d.before === 'string' ? d.before : 'before' );
	const afterName = d.afterName || afterRun.name || ( typeof d.after === 'string' ? d.after : 'after' );

	const cat = d.categories || d;
	const pick = ( keys, fallback ) => {
		for ( const k of keys ) {
			if ( Array.isArray( cat[ k ] ) ) {
				return cat[ k ].map( normalizeItem );
			}
			if ( Array.isArray( d[ k ] ) ) {
				return d[ k ].map( normalizeItem );
			}
		}
		return ( fallback || [] ).map( normalizeItem );
	};

	const warnings = Array.isArray( d.warnings ) ? d.warnings : ( computed ? computed.warnings : [] );
	const newFailures = pick( [ 'newFailures', 'passToFail', 'regressions' ], computed && computed.newFailures );
	const fixed = pick( [ 'fixed', 'fixedRows', 'failToPass', 'fixes' ], computed && computed.fixed );
	const kiNowPassing = pick( [ 'kiNowPassing', 'knownIssuesNowPassing', 'knownIssuesPassing', 'xfailToPass' ], computed && computed.kiNowPassing );
	const stillFailingRaw = pick( [ 'stillFailing', 'stillFailingRows', 'unchangedFailures' ], computed && computed.stillFailing );
	const stillXfailRaw = pick( [ 'stillXfail', 'unchangedXfail' ], null );
	const stillFailing = [ ...stillFailingRaw, ...stillXfailRaw ];
	const added = pick( [ 'added', 'testsAdded' ], computed && computed.added );
	const removed = pick( [ 'removed', 'testsRemoved' ], computed && computed.removed );
	const notCompared = pick( [ 'notCompared', 'uncompared' ], computed && computed.notCompared );
	const naChanges = pick( [ 'naChanges', 'naChanged', 'otherChanges' ], computed && computed.naChanges );
	let recovered = [];
	if ( Array.isArray( cat.recoveredBefore ) || Array.isArray( cat.recoveredAfter ) || Array.isArray( d.recoveredBefore ) || Array.isArray( d.recoveredAfter ) ) {
		recovered = [
			...( cat.recoveredBefore || d.recoveredBefore || [] ).map( ( x ) => normalizeItem( { ...x, side: 'before' } ) ),
			...( cat.recoveredAfter || d.recoveredAfter || [] ).map( ( x ) => normalizeItem( { ...x, side: 'after' } ) )
		];
	} else {
		const recObj = ( cat.recovered && !Array.isArray( cat.recovered ) && typeof cat.recovered === 'object' ) ? cat.recovered :
			( d.recovered && !Array.isArray( d.recovered ) && typeof d.recovered === 'object' ) ? d.recovered : null;
		if ( recObj && ( Array.isArray( recObj.before ) || Array.isArray( recObj.after ) ) ) {
			recovered = [
				...( recObj.before || [] ).map( ( x ) => normalizeItem( { ...x, side: 'before' } ) ),
				...( recObj.after || [] ).map( ( x ) => normalizeItem( { ...x, side: 'after' } ) )
			];
		} else {
			const rawRec = pick( [ 'recovered', 'recoveredRows', 'recoveredTests' ], computed && computed.recovered );
			for ( const r of rawRec ) {
				if ( r.beforeRecovered || r.afterRecovered ) {
					if ( r.beforeRecovered ) {
						recovered.push( { ...r, side: 'before' } );
					}
					if ( r.afterRecovered ) {
						recovered.push( { ...r, side: 'after' } );
					}
				} else {
					recovered.push( r );
				}
			}
		}
	}

	const beforeCov = ( beforeData && beforeData.coverage ) || ( d.before && d.before.coverage ) || d.beforeCoverage || null;
	const afterCov = ( afterData && afterData.coverage ) || ( d.after && d.after.coverage ) || d.afterCoverage || null;

	// Determine changed rows (skin-device-user) across all change categories or coverage cells.
	const changedRowMap = new Map();
	const ensureRow = ( row ) => {
		if ( !row ) {
			return null;
		}
		if ( !changedRowMap.has( row ) ) {
			changedRowMap.set( row, { row, changes: [] } );
		}
		return changedRowMap.get( row );
	};

	const addChange = ( item, label ) => {
		const row = item.row || item.project;
		const r = ensureRow( row );
		if ( !r ) {
			return;
		}
		const group = item.group ? `@${ String( item.group ).replace( /^@/, '' ) }` : '';
		const bOut = item.beforeOutcome || '';
		const aOut = item.afterOutcome || '';
		const ki = item.ki || extractKi( item.beforeReason ) || extractKi( item.afterReason ) || extractKi( item.reason );
		const detail = item.error || item.afterReason || item.reason || item.beforeError || '';
		r.changes.push( {
			category: label,
			group,
			title: item.title || item.id || '',
			beforeOutcome: bOut,
			afterOutcome: aOut,
			ki,
			detail
		} );
	};

	newFailures.forEach( ( x ) => addChange( x, 'new failure' ) );
	fixed.forEach( ( x ) => addChange( x, 'fixed' ) );
	kiNowPassing.forEach( ( x ) => addChange( x, 'KI now passing' ) );
	naChanges.forEach( ( x ) => addChange( x, 'n/a change' ) );
	added.forEach( ( x ) => addChange( x, 'added' ) );
	removed.forEach( ( x ) => addChange( x, 'removed' ) );

	if ( Array.isArray( d.changedRows ) ) {
		for ( const cr of d.changedRows ) {
			if ( typeof cr === 'string' ) {
				ensureRow( cr );
			} else if ( cr && typeof cr === 'object' && cr.row ) {
				const r = ensureRow( cr.row );
				if ( r && !r.changes.length && Array.isArray( cr.changes ) ) {
					r.changes.push( ...cr.changes );
				}
			}
		}
	}

	if ( beforeCov && afterCov && beforeCov.rows && afterCov.rows ) {
		const groups = Array.from( new Set( [ ...( beforeCov.groups || [] ), ...( afterCov.groups || [] ) ] ) );
		const allRows = Array.from( new Set( [ ...Object.keys( beforeCov.rows ), ...Object.keys( afterCov.rows ) ] ) );
		for ( const row of allRows ) {
			const br = beforeCov.rows[ row ];
			const ar = afterCov.rows[ row ];
			if ( !br || !ar ) {
				continue;
			}
			for ( const g of groups ) {
				if ( ( br[ g ] || '' ) !== ( ar[ g ] || '' ) && !changedRowMap.has( row ) ) {
					const r = ensureRow( row );
					r.changes.push( {
						category: 'cell changed',
						group: `@${ g }`,
						title: '',
						beforeOutcome: br[ g ] || '',
						afterOutcome: ar[ g ] || '',
						ki: null,
						detail: ''
					} );
				}
			}
		}
	}

	const beforeDir = d.beforeDir || o.beforeDir || path.join( runsBase, beforeName );
	const afterDir = d.afterDir || o.afterDir || path.join( runsBase, afterName );
	const outDir = o.outDir || d.outDir || path.join( ROOT, 'compare', `${ beforeName }-vs-${ afterName }` );

	const changedRows = Array.from( changedRowMap.values() ).map( ( entry ) => {
		const bShotAbs = path.join( beforeDir, 'shots', `${ entry.row }.png` );
		const aShotAbs = path.join( afterDir, 'shots', `${ entry.row }.png` );
		const bExists = fs.existsSync( bShotAbs );
		const aExists = fs.existsSync( aShotAbs );
		const bRel = path.relative( outDir, bShotAbs ).split( path.sep ).join( '/' );
		const aRel = path.relative( outDir, aShotAbs ).split( path.sep ).join( '/' );
		return {
			...entry,
			beforeShot: bExists ? bRel : null,
			afterShot: aExists ? aRel : null,
			expectedBeforeShot: bRel,
			expectedAfterShot: aRel
		};
	} );

	return {
		beforeName,
		afterName,
		beforeRun,
		afterRun,
		beforeDir,
		afterDir,
		outDir,
		warnings,
		newFailures,
		fixed,
		kiNowPassing,
		stillFailing,
		added,
		removed,
		notCompared,
		naChanges,
		recovered,
		changedRows
	};
}

function renderRunMeta( label, name, run ) {
	const uls = run.ulsCommit ? `${ shortSha( run.ulsCommit ) }${ run.ulsCommitDate ? ` (${ run.ulsCommitDate })` : '' }` : 'n/a';
	const core = run.coreCommit ? `${ shortSha( run.coreCommit ) }${ run.coreVersion ? ` (${ run.coreVersion })` : '' }` : 'n/a';
	const suite = run.suiteCommit ? `${ shortSha( run.suiteCommit ) }${ run.suiteDirty ? ' (dirty)' : '' }` : 'n/a';
	const cookies = run.cookies ? run.cookies : 'none';
	const f = run.filters || {};
	const filterParts = [
		f.skin ? `skin=${ f.skin }` : null,
		f.device ? `device=${ f.device }` : null,
		f.user ? `user=${ f.user }` : null,
		f.args && f.args.length ? `args=${ f.args.join( ' ' ) }` : null
	].filter( Boolean );
	const filters = filterParts.length ? filterParts.join( ', ' ) : 'full matrix';
	const time = run.seconds != null ? `${ run.seconds } s` : 'n/a';
	return `<tr>
		<th>${ esc( label ) } (<code>${ esc( name ) }</code>)</th>
		<td><code>${ esc( uls ) }</code></td>
		<td><code>${ esc( core ) }</code></td>
		<td><code>${ esc( suite ) }</code></td>
		<td><code>${ esc( cookies ) }</code></td>
		<td>${ esc( filters ) }</td>
		<td>${ esc( time ) }</td>
	</tr>`;
}

function renderTestTable( items, columns ) {
	if ( !items.length ) {
		return '<p class="none">None.</p>';
	}
	const head = columns.map( ( c ) => `<th>${ esc( c.label ) }</th>` ).join( '' );
	const body = items.map( ( item ) => {
		const cells = columns.map( ( c ) => `<td>${ c.render( item ) }</td>` ).join( '' );
		return `<tr>${ cells }</tr>`;
	} ).join( '\n' );
	return `<table><thead><tr>${ head }</tr></thead><tbody>\n${ body }\n</tbody></table>`;
}

function renderHtml( input, opts = {}, thirdArg ) {
	const n = normalizeDiff( input, opts, thirdArg );

	const warnHtml = n.warnings.length ?
		`<div class="warnings"><strong>Warnings:</strong><ul>${ n.warnings.map( ( w ) => `<li>${ esc( w ) }</li>` ).join( '' ) }</ul></div>` :
		'';

	const statusBanner = n.newFailures.length > 0 ?
		`<div class="banner fail">RESULT: ${ n.newFailures.length } new failure(s) found (exit code 1)</div>` :
		`<div class="banner pass">RESULT: 0 new failures (exit code 0)</div>`;

	const shotsSection = n.changedRows.length ? n.changedRows.map( ( r ) => {
		const summaryBadges = r.changes.map( ( c ) => {
			const tag = c.ki ? `${ c.category } (${ c.ki })` : c.category;
			return `<span class="badge">${ esc( `${ c.group } ${ tag }: ${ c.beforeOutcome } → ${ c.afterOutcome }` ) }</span>`;
		} ).join( ' ' );
		const bImg = r.beforeShot ?
			`<a href="${ esc( r.beforeShot ) }"><img src="${ esc( r.beforeShot ) }" alt="Before ${ esc( r.row ) }" loading="lazy"></a>` :
			`<div class="no-shot">No before screenshot (<code>${ esc( r.expectedBeforeShot ) }</code>)</div>`;
		const aImg = r.afterShot ?
			`<a href="${ esc( r.afterShot ) }"><img src="${ esc( r.afterShot ) }" alt="After ${ esc( r.row ) }" loading="lazy"></a>` :
			`<div class="no-shot">No after screenshot (<code>${ esc( r.expectedAfterShot ) }</code>)</div>`;
		return `<div class="shot-card">
			<h3><code>${ esc( r.row ) }</code></h3>
			<div class="badges">${ summaryBadges }</div>
			<div class="shot-pair">
				<div class="shot-col"><h4>Before (<code>${ esc( n.beforeName ) }</code>)</h4>${ bImg }</div>
				<div class="shot-col"><h4>After (<code>${ esc( n.afterName ) }</code>)</h4>${ aImg }</div>
			</div>
		</div>`;
	} ).join( '\n' ) : '<p class="none">No rows changed between these runs.</p>';

	const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>ULS Compare: ${ esc( n.beforeName ) } vs ${ esc( n.afterName ) }</title>
<style>
body { font: 14px/1.45 system-ui, -apple-system, sans-serif; margin: 1.5em 2em; color: #111; }
h1, h2, h3, h4 { margin: 0.8em 0 0.4em; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; background: #f4f4f4; padding: 1px 4px; border-radius: 3px; }
table { border-collapse: collapse; margin: 0.5em 0 1.2em; width: 100%; max-width: 1100px; }
th, td { border: 1px solid #ccc; padding: 5px 8px; text-align: left; vertical-align: top; }
th { background: #f7f7f7; }
.banner { padding: 8px 12px; border-radius: 4px; font-weight: 600; margin: 0.8em 0; }
.banner.pass { background: #d5f5d5; border: 1px solid #8fd18f; }
.banner.fail { background: #f9c0c0; border: 1px solid #d88; }
.warnings { background: #fff3cd; border: 1px solid #e6c767; padding: 8px 12px; border-radius: 4px; margin: 0.8em 0; }
.warnings ul { margin: 0.3em 0 0; padding-left: 1.4em; }
.counts { width: auto; }
.none { color: #666; font-style: italic; }
.shot-card { border: 1px solid #ccc; border-radius: 6px; padding: 10px 14px; margin: 1em 0; background: #fafafa; }
.badges { margin-bottom: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
.badge { background: #eaeaea; border-radius: 3px; padding: 2px 6px; font-size: 12px; }
.shot-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: start; }
.shot-col h4 { margin: 0 0 6px; }
.shot-col img { max-width: 100%; height: auto; border: 1px solid #bbb; background: #fff; }
.no-shot { padding: 18px; border: 1px dashed #bbb; color: #666; background: #fff; font-size: 12.5px; }
</style>
</head>
<body>
<h1>ULS Compare: <code>${ esc( n.beforeName ) }</code> vs <code>${ esc( n.afterName ) }</code></h1>
${ statusBanner }
${ warnHtml }

<h2>Run metadata</h2>
<table>
<thead><tr><th>Run</th><th>ULS commit</th><th>MediaWiki core</th><th>Suite commit</th><th>QA cookies</th><th>Filters</th><th>Duration</th></tr></thead>
<tbody>
${ renderRunMeta( 'Before', n.beforeName, n.beforeRun ) }
${ renderRunMeta( 'After', n.afterName, n.afterRun ) }
</tbody>
</table>

<h2>Summary counts</h2>
<table class="counts">
<thead><tr><th>Category</th><th>Count</th></tr></thead>
<tbody>
<tr><td>New failures (pass → FAIL)</td><td><strong>${ n.newFailures.length }</strong></td></tr>
<tr><td>Fixed tests (FAIL → pass)</td><td><strong>${ n.fixed.length }</strong></td></tr>
<tr><td>Known issues now passing (xfail → pass)</td><td><strong>${ n.kiNowPassing.length }</strong></td></tr>
<tr><td>Still failing / xfail</td><td>${ n.stillFailing.length }</td></tr>
<tr><td>n/a or other status changes</td><td>${ n.naChanges.length }</td></tr>
<tr><td>Tests added / removed</td><td>+${ n.added.length } / -${ n.removed.length }</td></tr>
<tr><td>Not compared (filter mismatch)</td><td>${ n.notCompared.length }</td></tr>
<tr><td>Passed after re-login or retry (before / after)</td><td>${ n.recovered.filter( ( r ) => r.side !== 'after' ).length } / ${ n.recovered.filter( ( r ) => r.side === 'after' ).length }</td></tr>
<tr><td>Changed matrix rows</td><td><strong>${ n.changedRows.length }</strong></td></tr>
</tbody>
</table>

<h2>New failures (pass → FAIL) (${ n.newFailures.length })</h2>
${ renderTestTable( n.newFailures, [
	{ label: 'Row', render: ( x ) => `<code>${ esc( x.row || x.project ) }</code>` },
	{ label: 'Group', render: ( x ) => `<code>@${ esc( String( x.group || '' ).replace( /^@/, '' ) ) }</code>` },
	{ label: 'Test', render: ( x ) => esc( x.title || x.id ) },
	{ label: 'Transition', render: ( x ) => `<code>${ esc( x.beforeOutcome || 'pass' ) } → ${ esc( x.afterOutcome || 'FAIL' ) }</code>` },
	{ label: 'First error line', render: ( x ) => `<code>${ esc( x.error || x.afterReason || x.reason || '' ) }</code>` }
] ) }

<h2>Fixed (FAIL → pass) (${ n.fixed.length })</h2>
${ renderTestTable( n.fixed, [
	{ label: 'Row', render: ( x ) => `<code>${ esc( x.row || x.project ) }</code>` },
	{ label: 'Group', render: ( x ) => `<code>@${ esc( String( x.group || '' ).replace( /^@/, '' ) ) }</code>` },
	{ label: 'Test', render: ( x ) => esc( x.title || x.id ) },
	{ label: 'Previous error', render: ( x ) => `<code>${ esc( x.beforeError || x.beforeReason || x.reason || '' ) }</code>` }
] ) }

<h2>Known issues that now pass (${ n.kiNowPassing.length })</h2>
${ renderTestTable( n.kiNowPassing, [
	{ label: 'Known issue', render: ( x ) => `<strong>${ esc( x.ki || extractKi( x.beforeReason ) || 'KI' ) }</strong>` },
	{ label: 'Row', render: ( x ) => `<code>${ esc( x.row || x.project ) }</code>` },
	{ label: 'Group', render: ( x ) => `<code>@${ esc( String( x.group || '' ).replace( /^@/, '' ) ) }</code>` },
	{ label: 'Test', render: ( x ) => esc( x.title || x.id ) },
	{ label: 'Note', render: ( x ) => esc( x.beforeReason || x.reason || '' ) }
] ) }

<h2>Still failing (${ n.stillFailing.length })</h2>
${ renderTestTable( n.stillFailing, [
	{ label: 'Row', render: ( x ) => `<code>${ esc( x.row || x.project ) }</code>` },
	{ label: 'Group', render: ( x ) => `<code>@${ esc( String( x.group || '' ).replace( /^@/, '' ) ) }</code>` },
	{ label: 'Test', render: ( x ) => esc( x.title || x.id ) },
	{ label: 'Status', render: ( x ) => `<code>${ esc( x.afterOutcome || x.outcome || 'FAIL' ) }</code>${ x.ki ? ` (${ esc( x.ki ) })` : '' }` },
	{ label: 'Reason / error', render: ( x ) => `<code>${ esc( x.reason || x.error || '' ) }</code>` }
] ) }

<h2>n/a and other changes (${ n.naChanges.length })</h2>
${ renderTestTable( n.naChanges, [
	{ label: 'Row', render: ( x ) => `<code>${ esc( x.row || x.project ) }</code>` },
	{ label: 'Group', render: ( x ) => `<code>@${ esc( String( x.group || '' ).replace( /^@/, '' ) ) }</code>` },
	{ label: 'Test', render: ( x ) => esc( x.title || x.id ) },
	{ label: 'Transition', render: ( x ) => `<code>${ esc( x.beforeOutcome || '' ) } → ${ esc( x.afterOutcome || '' ) }</code>` },
	{ label: 'Reason', render: ( x ) => esc( x.reason || x.afterReason || x.beforeReason || '' ) }
] ) }

<h2>Tests added (${ n.added.length }) and removed (${ n.removed.length })</h2>
${ renderTestTable( [
	...n.added.map( ( x ) => ( { ...x, kind: 'added' } ) ),
	...n.removed.map( ( x ) => ( { ...x, kind: 'removed' } ) )
], [
	{ label: 'Change', render: ( x ) => `<code>${ esc( x.kind ) }</code>` },
	{ label: 'Row', render: ( x ) => `<code>${ esc( x.row || x.project ) }</code>` },
	{ label: 'Group', render: ( x ) => `<code>@${ esc( String( x.group || '' ).replace( /^@/, '' ) ) }</code>` },
	{ label: 'Test', render: ( x ) => esc( x.title || x.id ) }
] ) }

<h2>Passed only after re-login or retry (${ n.recovered.length })</h2>
${ renderTestTable( n.recovered, [
	{ label: 'Run', render: ( x ) => `<code>${ esc( x.side || x.run || '' ) }</code>` },
	{ label: 'Row', render: ( x ) => `<code>${ esc( x.row || x.project ) }</code>` },
	{ label: 'Group', render: ( x ) => `<code>@${ esc( String( x.group || '' ).replace( /^@/, '' ) ) }</code>` },
	{ label: 'Test', render: ( x ) => esc( x.title || x.id ) }
] ) }

<h2>Side-by-side screenshots for changed rows (${ n.changedRows.length })</h2>
${ shotsSection }
</body>
</html>
`;

	const writeTarget = typeof opts === 'string' ? opts :
		typeof thirdArg === 'string' ? thirdArg :
		( opts && opts.outDir ) || ( thirdArg && thirdArg.outDir ) || ( input && input.outDir );
	if ( writeTarget ) {
		fs.mkdirSync( writeTarget, { recursive: true } );
		fs.writeFileSync( path.join( writeTarget, 'index.html' ), html );
	}
	return html;
}

function writeHtml( input, outDir, thirdArg ) {
	if ( typeof outDir === 'object' && outDir && ( outDir.run || Array.isArray( outDir.tests ) ) ) {
		const dir = typeof thirdArg === 'string' ? thirdArg : ( thirdArg && thirdArg.outDir );
		const html = renderHtml( input, outDir, dir ? { outDir: dir } : thirdArg );
		return dir ? path.join( dir, 'index.html' ) : html;
	}
	const dir = outDir || ( input && input.outDir );
	const html = renderHtml( input, { outDir: dir } );
	if ( dir ) {
		const file = path.join( dir, 'index.html' );
		fs.mkdirSync( dir, { recursive: true } );
		fs.writeFileSync( file, html );
		return file;
	}
	return html;
}

renderHtml.renderHtml = renderHtml;
renderHtml.renderCompareHtml = renderHtml;
renderHtml.generateHtml = renderHtml;
renderHtml.buildHtml = renderHtml;
renderHtml.render = renderHtml;
renderHtml.writeHtml = writeHtml;
renderHtml.writeCompareHtml = writeHtml;
renderHtml.normalizeDiff = normalizeDiff;
renderHtml.computeFromRuns = computeFromRuns;
renderHtml.default = renderHtml;

module.exports = renderHtml;
