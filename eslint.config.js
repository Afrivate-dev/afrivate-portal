import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: [
      'src/context/CollabContext.tsx',
      'src/pages/Notes.tsx',
      'src/components/notes/NotionNotesEditor.tsx',
      'src/pages/DocumentLibrary.tsx',
      'src/pages/Announcements.tsx',
    ],
    rules: {
      // Presence & Realtime intentionally mirror channel state into React via effects.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
