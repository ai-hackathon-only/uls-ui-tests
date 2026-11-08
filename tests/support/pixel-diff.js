'use strict';
// Pixel difference between two PNG screenshots, for `npm run compare`.
// No dependency: a small PNG decoder (8-bit RGB / RGBA / grey, non-interlaced,
// which is what Playwright writes) on top of Node's zlib.
//
// percent = pixels that differ / pixels in the larger image * 100.
// A pixel differs when any channel differs by more than ULS_PIXEL_TOLERANCE (default 16 of 255).
// Pixels outside the smaller image count as different, so a size change shows up.
// overThreshold = percent > ULS_PIXEL_THRESHOLD (default 3, in percent: two runs on the same code differed by up to 2.09%).

const fs = require( 'fs' );
const zlib = require( 'zlib' );

const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

function decodePng( file ) {
	const buf = fs.readFileSync( file );
	if ( buf.readUInt32BE( 0 ) !== 0x89504e47 ) {
		throw new Error( `not a PNG: ${ file }` );
	}
	let pos = 8;
	let width = 0, height = 0, colorType = 0, depth = 0, interlace = 0;
	const idat = [];
	while ( pos < buf.length ) {
		const len = buf.readUInt32BE( pos );
		const type = buf.toString( 'ascii', pos + 4, pos + 8 );
		const data = buf.subarray( pos + 8, pos + 8 + len );
		if ( type === 'IHDR' ) {
			width = data.readUInt32BE( 0 );
			height = data.readUInt32BE( 4 );
			depth = data[ 8 ];
			colorType = data[ 9 ];
			interlace = data[ 12 ];
		} else if ( type === 'IDAT' ) {
			idat.push( data );
		} else if ( type === 'IEND' ) {
			break;
		}
		pos += 12 + len;
	}
	const ch = CHANNELS[ colorType ];
	if ( depth !== 8 || !ch || interlace ) {
		throw new Error( `unsupported PNG (depth ${ depth }, color type ${ colorType }, interlace ${ interlace }): ${ file }` );
	}
	const raw = zlib.inflateSync( Buffer.concat( idat ) );
	const stride = width * ch;
	const out = Buffer.alloc( stride * height );
	for ( let y = 0; y < height; y++ ) {
		const filter = raw[ y * ( stride + 1 ) ];
		const src = y * ( stride + 1 ) + 1;
		const dst = y * stride;
		for ( let x = 0; x < stride; x++ ) {
			const r = raw[ src + x ];
			const a = x >= ch ? out[ dst + x - ch ] : 0;
			const b = y > 0 ? out[ dst - stride + x ] : 0;
			const c = ( x >= ch && y > 0 ) ? out[ dst - stride + x - ch ] : 0;
			let v;
			switch ( filter ) {
				case 0: v = r; break;
				case 1: v = r + a; break;
				case 2: v = r + b; break;
				case 3: v = r + ( ( a + b ) >> 1 ); break;
				case 4: {
					const p = a + b - c;
					const pa = Math.abs( p - a ), pb = Math.abs( p - b ), pc = Math.abs( p - c );
					v = r + ( ( pa <= pb && pa <= pc ) ? a : ( pb <= pc ? b : c ) );
					break;
				}
				default: throw new Error( `bad PNG filter ${ filter }: ${ file }` );
			}
			out[ dst + x ] = v & 0xff;
		}
	}
	return { width, height, ch, data: out };
}

// RGB of pixel (x, y); grey and grey+alpha are expanded, alpha is ignored.
function rgb( img, x, y ) {
	const i = ( y * img.width + x ) * img.ch;
	return img.ch < 3 ?
		[ img.data[ i ], img.data[ i ], img.data[ i ] ] :
		[ img.data[ i ], img.data[ i + 1 ], img.data[ i + 2 ] ];
}

function pixelDiff( fileA, fileB, opts = {} ) {
	const tolerance = opts.tolerance !== undefined ? opts.tolerance : Number( process.env.ULS_PIXEL_TOLERANCE || 16 );
	const threshold = opts.threshold !== undefined ? opts.threshold : Number( process.env.ULS_PIXEL_THRESHOLD || 3 );
	const a = decodePng( fileA );
	const b = decodePng( fileB );
	const w = Math.min( a.width, b.width );
	const h = Math.min( a.height, b.height );
	const total = Math.max( a.width * a.height, b.width * b.height );
	let diff = total - w * h;
	for ( let y = 0; y < h; y++ ) {
		for ( let x = 0; x < w; x++ ) {
			const pa = rgb( a, x, y );
			const pb = rgb( b, x, y );
			if ( Math.abs( pa[ 0 ] - pb[ 0 ] ) > tolerance ||
				Math.abs( pa[ 1 ] - pb[ 1 ] ) > tolerance ||
				Math.abs( pa[ 2 ] - pb[ 2 ] ) > tolerance ) {
				diff++;
			}
		}
	}
	const percent = total ? Math.round( diff / total * 10000 ) / 100 : 0;
	return {
		percent,
		threshold,
		overThreshold: percent > threshold,
		sizeChanged: a.width !== b.width || a.height !== b.height,
		beforeSize: `${ a.width }x${ a.height }`,
		afterSize: `${ b.width }x${ b.height }`
	};
}

// Short text for tables: "12.34% (over 1%)" or "0.2% (under 1%)".
function pixelDiffText( pd ) {
	if ( !pd ) {
		return 'n/a';
	}
	if ( pd.error ) {
		return `error: ${ pd.error }`;
	}
	const size = pd.sizeChanged ? `, size ${ pd.beforeSize } -> ${ pd.afterSize }` : '';
	return `${ pd.percent }% (${ pd.overThreshold ? 'over' : 'under' } ${ pd.threshold }%${ size })`;
}

module.exports = { decodePng, pixelDiff, pixelDiffText };
