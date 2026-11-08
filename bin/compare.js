#!/usr/bin/env node
// Compare two saved runs: `npm run compare -- <before> <after>`
// Reads runs/<before>/results.json and runs/<after>/results.json (or ULS_RUNS_DIR),
// prints a console summary, writes compare/<before>-vs-<after>/{summary.md,index.html,phab-draft.txt},
// and exits 1 when there are new failures.
'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const { knownIssuesFor } = require( '../tests/support/known-issues' );

const ROOT = path.join( __dirname, '..' );

function resolveRun( arg, runsDir ) {
	if ( fs.existsSync( arg ) ) {
		const stat = fs.statSync( arg );
		if ( stat.isDirectory() ) {
			const file = path.join( arg, 'results.json' );
			if ( fs.existsSync( file ) ) {
				return { name: path.basename( arg ), dir: path.resolve( arg ), file: path.resolve( file ) };
			}
		} else if ( stat.isFile() ) {
			const dir = path.dirname( path.resolve( arg ) );
			return { name: path.basename( dir ), dir, file: path.resolve( arg ) };
		}
	}
	const dir = path.resolve( runsDir, arg );
	const file = path.join( dir, 'results.json' );
	if ( !fs.existsSync( file ) ) {
		throw new Error( `Saved run not found: ${ path.relative( ROOT, file ) } (run with ULS_RUN=${ arg } npm test first)` );
	}
	return { name: arg, dir, file };
}

function loadRun( resolved ) {
	const raw = JSON.parse( fs.readFileSync( resolved.file, 'utf8' ) );
	if ( !raw || typeof raw !== 'object' || !raw.run || !Array.isArray( raw.tests ) ) {
		throw new Error( `Invalid results.json in ${ resolved.file }` );
	}
	return raw;
}

function normalizeFilters( f ) {
	if ( !f ) {
		return { skin: null, device: null, user: null, args: [] };
	}
	return {
		skin: f.skin || null,
		device: f.device || null,
		user: f.user || null,
		args: Array.isArray( f.args ) ? f.args.filter( Boolean ) : []
	};
}

function formatFilters( f ) {
	const nf = normalizeFilters( f );
	const parts = [];
	if ( nf.skin ) {
		parts.push( `ULS_SKIN=${ nf.skin }` );
	}
	if ( nf.device ) {
		parts.push( `ULS_DEVICE=${ nf.device }` );
	}
	if ( nf.user ) {
		parts.push( `ULS_USER=${ nf.user }` );
	}
	if ( nf.args.length ) {
		parts.push( `args: ${ nf.args.join( ' ' ) }` );
	}
	return parts.length ? parts.join( ', ' ) : 'none (full matrix)';
}

function sameFilters( a, b ) {
	const fa = normalizeFilters( a );
	const fb = normalizeFilters( b );
	return fa.skin === fb.skin &&
		fa.device === fb.device &&
		fa.user === fb.user &&
		fa.args.join( '\u0000' ) === fb.args.join( '\u0000' );
}

function extractKiName( testRecord, fallbackReason ) {
	const text = fallbackReason || ( testRecord && testRecord.reason ) || '';
	const match = text.match( /\b(KI-\d+[^;]*)/ );
	if ( match ) {
		return match[ 1 ].trim();
	}
	if ( testRecord && testRecord.skin && testRecord.group ) {
		const found = knownIssuesFor(
			{ skin: testRecord.skin, device: testRecord.device, user: testRecord.user },
			testRecord.group
		);
		if ( found.length ) {
			return found.map( ( k ) => `${ k.id }: ${ k.title }` ).join( '; ' );
		}
	}
	return text || 'Known issue';
}

function parseRowParts( rowName ) {
	const m = String( rowName ).match( /^(.*)-(desktop|tablet|mobile)-(anon|user)$/ );
	if ( !m ) {
		return { skin: null, device: null, user: null };
	}
	return { skin: m[ 1 ], device: m[ 2 ], user: m[ 3 ] };
}

function dedupeTestsById( tests ) {
	const map = new Map();
	for ( const t of Array.isArray( tests ) ? tests : [] ) {
		if ( !t || !t.id ) {
			continue;
		}
		const prev = map.get( t.id );
		if ( !prev ) {
			map.set( t.id, { ...t } );
		} else {
			// If a test ran multiple times (e.g. retry), keep the final attempt and carry recovered=true.
			map.set( t.id, {
				...t,
				recovered: Boolean( prev.recovered || t.recovered || t.outcome === 'pass' )
			} );
		}
	}
	return [ ...map.values() ];
}

function buildItem( base, beforeTest, afterTest, category, ki = null ) {
	const ref = afterTest || beforeTest || base;
	const parts = parseRowParts( ref.row );
	return {
		id: ref.id,
		row: ref.row,
		skin: ref.skin || parts.skin,
		device: ref.device || parts.device,
		user: ref.user || parts.user,
		group: ref.group || 'other',
		file: ref.file || '',
		title: ref.title || ref.id,
		beforeOutcome: beforeTest ? beforeTest.outcome : null,
		afterOutcome: afterTest ? afterTest.outcome : null,
		beforeReason: beforeTest ? ( beforeTest.reason || null ) : null,
		afterReason: afterTest ? ( afterTest.reason || null ) : null,
		beforeError: beforeTest ? ( beforeTest.error || null ) : null,
		afterError: afterTest ? ( afterTest.error || null ) : null,
		beforeRecovered: Boolean( beforeTest && beforeTest.recovered ),
		afterRecovered: Boolean( afterTest && afterTest.recovered ),
		ki,
		category
	};
}

