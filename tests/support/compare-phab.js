// Renders compare/<before>-vs-<after>/phab-draft.txt in Phabricator Remarkup.
// Plain language per SKILLS/de-ai/: what was compared, category counts,
// table of changed rows, and screenshot paths. Nothing is uploaded anywhere.
'use strict';
const fs = require( 'fs' );
const path = require( 'path' );
const { normalizeDiff, computeFromRuns } = require( './compare-html' );

function shortSha( sha ) {
	return sha ? String( sha ).slice( 0, 7 ) : 'unknown';
}

function cellClean( text ) {
	return String( text == null ? '' : text )
		.replace( /\|/g, '/' )
		.replace( /\r?\n/g, ' ' )
		.trim();
}

function describeWhatChanged( n ) {
	const b = n.beforeRun || {};
	const a = n.afterRun || {};
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

function renderPhab( input, opts = {}, thirdArg ) {
	const n = normalizeDiff( input, opts, thirdArg );

	const lines = [
		`== ULS UI test comparison: ${ n.beforeName } vs ${ n.afterName } ==`,
		'',
		`Compared \`${ n.beforeName }\` (before) against \`${ n.afterName }\` (after): ${ describeWhatChanged( n ) }.`,
		''
	];

	if ( n.warnings.length ) {
		lines.push( '**Warnings**' );
		for ( const w of n.warnings ) {
			lines.push( `* ${ w }` );
		}
		lines.push( '' );
	}

	const recBefore = n.recovered.filter( ( r ) => r.side !== 'after' ).length;
	const recAfter = n.recovered.filter( ( r ) => r.side === 'after' ).length;

	lines.push(
		'=== Summary counts ===',
		'',
		'| Category | Count |',
		'| --- | --- |',
		`| New failures (pass to FAIL) | ${ n.newFailures.length } |`,
		`| Fixed tests (FAIL to pass) | ${ n.fixed.length } |`,
		`| Known issues now passing (xfail to pass) | ${ n.kiNowPassing.length } |`,
		`| Still failing / known issues | ${ n.stillFailing.length } |`,
		`| n/a or skip changes | ${ n.naChanges.length } |`,
		`| Tests added / removed | +${ n.added.length } / -${ n.removed.length } |`,
		`| Not compared (filter mismatch) | ${ n.notCompared.length } |`,
		`| Passed after re-login or retry (before / after) | ${ recBefore } / ${ recAfter } |`,
		`| Changed matrix rows | ${ n.changedRows.length } |`,
		''
	);

	if ( n.kiNowPassing.length ) {
		lines.push( '=== Known issues that now pass ===', '' );
		for ( const k of n.kiNowPassing ) {
			lines.push( `* ${ k.ki || 'KI' } on \`${ k.row || k.project }\` (\`@${ String( k.group || '' ).replace( /^@/, '' ) }\`: ${ k.title || k.id })` );
		}
		lines.push( '' );
	}

	lines.push( '=== Changed rows ===', '' );
	if ( !n.changedRows.length ) {
		lines.push( 'No rows changed between these two runs.', '' );
	} else {
		lines.push(
			'| Row (skin-device-user) | Changes | Details |',
			'| --- | --- | --- |'
		);
		for ( const r of n.changedRows ) {
			const summary = r.changes.map( ( c ) => {
				const tag = c.ki ? `${ c.category } (${ c.ki })` : c.category;
				return `${ c.group } ${ tag }: ${ c.beforeOutcome } -> ${ c.afterOutcome }`;
			} ).join( '; ' );
			const details = r.changes
				.map( ( c ) => ( c.detail ? `${ c.group }: ${ c.detail }` : c.title ) )
				.filter( Boolean )
				.slice( 0, 3 )
				.join( '; ' );
			lines.push( `| \`${ cellClean( r.row ) }\` | ${ cellClean( summary ) } | ${ cellClean( details || '-' ) } |` );
		}
		lines.push( '' );
	}

	lines.push( '=== Screenshots ===', '' );
	const withShots = n.changedRows.filter( ( r ) => r.beforeShot || r.afterShot );
	if ( withShots.length ) {
		lines.push(
			`Side-by-side HTML view: \`compare/${ n.beforeName }-vs-${ n.afterName }/index.html\``,
			`Before screenshots: \`runs/${ n.beforeName }/shots/<row>.png\``,
			`After screenshots: \`runs/${ n.afterName }/shots/<row>.png\``
		);
		for ( const r of withShots ) {
			lines.push( `* \`${ r.row }\`: before \`runs/${ n.beforeName }/shots/${ r.row }.png\`, after \`runs/${ n.afterName }/shots/${ r.row }.png\`` );
		}
	} else {
		lines.push(
			`No row screenshots were saved in \`runs/${ n.beforeName }/shots/\` or \`runs/${ n.afterName }/shots/\` (run with \`ULS_SHOTS=1\` to capture open-selector screenshots; side-by-side HTML report is at \`compare/${ n.beforeName }-vs-${ n.afterName }/index.html\`).`
		);
	}
	lines.push( '' );

	const text = lines.join( '\n' );
	const writeTarget = typeof opts === 'string' ? opts :
		typeof thirdArg === 'string' ? thirdArg :
		( opts && opts.outDir ) || ( thirdArg && thirdArg.outDir ) || ( input && input.outDir );
	if ( writeTarget ) {
		fs.mkdirSync( writeTarget, { recursive: true } );
		fs.writeFileSync( path.join( writeTarget, 'phab-draft.txt' ), text );
	}
	return text;
}

function writePhab( input, outDir, thirdArg ) {
	if ( typeof outDir === 'object' && outDir && ( outDir.run || Array.isArray( outDir.tests ) ) ) {
		const dir = typeof thirdArg === 'string' ? thirdArg : ( thirdArg && thirdArg.outDir );
		const text = renderPhab( input, outDir, dir ? { outDir: dir } : thirdArg );
		return dir ? path.join( dir, 'phab-draft.txt' ) : text;
	}
	const dir = outDir || ( input && input.outDir );
	const text = renderPhab( input, { outDir: dir } );
	if ( dir ) {
		const file = path.join( dir, 'phab-draft.txt' );
		fs.mkdirSync( dir, { recursive: true } );
		fs.writeFileSync( file, text );
		return file;
	}
	return text;
}

renderPhab.renderPhab = renderPhab;
renderPhab.renderPhabDraft = renderPhab;
renderPhab.renderComparePhab = renderPhab;
renderPhab.generatePhab = renderPhab;
renderPhab.generatePhabDraft = renderPhab;
renderPhab.generateComparePhab = renderPhab;
renderPhab.buildPhab = renderPhab;
renderPhab.buildPhabDraft = renderPhab;
renderPhab.render = renderPhab;
renderPhab.writePhab = writePhab;
renderPhab.writePhabDraft = writePhab;
renderPhab.writeComparePhab = writePhab;
renderPhab.computeFromRuns = computeFromRuns;
renderPhab.default = renderPhab;

module.exports = renderPhab;
