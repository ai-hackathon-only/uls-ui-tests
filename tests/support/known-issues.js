// Known ULS bugs (KNOWN-ISSUES.md) as data, so a spec can mark its matrix
// rows as expected failures by id instead of skipping them.
//
//   const { markKnownIssues } = require( './support/known-issues' );
//   test( 'Esc closes the selector @open', async ( { page, uls } ) => {
//       markKnownIssues( test, uls, 'open' );
//       …
//   } );
//
// The test still runs and must fail; if it passes, Playwright reports it as an
// unexpected pass, so a fixed bug shows up. Never use this to hide a flaky test.
'use strict';

const ISSUES = [
	{
		id: 'KI-1',
		title: 'Cologne Blue has no ULS language button',
		skins: [ 'cologneblue' ],
		devices: null, // all
		users: null, // all
		// Feature groups whose tests start from the language button.
		groups: [ 'open', 'search', 'interlanguage', 'suggested', 'settings', 'keyboard', 'rtl', 'small-screen' ]
	},
	{
		id: 'KI-3',
		title: 'Mobile Special:Preferences language field is empty and shows no suggestions (core, not ULS)',
		skins: [ 'minerva' ],
		devices: null,
		users: [ 'user' ],
		groups: [ 'prefs' ]
	}
];

function matches( list, value ) {
	return !list || list.includes( value );
}

// Known issues that apply to this matrix row and feature group.
function knownIssuesFor( uls, group ) {
	return ISSUES.filter( ( k ) => matches( k.skins, uls.skin ) &&
		matches( k.devices, uls.device ) &&
		matches( k.users, uls.user ) &&
		matches( k.groups, group ) );
}

// Call at the start of a test body. Marks the test as an expected failure
// ('KI-<n>: <title>', read by the summary reporter) when a known issue applies.
function markKnownIssues( test, uls, group ) {
	const found = knownIssuesFor( uls, group );
	if ( found.length ) {
		test.fail( true, found.map( ( k ) => `${ k.id }: ${ k.title }` ).join( '; ' ) );
	}
	return found;
}

module.exports = { ISSUES, knownIssuesFor, markKnownIssues };