function computeCellFromTests( rowTests ) {
	if ( !rowTests || !rowTests.length ) {
		return '';
	}
	const rank = { FAIL: 4, xfail: 3, pass: 2, 'n/a': 1, skip: 0 };
	const n = { pass: 0, FAIL: 0, xfail: 0, 'n/a': 0, skip: 0 };
	let kind = 'skip';
	for ( const t of rowTests ) {
		const k = n[ t.outcome ] !== undefined ? t.outcome : 'skip';
		n[ k ]++;
		if ( rank[ k ] > rank[ kind ] ) {
			kind = k;
		}
	}
	const total = n.pass + n.FAIL + n.xfail;
	if ( kind === 'n/a' || kind === 'skip' ) {
		return kind;
	}
	const na = n[ 'n/a' ] ? ` +${ n[ 'n/a' ] } n/a` : '';
	if ( kind === 'FAIL' ) {
		return `FAIL ${ n.FAIL }/${ total }${ na }`;
	}
	if ( kind === 'xfail' ) {
		return `xfail ${ n.xfail }/${ total }${ na }`;
	}
	return `pass ${ n.pass }/${ total }${ na }`;
}

function compareRuns( beforeData, afterData, opts = {} ) {
	const beforeName = opts.beforeName || ( beforeData.run && beforeData.run.name ) || 'before';
	const afterName = opts.afterName || ( afterData.run && afterData.run.name ) || 'after';
	const beforeDir = opts.beforeDir || null;
	const afterDir = opts.afterDir || null;
	const outDir = opts.outDir || path.join( ROOT, 'compare', `${ beforeName }-vs-${ afterName }` );

	const bRun = beforeData.run || {};
	const aRun = afterData.run || {};

	const warnings = [];
	const warningDetails = [];

	const bSuite = `${ bRun.suiteCommit || 'unknown' }${ bRun.suiteDirty ? ' (dirty)' : '' }`;
	const aSuite = `${ aRun.suiteCommit || 'unknown' }${ aRun.suiteDirty ? ' (dirty)' : '' }`;
	if ( bRun.suiteCommit !== aRun.suiteCommit || Boolean( bRun.suiteDirty ) !== Boolean( aRun.suiteDirty ) ) {
		const msg = `Suite commits or working tree state differ (${ bSuite } vs ${ aSuite }): this includes a test change, not only a ULS code change.`;
		warnings.push( msg );
		warningDetails.push( { code: 'suite-changed', message: msg, beforeSuite: bSuite, afterSuite: aSuite } );
	} else if ( bRun.suiteDirty && aRun.suiteDirty ) {
		const msg = `Both runs had uncommitted local changes in the test suite (${ aSuite }).`;
		warnings.push( msg );
		warningDetails.push( { code: 'suite-dirty', message: msg, beforeSuite: bSuite, afterSuite: aSuite } );
	}

	const filtersDiffer = !sameFilters( bRun.filters, aRun.filters );
	if ( filtersDiffer ) {
		const msg = `Run filters differ (before: ${ formatFilters( bRun.filters ) }; after: ${ formatFilters( aRun.filters ) }): rows in only one run are marked "not compared", not "removed".`;
		warnings.push( msg );
		warningDetails.push( { code: 'filters-differ', message: msg, beforeFilters: formatFilters( bRun.filters ), afterFilters: formatFilters( aRun.filters ) } );
	}

	const bCookies = bRun.cookies || null;
	const aCookies = aRun.cookies || null;
	if ( ( bRun.ulsCommit || null ) === ( aRun.ulsCommit || null ) &&
		( bRun.coreCommit || null ) === ( aRun.coreCommit || null ) &&
		bCookies === aCookies ) {
		const msg = `No code change between these runs: ULS commit (${ bRun.ulsCommit || 'unknown' }), MediaWiki core commit (${ bRun.coreCommit || 'unknown' }) and QA cookies (${ bCookies || 'none' }) are identical.`;
		warnings.push( msg );
		warningDetails.push( { code: 'no-code-change', message: msg } );
	}

	const bTests = dedupeTestsById( beforeData.tests );
	const aTests = dedupeTestsById( afterData.tests );

	const bById = new Map( bTests.map( ( t ) => [ t.id, t ] ) );
	const aById = new Map( aTests.map( ( t ) => [ t.id, t ] ) );
	const bRows = new Set( bTests.map( ( t ) => t.row ) );
	const aRows = new Set( aTests.map( ( t ) => t.row ) );

	const categories = {
		newFailures: [],
		fixed: [],
		kiNowPassing: [],
		stillFailing: [],
		stillXfail: [],
		added: [],
		removed: [],
		naChanges: [],
		otherChanges: [],
		notCompared: [],
		recovered: [],
		recoveredBefore: [],
		recoveredAfter: []
	};

	const allIds = new Set( [ ...bById.keys(), ...aById.keys() ] );
	for ( const id of allIds ) {
		const bt = bById.get( id ) || null;
		const at = aById.get( id ) || null;

		if ( bt && bt.recovered ) {
			categories.recoveredBefore.push( buildItem( bt, bt, at, 'recoveredBefore' ) );
		}
		if ( at && at.recovered ) {
			categories.recoveredAfter.push( buildItem( at, bt, at, 'recoveredAfter' ) );
		}
		if ( ( bt && bt.recovered ) || ( at && at.recovered ) ) {
			categories.recovered.push( buildItem( at || bt, bt, at, 'recovered' ) );
		}

		if ( bt && !at ) {
			if ( filtersDiffer ) {
				categories.notCompared.push( buildItem( bt, bt, null, 'notCompared' ) );
			} else {
				categories.removed.push( buildItem( bt, bt, null, 'removed' ) );
			}
			continue;
		}
		if ( !bt && at ) {
			if ( filtersDiffer ) {
				categories.notCompared.push( buildItem( at, null, at, 'notCompared' ) );
			} else {
				categories.added.push( buildItem( at, null, at, 'added' ) );
			}
			continue;
		}

		const bo = bt.outcome;
		const ao = at.outcome;

		// Check if a known issue (xfail in before) now passes in after:
		// In summary-reporter.js (line 45), a test marked with test.fail(true, 'KI-...') that
		// unexpectedly passes in Playwright has result.status === 'passed', so result.error is null
		// and summary-reporter records outcome: 'FAIL', error: null, reason: ''.
		// An xfail test that crashed with a real error has at.error !== null (so xfail -> FAIL with error is a new failure).
		const isKiUnexpectedPass = bo === 'xfail' && ( ao === 'pass' || ( ao === 'FAIL' && !at.error && !at.reason ) );
		if ( isKiUnexpectedPass ) {
			const kiName = extractKiName( bt, bt.reason || at.reason );
			const item = buildItem( at, bt, { ...at, outcome: 'pass' }, 'kiNowPassing', kiName );
			item.rawAfterOutcome = ao;
			categories.kiNowPassing.push( item );
			continue;
		}

		if ( bo !== 'FAIL' && ao === 'FAIL' ) {
			const item = buildItem( at, bt, at, 'newFailures' );
			categories.newFailures.push( item );
			if ( bo === 'n/a' ) {
				categories.naChanges.push( buildItem( at, bt, at, 'naChanges' ) );
			}
			continue;
		}

		if ( bo === 'FAIL' && ao === 'pass' ) {
			categories.fixed.push( buildItem( at, bt, at, 'fixed' ) );
			continue;
		}

		if ( bo === 'FAIL' && ao === 'FAIL' ) {
			categories.stillFailing.push( buildItem( at, bt, at, 'stillFailing' ) );
			continue;
		}

		if ( bo === 'xfail' && ao === 'xfail' ) {
			const kiName = extractKiName( bt, bt.reason || at.reason );
			categories.stillXfail.push( buildItem( at, bt, at, 'stillXfail', kiName ) );
			continue;
		}

		if ( bo !== ao && ( bo === 'n/a' || ao === 'n/a' ) ) {
			categories.naChanges.push( buildItem( at, bt, at, 'naChanges' ) );
			continue;
		}

		if ( bo !== ao ) {
			// Other outcome transitions (e.g. pass -> xfail, FAIL -> xfail, pass -> skip, skip -> pass, xfail -> skip)
			const kiName = ( bo === 'xfail' || ao === 'xfail' ) ? extractKiName( ao === 'xfail' ? at : bt, at.reason || bt.reason ) : null;
			categories.otherChanges.push( buildItem( at, bt, at, 'otherChanges', kiName ) );
		}
	}

	// Group changed rows and compute row-level summary + screenshot paths.
	const allRowNames = [ ...new Set( [ ...bRows, ...aRows ] ) ];
	const changedRowMap = new Map();
	const notComparedRowMap = new Map();
	for ( const item of categories.notCompared ) {
		const presentIn = ( bRows.has( item.row ) && aRows.has( item.row ) ) ?
			( item.beforeOutcome ? 'before (filtered group in after)' : 'after (filtered group in before)' ) :
			( bRows.has( item.row ) ? 'before' : 'after' );
		if ( !notComparedRowMap.has( item.row ) ) {
			notComparedRowMap.set( item.row, { row: item.row, presentIn } );
		}
	}
	const notComparedRows = [ ...notComparedRowMap.values() ];

	function resolveShot( runDirPath, runNameStr, rowName ) {
		const candidate = runDirPath ?
			path.join( runDirPath, 'shots', `${ rowName }.png` ) :
			path.join( ROOT, 'runs', runNameStr, 'shots', `${ rowName }.png` );
		if ( fs.existsSync( candidate ) ) {
			return {
				absPath: candidate,
				relFromOut: path.relative( outDir, candidate ).split( path.sep ).join( '/' ),
				relFromRoot: path.relative( ROOT, candidate ).split( path.sep ).join( '/' )
			};
		}
		return null;
	}

	const changeLists = [
		...categories.newFailures,
		...categories.fixed,
		...categories.kiNowPassing,
		...categories.naChanges,
		...categories.otherChanges,
		...categories.added,
		...categories.removed
	];

	for ( const rowName of allRowNames ) {
		const inB = bRows.has( rowName );
		const inA = aRows.has( rowName );
		if ( filtersDiffer && ( !inB || !inA ) ) {
			continue;
		}

		const rowChanges = changeLists.filter( ( item ) => item.row === rowName );
		const bRowTests = bTests.filter( ( t ) => t.row === rowName );
		const aRowTests = aTests.filter( ( t ) => t.row === rowName );
		const groups = [ ...new Set( [ ...bRowTests.map( ( t ) => t.group ), ...aRowTests.map( ( t ) => t.group ) ] ) ].sort();

		const groupChanges = [];
		for ( const g of groups ) {
			const bGroupTests = bRowTests.filter( ( t ) => t.group === g );
			const aGroupTests = aRowTests.filter( ( t ) => t.group === g );
			if ( filtersDiffer && ( bGroupTests.length === 0 || aGroupTests.length === 0 ) ) {
				continue;
			}
			const bCell = computeCellFromTests( bGroupTests );
			const aCell = computeCellFromTests( aGroupTests );
			if ( bCell !== aCell ) {
				groupChanges.push( { group: g, beforeCell: bCell || 'not run', afterCell: aCell || 'not run' } );
			}
		}

		if ( rowChanges.length === 0 ) {
			continue;
		}

		const priority = [ 'newFailures', 'fixed', 'kiNowPassing', 'naChanges', 'otherChanges', 'added', 'removed' ];
		let primaryCategory = 'changed';
		for ( const p of priority ) {
			if ( rowChanges.some( ( c ) => c.category === p ) ) {
				primaryCategory = p;
				break;
			}
		}

		const parts = parseRowParts( rowName );
		const bShot = resolveShot( beforeDir, beforeName, rowName );
		const aShot = resolveShot( afterDir, afterName, rowName );
		const kis = [ ...new Set( rowChanges.map( ( c ) => c.ki ).filter( Boolean ) ) ];

		changedRowMap.set( rowName, {
			row: rowName,
			skin: parts.skin,
			device: parts.device,
			user: parts.user,
			category: primaryCategory,
			groupChanges,
			changes: rowChanges,
			kis,
			beforeShot: bShot ? bShot.relFromOut : null,
			afterShot: aShot ? aShot.relFromOut : null,
			beforeShotPath: bShot ? bShot.relFromRoot : null,
			afterShotPath: aShot ? aShot.relFromRoot : null,
			hasShots: Boolean( bShot || aShot )
		} );
	}

	const changedRows = [ ...changedRowMap.values() ].sort( ( a, b ) => {
		if ( a.category === 'newFailures' && b.category !== 'newFailures' ) {
			return -1;
		}
		if ( b.category === 'newFailures' && a.category !== 'newFailures' ) {
			return 1;
		}
		return a.row.localeCompare( b.row );
	} );

	const stillFailingRows = [ ...new Set( categories.stillFailing.map( ( t ) => t.row ) ) ];
	const stillXfailRows = [ ...new Set( categories.stillXfail.map( ( t ) => t.row ) ) ];
	const newFailureRows = [ ...new Set( categories.newFailures.map( ( t ) => t.row ) ) ];
	const fixedRows = [ ...new Set( categories.fixed.map( ( t ) => t.row ) ) ];
	const kiNowPassingRows = [ ...new Set( categories.kiNowPassing.map( ( t ) => t.row ) ) ];
	const recoveredRows = [ ...new Set( categories.recovered.map( ( t ) => t.row ) ) ];

	return {
		beforeName,
		afterName,
		before: beforeData,
		after: afterData,
		beforeRun: bRun,
		afterRun: aRun,
		beforeDir,
		afterDir,
		outDir,
		filtersDiffer,
		warnings,
		warningDetails,
		categories,
		changedRows,
		notComparedRows,
		rowLists: {
			newFailures: newFailureRows,
			fixed: fixedRows,
			kiNowPassing: kiNowPassingRows,
			stillFailing: stillFailingRows,
			stillXfail: stillXfailRows,
			recovered: recoveredRows
		},
		counts: {
			newFailures: categories.newFailures.length,
			newFailureRows: newFailureRows.length,
			fixed: categories.fixed.length,
			fixedRows: fixedRows.length,
			kiNowPassing: categories.kiNowPassing.length,
			kiNowPassingRows: kiNowPassingRows.length,
			stillFailing: categories.stillFailing.length,
			stillFailingRows: stillFailingRows.length,
			stillXfail: categories.stillXfail.length,
			stillXfailRows: stillXfailRows.length,
			added: categories.added.length,
			removed: categories.removed.length,
			naChanges: categories.naChanges.length,
			otherChanges: categories.otherChanges.length,
			notCompared: categories.notCompared.length,
			notComparedRows: notComparedRows.length,
			recovered: categories.recovered.length,
			recoveredBefore: categories.recoveredBefore.length,
			recoveredAfter: categories.recoveredAfter.length,
			changedRows: changedRows.length
		},
		exitCode: categories.newFailures.length > 0 ? 1 : 0
	};
}

