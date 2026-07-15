import antfu from '@antfu/eslint-config';

export default antfu(
	{
		typescript: true,
		formatters: {
			css: true,
			html: true,
			markdown: true,
			json: true,
			yaml: true,
		},
		stylistic: {
			indent: 'tab',
			semi: true,
			quotes: 'single',
			arrowParens: 'always',
		},
		rules: {
			'camelcase': ['error', { ignoreImports: true, properties: 'never' }],
			'import/no-default-export': 'off',
			'style/multiline-ternary': 'off',
			'ts/no-explicit-any': 'error',
			'pnpm/yaml-enforce-settings': 'off',
			'node/prefer-global/process': 'off',
			'node/prefer-global/buffer': 'off',
		},
		ignores: [
			'.next',
			'node_modules',
			'dist',
			'build',
			'coverage',
			'public',
			'out',
			'storybook-static',
			'**/components/ui',
			'*.min.*',
		],
	},
	{
		files: ['**/*.md'],
		rules: {
			'style/no-mixed-spaces-and-tabs': 'off',
		},
	},
);
