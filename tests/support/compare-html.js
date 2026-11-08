// Renders compare/<before>-vs-<after>/index.html from the diff object produced
// by bin/compare.js. Shows run metadata, warnings, category counts, changed
// rows/tests, and side-by-side before/after screenshots when runs/<name>/shots/<row>.png exists.
'use strict';
const fs = require( 'fs' );
const path = require( 'path' );
const { pixelDiffText } = require( './pixel-diff' );

const ROOT = path.join( __dirname, '..', '..' );

function esc( s ) {
	return String( s == null ? '' : s ).replace( /[&<>"]/g, ( ch ) => ( {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;'
	}[ ch ] ) );
}

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

function resolveShotRel( diff, dirPath, runName, rowName, outDir ) {
	const runsBase = process.env.ULS_RUNS_DIR ? path.resolve( ROOT, process.env.ULS_RUNS_DIR ) : path.join( ROOT, 'runs' );
	const baseDir = dirPath || path.join( runsBase, runName );
	const abs = path.join( baseDir, 'shots', `${ rowName }.png` );
	const rel = path.relative( outDir, abs ).split( path.sep ).join( '/' );
	return { exists: fs.existsSync( abs ), rel };
}

function renderRunMeta( label, name, run ) {
	const uls = run.ulsCommit ? `${ shortSha( run.ulsCommit ) }${ run.ulsCommitDate ? ` (${ run.ulsCommitDate })` : '' }` : 'n/a';
	const core = run.coreCommit ? `${ shortSha( run.coreCommit ) }${ run.coreVersion ? ` (${ run.coreVersion })` : '' }` : 'n/a';
	const suite = run.suiteCommit ? `${ shortSha( run.suiteCommit ) }${ run.suiteDirty ? ' (dirty)' : '' }` : 'n/a';
	const cookies = run.cookies ? run.cookies : 'none';
	const f = run.filters || {};
	const filterParts = [
		f.skin ? `ULS_SKIN=${ f.skin }` : null,
		f.device ? `ULS_DEVICE=${ f.device }` : null,
		f.user ? `ULS_USER=${ f.user }` : null,
		f.args && f.args.length ? `args: ${ f.args.join( ' ' ) }` : null
	].filter( Boolean );
	const filters = filterParts.length ? filterParts.join( ', ' ) : 'none (full matrix)';
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
	if ( !items || !items.length ) {
		return '<p class="none">None.</p>';
	}
	const head = columns.map( ( c ) => `<th>${ esc( c.label ) }</th>` ).join( '' );
	const body = items.map( ( item ) => {
		const cells = columns.map( ( c ) => `<td>${ c.render( item ) }</td>` ).join( '' );
		return `<tr>${ cells }</tr>`;
	} ).join( '\n' );
	return `<table><thead><tr>${ head }</tr></thead><tbody>\n${ body }\n</tbody></table>`;
}