function renderSummaryMd( diff ) {
	const b = diff.beforeRun;
	const a = diff.afterRun;
	const c = diff.counts;
	const lines = [
		`# Compare: ${ diff.beforeName } vs ${ diff.afterName }`,
		''
	];

	if ( diff.warnings.length ) {
		lines.push( '## Warnings', '' );
		for ( const w of diff.warnings ) {
			lines.push( `- WARNING: ${ w }` );
		}
		lines.push( '' );
	}

	if ( diff.categories.newFailures.length ) {
		lines.push( `## New failures (${ c.newFailures } test(s) in ${ c.newFailureRows } row(s))`, '' );
		for ( const item of diff.categories.newFailures ) {
			const detail = item.afterError || item.afterReason || 'unexpected failure';
			lines.push( `- FAIL \`${ item.row }\` (\`@${ item.group }\` › ${ item.title }): ${ item.beforeOutcome } -> ${ item.afterOutcome } (${ detail })` );
		}
		lines.push( '' );
	}

	lines.push(
		'## Run metadata',
		'',
		'| Field | Before | After |',
		'|---|---|---|',
		`| Run name | \`${ diff.beforeName }\` | \`${ diff.afterName }\` |`,
		`| Wiki | ${ b.wiki || 'unknown' } | ${ a.wiki || 'unknown' } |`,
		`| ULS commit | \`${ b.ulsCommit || 'unknown' }\` (${ b.ulsCommitDate || 'n/a' }) | \`${ a.ulsCommit || 'unknown' }\` (${ a.ulsCommitDate || 'n/a' }) |`,
		`| MediaWiki core | ${ b.coreVersion || '' } (\`${ b.coreCommit || 'unknown' }\`) | ${ a.coreVersion || '' } (\`${ a.coreCommit || 'unknown' }\`) |`,
		`| Suite commit | \`${ b.suiteCommit || 'unknown' }\`${ b.suiteDirty ? ' (dirty)' : '' } | \`${ a.suiteCommit || 'unknown' }\`${ a.suiteDirty ? ' (dirty)' : '' } |`,
		`| QA cookies | \`${ b.cookies || 'none' }\` | \`${ a.cookies || 'none' }\` |`,
		`| Filters | ${ formatFilters( b.filters ) } | ${ formatFilters( a.filters ) } |`,
		`| Run time | ${ b.seconds != null ? `${ b.seconds } s` : 'n/a' } | ${ a.seconds != null ? `${ a.seconds } s` : 'n/a' } |`,
		''
	);

	lines.push(
		'## Summary counts',
		'',
		'| Category | Tests | Rows |',
		'|---|---|---|',
		`| New failures (pass -> FAIL) | ${ c.newFailures } | ${ c.newFailureRows } |`,
		`| Fixed rows (FAIL -> pass) | ${ c.fixed } | ${ c.fixedRows } |`,
		`| Known issues now passing | ${ c.kiNowPassing } | ${ c.kiNowPassingRows } |`,
		`| Still failing (FAIL -> FAIL) | ${ c.stillFailing } | ${ c.stillFailingRows } |`,
		`| Known issues still failing (xfail -> xfail) | ${ c.stillXfail } | ${ c.stillXfailRows } |`,
		`| Tests added | ${ c.added } | - |`,
		`| Tests removed | ${ c.removed } | - |`,
		`| n/a changes | ${ c.naChanges } | - |`,
		`| Other transitions (e.g. pass/FAIL <-> xfail/skip) | ${ c.otherChanges } | - |`,
		`| Passed only after re-login or retry (counted apart) | before: ${ c.recoveredBefore }, after: ${ c.recoveredAfter } | ${ diff.rowLists.recovered.length } |`
	);
	if ( diff.filtersDiffer || c.notCompared > 0 ) {
		lines.push( `| Not compared (filter mismatch) | ${ c.notCompared } | ${ c.notComparedRows } |` );
	}
	lines.push( '' );

	lines.push( '## Changed rows', '' );
	if ( diff.changedRows.length === 0 ) {
		lines.push( '0 rows changed between these runs.', '' );
	} else {
		lines.push(
			'| Row | Category | Group changes | Screenshots |',
			'|---|---|---|---|'
		);
		for ( const r of diff.changedRows ) {
			const gText = r.groupChanges.map( ( g ) => `@${ g.group }: ${ g.beforeCell } -> ${ g.afterCell }` ).join( '; ' ) ||
				r.changes.map( ( ch ) => `@${ ch.group }: ${ ch.beforeOutcome || 'none' } -> ${ ch.afterOutcome || 'none' }` ).join( '; ' );
			const shots = [];
			if ( r.beforeShotPath ) {
				shots.push( `before: \`${ r.beforeShotPath }\`` );
			}
			if ( r.afterShotPath ) {
				shots.push( `after: \`${ r.afterShotPath }\`` );
			}
			lines.push( `| \`${ r.row }\` | ${ r.category } | ${ gText } | ${ shots.join( ', ' ) || 'none' } |` );
		}
		lines.push( '' );
	}

	if ( diff.categories.fixed.length ) {
		lines.push( '## Fixed rows (FAIL -> pass)', '' );
		for ( const item of diff.categories.fixed ) {
			lines.push( `- FIXED \`${ item.row }\` (\`@${ item.group }\` › ${ item.title }): ${ item.beforeOutcome } -> ${ item.afterOutcome }` );
		}
		lines.push( '' );
	}

	if ( diff.categories.kiNowPassing.length ) {
		lines.push( '## Known issues that now pass', '' );
		for ( const item of diff.categories.kiNowPassing ) {
			lines.push( `- KI PASSING \`${ item.row }\` (\`@${ item.group }\` › ${ item.title }): ${ item.ki } now passes` );
		}
		lines.push( '' );
	}

	if ( diff.categories.stillFailing.length ) {
		lines.push( '## Rows still failing (FAIL -> FAIL)', '' );
		for ( const item of diff.categories.stillFailing ) {
			lines.push( `- STILL FAIL \`${ item.row }\` (\`@${ item.group }\` › ${ item.title }): ${ item.afterError || item.afterReason || 'failed in both runs' }` );
		}
		lines.push( '' );
	}

	if ( diff.categories.naChanges.length ) {
		lines.push( '## n/a changes', '' );
		for ( const item of diff.categories.naChanges ) {
			lines.push( `- N/A CHANGE \`${ item.row }\` (\`@${ item.group }\` › ${ item.title }): ${ item.beforeOutcome } -> ${ item.afterOutcome }` );
		}
		lines.push( '' );
	}

	if ( diff.categories.otherChanges.length ) {
		lines.push( '## Other outcome transitions', '' );
		for ( const item of diff.categories.otherChanges ) {
			const extra = item.ki ? ` (${ item.ki })` : '';
			lines.push( `- OTHER \`${ item.row }\` (\`@${ item.group }\` › ${ item.title }): ${ item.beforeOutcome } -> ${ item.afterOutcome }${ extra }` );
		}
		lines.push( '' );
	}

	if ( diff.categories.added.length || diff.categories.removed.length ) {
		lines.push( '## Tests added or removed', '' );
		for ( const item of diff.categories.added ) {
			lines.push( `- ADDED \`${ item.row }\` (\`@${ item.group }\` › ${ item.title }): ${ item.afterOutcome }` );
		}
		for ( const item of diff.categories.removed ) {
			lines.push( `- REMOVED \`${ item.row }\` (\`@${ item.group }\` › ${ item.title }): was ${ item.beforeOutcome }` );
		}
		lines.push( '' );
	}

	if ( diff.categories.recovered.length ) {
		lines.push( '## Passed only after a re-login or retry (counted apart)', '' );
		for ( const item of diff.categories.recovered ) {
			const which = item.beforeRecovered && item.afterRecovered ? 'both runs' : ( item.afterRecovered ? `after (${ diff.afterName })` : `before (${ diff.beforeName })` );
			lines.push( `- RECOVERED \`${ item.row }\` (\`@${ item.group }\` › ${ item.title }): passed after retry/re-login in ${ which }` );
		}
		lines.push( '' );
	}

	if ( diff.notComparedRows.length ) {
		lines.push( '## Not compared (filter mismatch)', '' );
		for ( const r of diff.notComparedRows ) {
			lines.push( `- NOT COMPARED \`${ r.row }\`: only in ${ r.presentIn } run` );
		}
		lines.push( '' );
	}

	return lines.join( '\n' );
}

