const { execSync } = require( 'child_process' );
const path = require( 'path' );
const fs = require( 'fs' );

const root = path.resolve( __dirname, '..' );
const pkg = require( path.join( root, 'package.json' ) );
const name = pkg.name || 'mailyard';
const version = pkg.version || '1.0.0';
const outFile = path.join( root, `${ name }-${ version }.zip` );

// Files/dirs to exclude from the zip (plugin-root dev tooling + sources).
// Mailyard has no runtime Composer dependencies, so vendor/ (dev/test only)
// never ships.
const exclude = [
	'node_modules/*',
	'vendor/*',
	'vendor',
	'.git/*',
	'.github/*',
	'.claude/*',
	'.claude',
	'src/*',
	'scripts/*',
	'tests/*',
	'tests',
	'bin/*',
	'package.json',
	'package-lock.json',
	'composer.json',
	'composer.lock',
	'phpcs.xml*',
	'phpunit.xml*',
	'webpack.config.js',
	'tailwind.config.js',
	'postcss.config.js',
	'components.json',
	'docs/*',
	'docs',
	'*.webp',
	'*.md',
	'.gitignore',
	'.editorconfig',
	'.distignore',
	'.eslintrc*',
	'.prettierrc*',
	'**/.DS_Store',
	'.DS_Store',
	'*.zip',
];

const run = ( cmd, opts = {} ) =>
	execSync( cmd, { cwd: root, stdio: 'inherit', ...opts } );

// 1. Build production assets.
console.log( 'Building production assets...' );
run( 'npm run build' );

// 2. Remove any previous zip.
if ( fs.existsSync( outFile ) ) {
	fs.unlinkSync( outFile );
}

// 3. Create the zip with `mailyard/` as the root folder.
const parent = path.dirname( root );
const folder = path.basename( root );
const excludeFlags = exclude
	.map( ( e ) => `-x "${ folder }/${ e }"` )
	.join( ' ' );
console.log( `\nZipping ${ name } v${ version }...` );
run(
	`cd "${ parent }" && zip -rq "${ outFile }" "${ folder }/" ${ excludeFlags }`,
	{ cwd: parent }
);

const size = ( fs.statSync( outFile ).size / 1024 ).toFixed( 0 );
console.log( `\n✓ ${ path.basename( outFile ) } (${ size } KB)` );
