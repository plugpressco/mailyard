const { execSync } = require( 'child_process' );
const path = require( 'path' );
const fs = require( 'fs' );

const root = path.resolve( __dirname, '..' );
const pkg = require( path.join( root, 'package.json' ) );
const name = pkg.name || 'mailyard';
const version = pkg.version || '1.0.0';
const outFile = path.join( root, `${ name }-${ version }.zip` );

// Files/dirs to exclude from the zip (plugin-root dev tooling + sources).
// vendor/ SHIPS now — it carries the Freemius SDK (runtime dependency). The
// zip step below reinstalls composer with --no-dev first so only runtime
// packages are in the tree when it's archived.
const exclude = [
	'node_modules/*',
	'vendor/bin/*',
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

// 2. Prune composer to runtime-only packages (the Freemius SDK) so the
// archived vendor/ carries no dev/test tooling.
console.log( 'Installing runtime composer packages (--no-dev)...' );
run( 'composer install --no-dev --optimize-autoloader --quiet' );

// 3. Remove any previous zip.
if ( fs.existsSync( outFile ) ) {
	fs.unlinkSync( outFile );
}

// 4. Create the zip with `mailyard/` as the root folder.
const parent = path.dirname( root );
const folder = path.basename( root );
const excludeFlags = exclude
	.map( ( e ) => `-x "${ folder }/${ e }"` )
	.join( ' ' );
console.log( `\nZipping ${ name } v${ version }...` );
try {
	run(
		`cd "${ parent }" && zip -rq "${ outFile }" "${ folder }/" ${ excludeFlags }`,
		{ cwd: parent }
	);
} finally {
	// 5. Restore dev dependencies regardless of zip outcome.
	console.log( 'Restoring dev composer packages...' );
	run( 'composer install --quiet' );
}

// 6. Integrity check — a zip without the composer autoloader or the Freemius
// SDK fatals on activation for every user. Fail the build, never ship it.
const listing = execSync( `unzip -l "${ outFile }"`, { cwd: root } ).toString();
const mustContain = [
	`${ folder }/vendor/autoload.php`,
	`${ folder }/vendor/freemius/wordpress-sdk/start.php`,
	`${ folder }/build/admin.js`,
];
const missing = mustContain.filter( ( f ) => ! listing.includes( f ) );
if ( missing.length ) {
	fs.unlinkSync( outFile );
	console.error( `\n✗ Zip integrity check failed — missing: ${ missing.join( ', ' ) }` );
	process.exit( 1 );
}

const size = ( fs.statSync( outFile ).size / 1024 ).toFixed( 0 );
console.log( `\n✓ ${ path.basename( outFile ) } (${ size } KB) — integrity check passed` );