function renderConsoleSummary( diff, relOutDir ) {
	const c = diff.counts;
	const lines = [
		`Compare: ${ diff.beforeName } vs ${ diff.afterName }`
	];
	for ( const w of diff.warnings ) {
		lines.push( `WARNING: ${ w }` );
	}
	if ( diff.categories.newFailures.length ) {
		lines.push( `NEW FAILURES (${ c.newFailures } test(s) across ${ c.newFailureRows } row(s)):` );
		for ( const item of diff.categories.newFailures ) {
			lines.push( `  FAIL ${ item.row } › @${ item.group } › ${ item.title }: ${ item.beforeOutcome } -> ${ item.afterOutcome } (${ item.afterError || item.afterReason || 'failed' })` );
		}
	}
	lines.push(
		`Summary: ${ c.changedRows } changed row(s) | new failures: ${ c.newFailures } (${ c.newFailureRows } rows) | fixed: ${ c.fixed } (${ c.fixedRows } rows) | KI now passing: ${ c.kiNowPassing } (${ c.kiNowPassingRows } rows) | still failing: ${ c.stillFailing } (xfail unchanged: ${ c.stillXfail }) | added: ${ c.added } | removed: ${ c.removed } | n/a changes: ${ c.naChanges }${ c.otherChanges ? ` | other transitions: ${ c.otherChanges }` : '' } | recovered (re-login/retry): before ${ c.recoveredBefore }, after ${ c.recoveredAfter }${ diff.filtersDiffer ? ` | not compared: ${ c.notCompared } (${ c.notComparedRows } rows)` : '' }`
	);
	if ( diff.categories.kiNowPassing.length ) {
		for ( const item of diff.categories.kiNowPassing ) {
			lines.push( `  KI PASSING ${ item.row } › @${ item.group }: ${ item.ki }` );
		}
	}
	if ( diff.categories.fixed.length ) {
		for ( const item of diff.categories.fixed ) {
			lines.push( `  FIXED ${ item.row } › @${ item.group } › ${ item.title }` );
		}
	}
	lines.push( `Wrote: ${ relOutDir }/summary.md, ${ relOutDir }/index.html, ${ relOutDir }/phab-draft.txt` );
	return lines.join( '\n' );
}

