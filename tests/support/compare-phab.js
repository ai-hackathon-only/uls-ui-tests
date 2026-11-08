// Renders compare/<before>-vs-<after>/phab-draft.txt in Phabricator Remarkup
// from the diff object produced by bin/compare.js. Plain language per SKILLS/de-ai/:
// what was compared, category counts, table of changed rows, and screenshot paths.
'use strict';
const fs = require( 'fs' );
const path = require( 'path' );

const ROOT = path.join( __dirname, '..', '..' );

function categoryLabel( cat ) {
	return {
		newFailures: 'new failure',
		fixed: 'fixed',
		kiNowPassing: 'KI now passing',
		naChanges: 'n/a change',
		added: 'added',
		removed: 'removed'
	}[ cat ] || cat;
}

function shortSha( sha ) {
	return sha ? String( sha ).slice( 0, 7 ) : 'unknown';
}

function cellClean( text ) {
	return String( text == null ? '' : text )
		.replace( /\|/g, '/' )
		.replace( /\r?\n/g, ' ' )
		.trim();
}

function describeWhatChanged( beforeRun, afterRun ) {
	const b = beforeRun || {};
	const a = afterRun || {};
	const bUls = shortSha( b.ulsCommit );
	const aUls = shortSha( a.ulsCommit );
	const bCore = shortSha( b.coreCommit );
	const aCore = shortSha( a.coreCommit );
	const bCook = b.cookies || 'none';
	const aCook = a.cookies || 'none';

	const parts = [];
	if ( b.ulsCommit && a.ulsCommit && b.ulsCommit !== a.ulsCommit ) {
		parts.push( `ULS commit \`${ bUls }\` vs \`${ aUls }\`` );
	} else if ( b.ulsCommit || a.ulsCommit ) {
		parts.push( `ULS commit \`${ aUls }\` (unchanged)` );
	}
	if ( bCook !== aCook ) {
		parts.push( `QA cookies \`${ bCook }\` vs \`${ aCook }\`` );
	} else if ( b.cookies || a.cookies ) {
		parts.push( `QA cookies \`${ aCook }\` (unchanged)` );
	}
	if ( b.coreCommit && a.coreCommit && b.coreCommit !== a.coreCommit ) {
		parts.push( `MediaWiki core \`${ bCore }\` vs \`${ aCore }\`` );
	} else if ( b.coreCommit || a.coreCommit ) {
		parts.push( `MediaWiki core \`${ aCore }\`` );
	}
	return parts.join( ', ' );
}

