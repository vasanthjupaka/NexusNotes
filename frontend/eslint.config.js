import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Downgrade to warnings — these are common in React/D3/Fabric code
      '@typescript-eslint/no-explicit-any': 'warn',
      // Allow unused vars that start with _ (common convention for intentionally unused)
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      // useEffect dependency warnings — don't fail CI for these
      'react-hooks/exhaustive-deps': 'warn',
      // Escape character warnings — don't fail CI
      'no-useless-escape': 'warn',
    },
  },
)
