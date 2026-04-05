const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const path = require( 'path' );

// Inject postcss-loader (with Tailwind) into wp-scripts' existing CSS rules.
const rules = defaultConfig.module.rules.map( ( rule ) => {
	if ( rule.test?.toString().includes( 'css' ) ) {
		return {
			...rule,
			use: [
				...( rule.use || [] ),
				{
					loader: require.resolve( 'postcss-loader' ),
					options: {
						postcssOptions: {
							plugins: [
								require( 'tailwindcss' ),
								require( 'autoprefixer' ),
							],
						},
					},
				},
			],
		};
	}
	return rule;
} );

module.exports = {
	...defaultConfig,
	entry: {
		admin: path.resolve( __dirname, 'src/admin.jsx' ),
	},
	resolve: {
		...defaultConfig.resolve,
		alias: {
			...( defaultConfig.resolve?.alias || {} ),
			'@': path.resolve( __dirname, 'src' ),
		},
	},
	module: {
		...defaultConfig.module,
		rules,
	},
};