function renderComparePhab( diff, outDirArg ) {
	const beforeName = diff.beforeName || 'before';
	const afterName = diff.afterName || 'after';
	const beforeRun = diff.beforeRun || {};
	const afterRun = diff.afterRun || {};
	const outDir = outDirArg || diff.outDir || path.join( ROOT, 'compare', `${ beforeName }-vs-${ afterName }` );
	const warnings = diff.warnings || [];
	const cat = diff.categories || {};
	const newFailures = cat.newFailures || [];
	const fixed = cat.fixed || [];
	const kiNowPassing = cat.kiNowPassing || [];
	const stillFailing = cat.stillFailing || [];
	const stillXfail = cat.stillXfail || [];
	const added = cat.added || [];
	const removed = cat.removed || [];
	const naChanges = cat.naChanges || [];
	const notCompared = cat.notCompared || [];
	const notComparedRows = diff.notComparedRows || [];
	const recoveredBefore = cat.recoveredBefore || [];
	const recoveredAfter = cat.recoveredAfter || [];
	const changedRows = diff.changedRows || [];
	const counts = diff.counts || {
		newFailures: newFailures.length,
		newFailureRows: new Set( newFailures.map( ( x ) => x.row ) ).size,
		fixed: fixed.length,
		fixedRows: new Set( fixed.map( ( x ) => x.row ) ).size,
		kiNowPassing: kiNowPassing.length,
		kiNowPassingRows: new Set( kiNowPassing.map( ( x ) => x.row ) ).size,
		stillFailing: stillFailing.length,
		stillFailingRows: new Set( stillFailing.map( ( x ) => x.row ) ).size,
		stillXfail: stillXfail.length,
		stillXfailRows: new Set( stillXfail.map( ( x ) => x.row ) ).size,
		added: added.length,
		removed: removed.length,
		naChanges: naChanges.length,
		notCompared: notCompared.length,
		notComparedRows: notComparedRows.length,
		recoveredBefore: recoveredBefore.length,
		recoveredAfter: recoveredAfter.length,
		changedRows: changedRows.length
	};
	const recRowCount = ( diff.rowLists && diff.rowLists.recovered ) ?
		diff.rowLists.recovered.length :
		new Set( [ ...recoveredBefore, ...recoveredAfter ].map( ( x ) => x.row ) ).size;

	const lines = [
		`== ULS UI test comparison: ${ beforeName } vs ${ afterName } ==`,
		'',
		`Compared \`${ beforeName }\` (before) against \`${ afterName }\` (after): ${ describeWhatChanged( beforeRun, afterRun ) }.`,
		''
	];

	if ( warnings.length ) {
		lines.push( '**Warnings**' );
		for ( const w of warnings ) {
			lines.push( `* ${ w }` );
		}
		lines.push( '' );
	}

	lines.push(
		'=== Summary counts ===',
		'',
		'| Category | Tests | Rows |',
		'| --- | --- | --- |',
		`| New failures (pass to FAIL) | ${ counts.newFailures } | ${ counts.newFailureRows } |`,
		`| Fixed rows (FAIL to pass) | ${ counts.fixed } | ${ counts.fixedRows } |`,
		`| Known issues now passing | ${ counts.kiNowPassing } | ${ counts.kiNowPassingRows } |`,
		`| Still failing (FAIL to FAIL) | ${ counts.stillFailing } | ${ counts.stillFailingRows } |`,
		`| Known issues still failing (xfail to xfail) | ${ counts.stillXfail } | ${ counts.stillXfailRows } |`,
		`| Tests added | ${ counts.added } | - |`,
		`| Tests removed | ${ counts.removed } | - |`,
		`| n/a changes | ${ counts.naChanges } | - |`,
		`| Passed only after re-login or retry (counted apart) | before: ${ counts.recoveredBefore }, after: ${ counts.recoveredAfter } | ${ recRowCount } |`,
		`| Not compared (filter mismatch) | ${ counts.notCompared } | ${ counts.notComparedRows } |`,
		`| Changed matrix rows | - | ${ counts.changedRows } |`,
		''
	);

	if ( kiNowPassing.length ) {
		lines.push( '=== Known issues that now pass ===', '' );
		for ( const k of kiNowPassing ) {
			lines.push( `* ${ k.ki || 'KI' } on \`${ k.row }\` (\`@${ k.group }\`: ${ k.title })` );
		}
		lines.push( '' );
	}

	lines.push( '=== Changed rows ===', '' );
	if ( !changedRows.length ) {
		lines.push( 'No rows changed between these two runs.', '' );
	} else {
		lines.push(
			'| Row (skin-device-user) | Changes | Details |',
			'| --- | --- | --- |'
		);
		for ( const r of changedRows ) {
			const changes = r.changes || [];
			const summary = changes.map( ( c ) => {
				const label = categoryLabel( c.category );
				const tag = c.ki ? `${ label } (${ c.ki })` : label;
				return `@${ c.group } ${ tag }: ${ c.beforeOutcome || 'none' } -> ${ c.afterOutcome || 'none' }`;
			} ).join( '; ' );
			const details = changes
				.map( ( c ) => {
					const err = c.afterError || c.afterReason || c.beforeError || c.beforeReason;
					return err ? `@${ c.group }: ${ err }` : c.title;
				} )
				.filter( Boolean )
				.slice( 0, 3 )
				.join( '; ' );
			lines.push( `| \`${ cellClean( r.row ) }\` | ${ cellClean( summary ) } | ${ cellClean( details || '-' ) } |` );
		}
		lines.push( '' );
	}

	lines.push( '=== Screenshots ===', '' );
	const withShots = changedRows.filter( ( r ) => r.beforeShot || r.afterShot );
	if ( withShots.length ) {
		lines.push(
			`Side-by-side HTML view: \`compare/${ beforeName }-vs-${ afterName }/index.html\``,
			`Before screenshots: \`runs/${ beforeName }/shots/<row>.png\``,
			`After screenshots: \`runs/${ afterName }/shots/<row>.png\``
		);
		for ( const r of withShots ) {
			const bPath = r.beforeShotPath || ( r.beforeShot ? `runs/${ beforeName }/shots/${ r.row }.png` : 'no shot' );
			const aPath = r.afterShotPath || ( r.afterShot ? `runs/${ afterName }/shots/${ r.row }.png` : 'no shot' );
			lines.push( `* \`${ r.row }\`: before \`${ bPath }\`, after \`${ aPath }\`` );
		}
	} else {
		lines.push(
			`No row screenshots were saved in \`runs/${ beforeName }/shots/\` or \`runs/${ afterName }/shots/\` (run with \`ULS_SHOTS=1\` to capture open-selector screenshots; side-by-side HTML report is at \`compare/${ beforeName }-vs-${ afterName }/index.html\`).`
		);
	}
	lines.push( '' );

	const text = lines.join( '\n' );
	if ( outDir ) {
		fs.mkdirSync( outDir, { recursive: true } );
		fs.writeFileSync( path.join( outDir, 'phab-draft.txt' ), text );
	}
	return text;
}

renderComparePhab.writeComparePhab = renderComparePhab;
renderComparePhab.renderComparePhab = renderComparePhab;
module.exports = renderComparePhab;
