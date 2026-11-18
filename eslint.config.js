// ESLint 設定：重點是擋下「建置會過、執行才當」的錯誤（未定義的變數／元件、Hook 用錯地方）。
// 刻意不開風格類規則，避免一次冒出大量與錯誤無關的警告。
import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: '18' } },
    rules: {
      ...js.configs.recommended.rules,
      // 未定義的變數、JSX 元件（這次「copiedText is not defined」就屬於這一類）
      'no-undef': 'error',
      'react/jsx-no-undef': 'error',
      // 讓 JSX 中用到的變數不被誤判為「未使用」
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',
      // Hook 只能在元件頂層呼叫
      'react-hooks/rules-of-hooks': 'error',
      // 中文字串、註解、JSX 文字常刻意使用全形空白（U+3000），只在程式碼本身檢查
      'no-irregular-whitespace': ['error', { skipStrings: true, skipComments: true, skipTemplates: true, skipJSXText: true, skipRegExps: true }],
      // 多餘的跳脫字元不影響執行，只提示
      'no-useless-escape': 'warn',
      // 未使用的變數只提示、不擋（_ 開頭視為刻意保留）
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  {
    files: ['scripts/**/*.mjs', '*.config.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.node } },
    rules: { ...js.configs.recommended.rules, 'no-unused-vars': 'warn' },
  },
];
