// Reads the ULS commit, the MediaWiki core commit and the skin list from
// Special:Version. Called from global-setup; the result goes to test-results/run-info.json.
'use strict';

// Uses a browser page: Node's resolver does not map *.localhost to 127.0.0.1, Chrome does.
async function readRunInfo( page, wiki ) {
	const res = await page.goto( `${ wiki }/wiki/Special:Version` );
	if ( !res || !res.ok() ) {
		throw new Error( `Special:Version returned ${ res && res.status() }` );
	}
	const html = await page.content();
	const core = html.match( /mediawiki\/core\.git\/\+\/([0-9a-f]{7,40})/ );
	const coreVersion = html.match( /MediaWiki_[\d.]+">([^<]+)</ );
	const ulsRow = html.match( /id="mw-version-ext-[a-z]+-UniversalLanguageSelector"([\s\S]*?)<\/tr>/ );
	const uls = ulsRow && ulsRow[ 1 ].match( /UniversalLanguageSelector\/\+\/([0-9a-f]{7,40})/ );
	const ulsDate = ulsRow && ulsRow[ 1 ].match( /mw-version-ext-vcs-timestamp[^>]*>([^<]+)</ );
	const skins = [ ...html.matchAll( /id="mw-version-ext-skin-([A-Za-z0-9_]+)"/g ) ].map( ( m ) => m[ 1 ] );
	return {
		wiki,
		date: new Date().toISOString(),
		coreVersion: coreVersion ? coreVersion[ 1 ] : null,
		coreCommit: core ? core[ 1 ] : null,
		ulsCommit: uls ? uls[ 1 ] : null,
		ulsCommitDate: ulsDate ? ulsDate[ 1 ] : null,
		skins
	};
}

module.exports = { readRunInfo };
