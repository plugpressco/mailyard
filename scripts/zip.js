const { execSync } = require( 'child_process' );
const path = require( 'path' );
const fs = require( 'fs' );

const root = path.resolve( __dirname, '..' );
const pkg = require( path.join( root, 'package.json' ) );
const name = pkg.name || 'moolmail';
const version = pkg.version || '1.0.0';
const outFile = path.join( root, `${ name }-${ version }.zip` );

// Files/dirs to exclude from the zip.
const exclude = [
	'node_modules/*',
	'.git/*',
	'src/*',
	'scripts/*',
	'package.json',
	'package-lock.json',
	'webpack.config.js',
	'tailwind.config.js',
	'postcss.config.js',
	'components.json',
	'smtp-plugin-ui.jsx',
	'*.webp',
	'*.md',
	'.gitignore',
	'.editorconfig',
	'.eslintrc*',
	'.prettierrc*',
];

// Build first.
console.log( 'Building...' );
execSync( 'npm run build', { cwd: root, stdio: 'inherit' } );

// Remove old zip.
if ( fs.existsSync( outFile ) ) {
	fs.unlinkSync( outFile );
}

// Create zip from parent directory so the zip contains `moolmail/` as root folder.
const parent = path.dirname( root );
const folder = path.basename( root );
const excludeFlags = exclude.map( ( e ) => `-x "${ folder }/${ e }"` ).join( ' ' );

console.log( `\nZipping ${ name } v${ version }...` );
execSync( `cd "${ parent }" && zip -r "${ outFile }" "${ folder }/" ${ excludeFlags }`, { stdio: 'inherit' } );

const size = ( fs.statSync( outFile ).size / 1024 ).toFixed( 0 );
console.log( `\n✓ ${ path.basename( outFile ) } (${ size } KB)` );