function renderCompareHtml( diff, outDirArg ) {
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

	const warnHtml = warnings.length ?
		`<div class="warnings"><strong>Warnings:</strong><ul>${ warnings.map( ( w ) => `<li>${ esc( w ) }</li>` ).join( '' ) }</ul></div>` :
		'';

	const statusBanner = counts.newFailures > 0 ?
		`<div class="banner fail">RESULT: ${ esc( counts.newFailures ) } new failure(s) in ${ esc( counts.newFailureRows ) } row(s) (exit code 1)</div>` :
		`<div class="banner pass">RESULT: 0 new failures (exit code 0)</div>`;

	const shotsSection = changedRows.length ? changedRows.map( ( r ) => {
		const changes = r.changes || [];
		const summaryBadges = changes.map( ( c ) => {
			const label = categoryLabel( c.category );
			const tag = c.ki ? `${ label } (${ c.ki })` : label;
			return `<span class="badge">${ esc( `@${ c.group } ${ tag }: ${ c.beforeOutcome || 'none' } → ${ c.afterOutcome || 'none' }` ) }</span>`;
		} ).join( ' ' );
		const bCheck = resolveShotRel( diff, diff.beforeDir, beforeName, r.row, outDir );
		const aCheck = resolveShotRel( diff, diff.afterDir, afterName, r.row, outDir );
		const bRel = r.beforeShot || ( bCheck.exists ? bCheck.rel : null );
		const aRel = r.afterShot || ( aCheck.exists ? aCheck.rel : null );
		const bImg = bRel ?
			`<a href="${ esc( bRel ) }"><img src="${ esc( bRel ) }" alt="${ esc( `Before ${ r.row }` ) }" loading="lazy"></a>` :
			`<div class="no-shot">no shot (<code>${ esc( bCheck.rel ) }</code>)</div>`;
		const aImg = aRel ?
			`<a href="${ esc( aRel ) }"><img src="${ esc( aRel ) }" alt="${ esc( `After ${ r.row }` ) }" loading="lazy"></a>` :
			`<div class="no-shot">no shot (<code>${ esc( aCheck.rel ) }</code>)</div>`;
		return `<div class="shot-card">
			<h3><code>${ esc( r.row ) }</code>${ r.pixelDiff ? ` <span class="pixel${ r.pixelDiff.overThreshold ? ' over' : '' }">pixel diff ${ esc( pixelDiffText( r.pixelDiff ) ) }</span>` : '' }</h3>
			<div class="badges">${ summaryBadges }</div>
			<div class="shot-pair">
				<div class="shot-col"><h4>Before (<code>${ esc( beforeName ) }</code>)</h4>${ bImg }</div>
				<div class="shot-col"><h4>After (<code>${ esc( afterName ) }</code>)</h4>${ aImg }</div>
			</div>
		</div>`;
	} ).join( '\n' ) : '<p class="none">No rows changed between these runs.</p>';

	const recAll = [
		...recoveredBefore.map( ( x ) => ( { ...x, side: 'before' } ) ),
		...recoveredAfter.map( ( x ) => ( { ...x, side: 'after' } ) )
	];
	const recRowCount = ( diff.rowLists && diff.rowLists.recovered ) ? diff.rowLists.recovered.length : new Set( recAll.map( ( x ) => x.row ) ).size;

	const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>ULS Compare: ${ esc( beforeName ) } vs ${ esc( afterName ) }</title>
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
.pixel { font-size: 13px; font-weight: normal; padding: 2px 6px; border-radius: 4px; background: #eaf3ff; }
.pixel.over { background: #fee7e6; color: #b32424; }
.no-shot { padding: 18px; border: 1px dashed #bbb; color: #666; background: #fff; font-size: 12.5px; }
</style>
</head>
<body>
<h1>ULS Compare: <code>${ esc( beforeName ) }</code> vs <code>${ esc( afterName ) }</code></h1>
${ statusBanner }
${ warnHtml }

<h2>Run metadata</h2>
<table>
<thead><tr><th>Run</th><th>ULS commit</th><th>MediaWiki core</th><th>Suite commit</th><th>QA cookies</th><th>Filters</th><th>Duration</th></tr></thead>
<tbody>
${ renderRunMeta( 'Before', beforeName, beforeRun ) }
${ renderRunMeta( 'After', afterName, afterRun ) }
</tbody>
</table>

<h2>Summary counts</h2>
<table class="counts">
<thead><tr><th>Category</th><th>Tests</th><th>Rows</th></tr></thead>
<tbody>
<tr><td>New failures (pass → FAIL)</td><td><strong>${ esc( counts.newFailures ) }</strong></td><td><strong>${ esc( counts.newFailureRows ) }</strong></td></tr>
<tr><td>Fixed rows (FAIL → pass)</td><td><strong>${ esc( counts.fixed ) }</strong></td><td><strong>${ esc( counts.fixedRows ) }</strong></td></tr>
<tr><td>Known issues now passing</td><td><strong>${ esc( counts.kiNowPassing ) }</strong></td><td><strong>${ esc( counts.kiNowPassingRows ) }</strong></td></tr>
<tr><td>Still failing (FAIL → FAIL)</td><td>${ esc( counts.stillFailing ) }</td><td>${ esc( counts.stillFailingRows ) }</td></tr>
<tr><td>Known issues still failing (xfail → xfail)</td><td>${ esc( counts.stillXfail ) }</td><td>${ esc( counts.stillXfailRows ) }</td></tr>
<tr><td>Tests added</td><td>${ esc( counts.added ) }</td><td>-</td></tr>
<tr><td>Tests removed</td><td>${ esc( counts.removed ) }</td><td>-</td></tr>
<tr><td>n/a changes</td><td>${ esc( counts.naChanges ) }</td><td>-</td></tr>
<tr><td>Passed only after re-login or retry (counted apart)</td><td>before: ${ esc( counts.recoveredBefore ) }, after: ${ esc( counts.recoveredAfter ) }</td><td>${ esc( recRowCount ) }</td></tr>
<tr><td>Not compared (filter mismatch)</td><td>${ esc( counts.notCompared ) }</td><td>${ esc( counts.notComparedRows ) }</td></tr>
<tr><td>Changed matrix rows</td><td>-</td><td><strong>${ esc( counts.changedRows ) }</strong></td></tr>
</tbody>
</table>

<h2>New failures (pass → FAIL) (${ esc( counts.newFailures ) })</h2>
${ renderTestTable( newFailures, [
	{ label: 'Row', render: ( x ) => `<code>${ esc( x.row ) }</code>` },
	{ label: 'Group', render: ( x ) => `<code>@${ esc( x.group ) }</code>` },
	{ label: 'Test', render: ( x ) => esc( x.title ) },
	{ label: 'Transition', render: ( x ) => `<code>${ esc( x.beforeOutcome ) } → ${ esc( x.afterOutcome ) }</code>` },
	{ label: 'First error line', render: ( x ) => `<code>${ esc( x.afterError || x.afterReason || '' ) }</code>` }
] ) }

<h2>Fixed rows (FAIL → pass) (${ esc( counts.fixed ) })</h2>
${ renderTestTable( fixed, [
	{ label: 'Row', render: ( x ) => `<code>${ esc( x.row ) }</code>` },
	{ label: 'Group', render: ( x ) => `<code>@${ esc( x.group ) }</code>` },
	{ label: 'Test', render: ( x ) => esc( x.title ) },
	{ label: 'Previous error', render: ( x ) => `<code>${ esc( x.beforeError || x.beforeReason || '' ) }</code>` }
] ) }

<h2>Known issues that now pass (${ esc( counts.kiNowPassing ) })</h2>
${ renderTestTable( kiNowPassing, [
	{ label: 'Known issue', render: ( x ) => `<strong>${ esc( x.ki ) }</strong>` },
	{ label: 'Row', render: ( x ) => `<code>${ esc( x.row ) }</code>` },
	{ label: 'Group', render: ( x ) => `<code>@${ esc( x.group ) }</code>` },
	{ label: 'Test', render: ( x ) => esc( x.title ) }
] ) }

<h2>Still failing (${ esc( counts.stillFailing + counts.stillXfail ) })</h2>
${ renderTestTable( [ ...stillFailing, ...stillXfail ], [
	{ label: 'Row', render: ( x ) => `<code>${ esc( x.row ) }</code>` },
	{ label: 'Group', render: ( x ) => `<code>@${ esc( x.group ) }</code>` },
	{ label: 'Test', render: ( x ) => esc( x.title ) },
	{ label: 'Status', render: ( x ) => `<code>${ esc( x.afterOutcome ) }</code>${ x.ki ? ` (${ esc( x.ki ) })` : '' }` },
	{ label: 'Reason / error', render: ( x ) => `<code>${ esc( x.afterError || x.afterReason || x.beforeError || x.beforeReason || '' ) }</code>` }
] ) }

<h2>n/a changes (${ esc( counts.naChanges ) })</h2>
${ renderTestTable( naChanges, [
	{ label: 'Row', render: ( x ) => `<code>${ esc( x.row ) }</code>` },
	{ label: 'Group', render: ( x ) => `<code>@${ esc( x.group ) }</code>` },
	{ label: 'Test', render: ( x ) => esc( x.title ) },
	{ label: 'Transition', render: ( x ) => `<code>${ esc( x.beforeOutcome ) } → ${ esc( x.afterOutcome ) }</code>` },
	{ label: 'Reason', render: ( x ) => esc( x.afterReason || x.beforeReason || '' ) }
] ) }

<h2>Tests added (${ esc( counts.added ) }) and removed (${ esc( counts.removed ) })</h2>
${ renderTestTable( [
	...added.map( ( x ) => ( { ...x, kind: 'added' } ) ),
	...removed.map( ( x ) => ( { ...x, kind: 'removed' } ) )
], [
	{ label: 'Change', render: ( x ) => `<code>${ esc( x.kind ) }</code>` },
	{ label: 'Row', render: ( x ) => `<code>${ esc( x.row ) }</code>` },
	{ label: 'Group', render: ( x ) => `<code>@${ esc( x.group ) }</code>` },
	{ label: 'Test', render: ( x ) => esc( x.title ) }
] ) }

<h2>Not compared (filter mismatch) (${ esc( counts.notComparedRows ) } rows, ${ esc( counts.notCompared ) } tests)</h2>
${ renderTestTable( notComparedRows, [
	{ label: 'Row', render: ( x ) => `<code>${ esc( x.row ) }</code>` },
	{ label: 'Present in', render: ( x ) => `<code>${ esc( x.presentIn ) }</code>` }
] ) }

<h2>Passed only after re-login or retry (before: ${ esc( counts.recoveredBefore ) }, after: ${ esc( counts.recoveredAfter ) })</h2>
${ renderTestTable( recAll, [
	{ label: 'Run', render: ( x ) => `<code>${ esc( x.side ) }</code>` },
	{ label: 'Row', render: ( x ) => `<code>${ esc( x.row ) }</code>` },
	{ label: 'Group', render: ( x ) => `<code>@${ esc( x.group ) }</code>` },
	{ label: 'Test', render: ( x ) => esc( x.title ) }
] ) }

<h2>Side-by-side screenshots for changed rows (${ esc( counts.changedRows ) })</h2>
${ shotsSection }
</body>
</html>
`;

	if ( outDir ) {
		fs.mkdirSync( outDir, { recursive: true } );
		fs.writeFileSync( path.join( outDir, 'index.html' ), html );
	}
	return html;
}

renderCompareHtml.writeCompareHtml = renderCompareHtml;
renderCompareHtml.renderCompareHtml = renderCompareHtml;
module.exports = renderCompareHtml;