function escHtml( s ) {
	return String( s == null ? '' : s ).replace( /[&<>"]/g, ( ch ) => ( { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ ch ] ) );
}

function fallbackCompareHtml( diff ) {
	const b = diff.beforeRun;
	const a = diff.afterRun;
	const c = diff.counts;
	const warningsHtml = diff.warnings.length ?
		`<div class="warnings"><h2>Warnings</h2><ul>${ diff.warnings.map( ( w ) => `<li>${ escHtml( w ) }</li>` ).join( '' ) }</ul></div>` :
		'';
	const newFailHtml = diff.categories.newFailures.length ?
		`<div class="new-failures"><h2>New failures (${ c.newFailures } test(s) in ${ c.newFailureRows } row(s))</h2><ul>${
			diff.categories.newFailures.map( ( item ) => `<li><b>${ escHtml( item.row ) }</b> (@${ escHtml( item.group ) } › ${ escHtml( item.title ) }): ${ escHtml( item.beforeOutcome ) } → ${ escHtml( item.afterOutcome ) } — ${ escHtml( item.afterError || item.afterReason || 'failed' ) }</li>` ).join( '' )
		}</ul></div>` :
		'';
	const rowsHtml = diff.changedRows.length === 0 ?
		'<p>0 rows changed between these runs.</p>' :
		diff.changedRows.map( ( r ) => {
			const gList = r.groupChanges.map( ( g ) => `<li><code>@${ escHtml( g.group ) }</code>: ${ escHtml( g.beforeCell ) } → <b>${ escHtml( g.afterCell ) }</b></li>` ).join( '' );
			const tList = r.changes.map( ( ch ) => `<li><code>@${ escHtml( ch.group ) }</code> › ${ escHtml( ch.title ) }: ${ escHtml( ch.beforeOutcome || 'none' ) } → <b>${ escHtml( ch.afterOutcome || 'none' ) }</b>${ ch.ki ? ` (${ escHtml( ch.ki ) })` : '' }${ ch.afterError ? ` — <code>${ escHtml( ch.afterError ) }</code>` : '' }</li>` ).join( '' );
			const shots = ( r.beforeShot || r.afterShot ) ?
				`<div class="shots">
					<figure><figcaption>Before (${ escHtml( diff.beforeName ) })</figcaption>${ r.beforeShot ? `<img src="${ escHtml( r.beforeShot ) }" alt="Before ${ escHtml( r.row ) }">` : '<p>No screenshot</p>' }</figure>
					<figure><figcaption>After (${ escHtml( diff.afterName ) })</figcaption>${ r.afterShot ? `<img src="${ escHtml( r.afterShot ) }" alt="After ${ escHtml( r.row ) }">` : '<p>No screenshot</p>' }</figure>
				</div>` :
				'<p class="no-shots">No screenshots saved for this row (run with ULS_SHOTS=1).</p>';
			return `<section class="row-card ${ escHtml( r.category ) }">
				<h3><code>${ escHtml( r.row ) }</code> <span class="badge">${ escHtml( r.category ) }</span></h3>
				<ul>${ gList || tList }</ul>
				${ gList && tList ? `<details><summary>Test details (${ r.changes.length })</summary><ul>${ tList }</ul></details>` : '' }
				${ shots }
			</section>`;
		} ).join( '\n' );

	return `<!doctype html><meta charset="utf-8"><title>ULS Compare: ${ escHtml( diff.beforeName ) } vs ${ escHtml( diff.afterName ) }</title>
<style>
body{font:14px/1.45 system-ui,sans-serif;margin:1.5em;color:#202122;background:#fff}
table{border-collapse:collapse;margin:1em 0}td,th{border:1px solid #c8ccd1;padding:5px 10px;text-align:left}th{background:#eaecf0}
.warnings{background:#fef6e7;border:1px solid #fc3;padding:0.75em 1em;margin:1em 0}
.new-failures{background:#fee7e6;border:1px solid #d33;padding:0.75em 1em;margin:1em 0}
.row-card{border:1px solid #c8ccd1;padding:1em;margin:1em 0;border-radius:4px}
.row-card.newFailures{border-left:5px solid #d33}
.row-card.fixed,.row-card.kiNowPassing{border-left:5px solid #14866d}
.badge{font-size:12px;padding:2px 6px;background:#eaecf0;border-radius:3px}
.shots{display:grid;grid-template-columns:1fr 1fr;gap:1em;margin-top:0.75em}
.shots figure{margin:0;border:1px solid #eaecf0;padding:0.5em;background:#f8f9fa}
.shots img{max-width:100%;height:auto;display:block}
</style>
<h1>ULS Compare: <code>${ escHtml( diff.beforeName ) }</code> vs <code>${ escHtml( diff.afterName ) }</code></h1>
${ warningsHtml }
${ newFailHtml }
<h2>Run metadata</h2>
<table>
<tr><th>Field</th><th>Before (<code>${ escHtml( diff.beforeName ) }</code>)</th><th>After (<code>${ escHtml( diff.afterName ) }</code>)</th></tr>
<tr><td>Wiki</td><td>${ escHtml( b.wiki || 'unknown' ) }</td><td>${ escHtml( a.wiki || 'unknown' ) }</td></tr>
<tr><td>ULS commit</td><td><code>${ escHtml( b.ulsCommit || 'unknown' ) }</code> (${ escHtml( b.ulsCommitDate || 'n/a' ) })</td><td><code>${ escHtml( a.ulsCommit || 'unknown' ) }</code> (${ escHtml( a.ulsCommitDate || 'n/a' ) })</td></tr>
<tr><td>MediaWiki core</td><td>${ escHtml( b.coreVersion || '' ) } (<code>${ escHtml( b.coreCommit || 'unknown' ) }</code>)</td><td>${ escHtml( a.coreVersion || '' ) } (<code>${ escHtml( a.coreCommit || 'unknown' ) }</code>)</td></tr>
<tr><td>Suite commit</td><td><code>${ escHtml( b.suiteCommit || 'unknown' ) }</code>${ b.suiteDirty ? ' (dirty)' : '' }</td><td><code>${ escHtml( a.suiteCommit || 'unknown' ) }</code>${ a.suiteDirty ? ' (dirty)' : '' }</td></tr>
<tr><td>QA cookies</td><td><code>${ escHtml( b.cookies || 'none' ) }</code></td><td><code>${ escHtml( a.cookies || 'none' ) }</code></td></tr>
<tr><td>Filters</td><td>${ escHtml( formatFilters( b.filters ) ) }</td><td>${ escHtml( formatFilters( a.filters ) ) }</td></tr>
<tr><td>Run time</td><td>${ b.seconds != null ? `${ b.seconds } s` : 'n/a' }</td><td>${ a.seconds != null ? `${ a.seconds } s` : 'n/a' }</td></tr>
</table>
<h2>Summary counts</h2>
<table>
<tr><th>Category</th><th>Tests</th><th>Rows</th></tr>
<tr><td>New failures (pass → FAIL)</td><td>${ c.newFailures }</td><td>${ c.newFailureRows }</td></tr>
<tr><td>Fixed rows (FAIL → pass)</td><td>${ c.fixed }</td><td>${ c.fixedRows }</td></tr>
<tr><td>Known issues now passing</td><td>${ c.kiNowPassing }</td><td>${ c.kiNowPassingRows }</td></tr>
<tr><td>Rows still failing (FAIL → FAIL)</td><td>${ c.stillFailing }</td><td>${ c.stillFailingRows }</td></tr>
<tr><td>Known issues unchanged (xfail → xfail)</td><td>${ c.stillXfail }</td><td>${ c.stillXfailRows }</td></tr>
<tr><td>Tests added / removed</td><td>+${ c.added } / -${ c.removed }</td><td>-</td></tr>
<tr><td>n/a changes</td><td>${ c.naChanges }</td><td>-</td></tr>
<tr><td>Passed only after re-login or retry</td><td>before: ${ c.recoveredBefore }, after: ${ c.recoveredAfter }</td><td>${ diff.rowLists.recovered.length }</td></tr>
</table>
<h2>Changed rows (${ c.changedRows })</h2>
${ rowsHtml }
`;
}

function fallbackComparePhab( diff ) {
	const b = diff.beforeRun;
	const a = diff.afterRun;
	const c = diff.counts;
	const relOut = path.relative( ROOT, diff.outDir ).split( path.sep ).join( '/' );

	const lines = [
		`== ULS UI test comparison: \`${ diff.beforeName }\` vs \`${ diff.afterName }\` ==`,
		'',
		`- Wiki: ${ a.wiki || b.wiki || 'unknown' }`,
		`- Before (\`${ diff.beforeName }\`): ULS \`${ b.ulsCommit || 'unknown' }\`, core \`${ b.coreCommit || 'unknown' }\`, cookies \`${ b.cookies || 'none' }\`, suite \`${ b.suiteCommit || 'unknown' }\`, time ${ b.seconds != null ? `${ b.seconds } s` : 'n/a' }`,
		`- After (\`${ diff.afterName }\`): ULS \`${ a.ulsCommit || 'unknown' }\`, core \`${ a.coreCommit || 'unknown' }\`, cookies \`${ a.cookies || 'none' }\`, suite \`${ a.suiteCommit || 'unknown' }\`, time ${ a.seconds != null ? `${ a.seconds } s` : 'n/a' }`,
		''
	];

	if ( diff.warnings.length ) {
		lines.push( '=== Warnings ===', '' );
		for ( const w of diff.warnings ) {
			lines.push( `- ${ w }` );
		}
		lines.push( '' );
	}

	lines.push(
		'=== Counts by category ===',
		'',
		'| Category | Tests | Rows |',
		'| --- | --- | --- |',
		`| New failures (pass -> FAIL) | ${ c.newFailures } | ${ c.newFailureRows } |`,
		`| Fixed rows (FAIL -> pass) | ${ c.fixed } | ${ c.fixedRows } |`,
		`| Known issues now passing | ${ c.kiNowPassing } | ${ c.kiNowPassingRows } |`,
		`| Still failing (FAIL -> FAIL) | ${ c.stillFailing } | ${ c.stillFailingRows } |`,
		`| Known issues still failing (xfail -> xfail) | ${ c.stillXfail } | ${ c.stillXfailRows } |`,
		`| Tests added / removed | +${ c.added } / -${ c.removed } | - |`,
		`| n/a changes | ${ c.naChanges } | - |`,
		`| Passed only after re-login or retry | before: ${ c.recoveredBefore }, after: ${ c.recoveredAfter } | ${ diff.rowLists.recovered.length } |`,
		''
	);

	if ( diff.categories.kiNowPassing.length ) {
		lines.push( '=== Known issues that now pass ===', '' );
		for ( const item of diff.categories.kiNowPassing ) {
			lines.push( `- \`${ item.row }\` (\`@${ item.group }\`): ${ item.ki }` );
		}
		lines.push( '' );
	}

	lines.push( '=== Changed rows ===', '' );
	if ( diff.changedRows.length === 0 ) {
		lines.push( 'No rows changed between these runs.', '' );
	} else {
		lines.push(
			'| Row | Category | Changes | Before screenshot | After screenshot |',
			'| --- | --- | --- | --- | --- |'
		);
		for ( const r of diff.changedRows ) {
			const changesText = r.groupChanges.map( ( g ) => `@${ g.group }: ${ g.beforeCell } -> ${ g.afterCell }` ).join( '; ' ) ||
				r.changes.map( ( ch ) => `@${ ch.group }: ${ ch.beforeOutcome || 'none' } -> ${ ch.afterOutcome || 'none' }` ).join( '; ' );
			lines.push(
				`| \`${ r.row }\` | ${ r.category } | ${ changesText } | ${ r.beforeShotPath ? `\`${ r.beforeShotPath }\`` : 'none' } | ${ r.afterShotPath ? `\`${ r.afterShotPath }\`` : 'none' } |`
			);
		}
		lines.push( '' );
	}

	lines.push(
		'=== Local files ===',
		'',
		`- HTML report with side-by-side screenshots: \`${ relOut }/index.html\``,
		`- Markdown summary: \`${ relOut }/summary.md\``,
		`- Before screenshots: \`runs/${ diff.beforeName }/shots/\``,
		`- After screenshots: \`runs/${ diff.afterName }/shots/\``,
		''
	);

	return lines.join( '\n' );
}

function invokeExternalViews( diff, outDir ) {
	const tryMod = ( relPath ) => {
		const full = path.join( ROOT, relPath );
		if ( !fs.existsSync( full ) ) {
			return null;
		}
		return require( full );
	};

	const viewsMod = tryMod( 'tests/support/compare-views.js' );
	if ( viewsMod ) {
		const fn = typeof viewsMod === 'function' ? viewsMod : ( viewsMod.writeCompareViews || viewsMod.renderCompareViews );
		if ( typeof fn === 'function' ) {
			fn( diff, outDir );
		}
	}

	const htmlMod = tryMod( 'tests/support/compare-html.js' );
	if ( htmlMod ) {
		const fn = typeof htmlMod === 'function' ? htmlMod : ( htmlMod.writeCompareHtml || htmlMod.renderCompareHtml || htmlMod.generateCompareHtml );
		if ( typeof fn === 'function' ) {
			const res = fn( diff, outDir );
			if ( typeof res === 'string' && !fs.existsSync( path.join( outDir, 'index.html' ) ) ) {
				fs.writeFileSync( path.join( outDir, 'index.html' ), res );
			}
		}
	}

	const phabMod = tryMod( 'tests/support/compare-phab.js' );
	if ( phabMod ) {
		const fn = typeof phabMod === 'function' ? phabMod : ( phabMod.writeComparePhab || phabMod.renderComparePhab || phabMod.generateComparePhab );
		if ( typeof fn === 'function' ) {
			const res = fn( diff, outDir );
			if ( typeof res === 'string' && !fs.existsSync( path.join( outDir, 'phab-draft.txt' ) ) ) {
				fs.writeFileSync( path.join( outDir, 'phab-draft.txt' ), res );
			}
		}
	}
}

function runCompareCli( argv ) {
	const args = argv.slice( 2 ).filter( ( a ) => a !== '--' );
	if ( args.length < 2 ) {
		console.error( 'Usage: npm run compare -- <before> <after>' );
		return 2;
	}
	const [ beforeArg, afterArg ] = args;
	const runsDir = process.env.ULS_RUNS_DIR ? path.resolve( process.env.ULS_RUNS_DIR ) : path.join( ROOT, 'runs' );
	const compareBaseDir = process.env.ULS_COMPARE_DIR ? path.resolve( process.env.ULS_COMPARE_DIR ) : path.join( ROOT, 'compare' );

	const bResolved = resolveRun( beforeArg, runsDir );
	const aResolved = resolveRun( afterArg, runsDir );
	const bData = loadRun( bResolved );
	const aData = loadRun( aResolved );

	const outDir = path.join( compareBaseDir, `${ bResolved.name }-vs-${ aResolved.name }` );
	fs.mkdirSync( outDir, { recursive: true } );

	const diff = compareRuns( bData, aData, {
		beforeName: bResolved.name,
		afterName: aResolved.name,
		beforeDir: bResolved.dir,
		afterDir: aResolved.dir,
		outDir
	} );

	fs.writeFileSync( path.join( outDir, 'summary.md' ), renderSummaryMd( diff ) );

	// Remove stale index.html / phab-draft.txt before invoking external/fallback generators.
	for ( const f of [ 'index.html', 'phab-draft.txt' ] ) {
		const p = path.join( outDir, f );
		if ( fs.existsSync( p ) ) {
			fs.unlinkSync( p );
		}
	}
	invokeExternalViews( diff, outDir );
	if ( !fs.existsSync( path.join( outDir, 'index.html' ) ) ) {
		fs.writeFileSync( path.join( outDir, 'index.html' ), fallbackCompareHtml( diff ) );
	}
	if ( !fs.existsSync( path.join( outDir, 'phab-draft.txt' ) ) ) {
		fs.writeFileSync( path.join( outDir, 'phab-draft.txt' ), fallbackComparePhab( diff ) );
	}

	const relOut = path.relative( ROOT, outDir ).split( path.sep ).join( '/' );
	console.log( renderConsoleSummary( diff, relOut ) );
	return diff.exitCode;
}

if ( require.main === module ) {
	try {
		process.exitCode = runCompareCli( process.argv );
	} catch ( err ) {
		console.error( `Error: ${ err.message }` );
		process.exitCode = 1;
	}
}

module.exports = {
	resolveRun,
	loadRun,
	compareRuns,
	renderSummaryMd,
	renderConsoleSummary,
	fallbackCompareHtml,
	fallbackComparePhab,
	runCompareCli
};
