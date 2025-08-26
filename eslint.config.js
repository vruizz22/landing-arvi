import eslintPluginAstro from 'eslint-plugin-astro'
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default [
    eslint.configs.recommended,
    ...eslintPluginAstro.configs.recommended,
    ...tseslint.configs.recommended,
    prettier, // Esto debe estar al final para anular cualquier regla que entre en conflicto con Prettier
    {
        ignores: ['dist', 'node_modules'],
    },
    {
        files: ['**/*.astro'],
        parser: 'astro-eslint-parser',
        parserOptions: {
            parser: '@typescript-eslint/parser',
            extraFileExtensions: ['.astro'],
        },
        rules: {
            // reglas específicas para archivos Astro
            'comma-dangle': ['error', 'always-multiline'],
        },
    },
    {
        files: ['**/*.{ts,tsx,js,jsx}'],
        parser: '@typescript-eslint/parser',
        rules: {
            'comma-dangle': ['error', 'always-multiline'],
        },
    },
];
